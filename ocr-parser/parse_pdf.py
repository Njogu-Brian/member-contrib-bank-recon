#!/usr/bin/env python3
"""
PDF Transaction Parser
Extracts transactions from bank statements (M-Pesa Paybill and regular statements)
"""

import json
import sys
import argparse
import re
import os
from datetime import datetime
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("Error: pdfplumber not installed. Install with: pip install pdfplumber", file=sys.stderr)
    sys.exit(1)

try:
    from pdf2image import convert_from_path
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

PARSE_DEBUG = os.environ.get("PARSE_DEBUG") == "1"


def debug_log(message):
    if PARSE_DEBUG:
        print(message, file=sys.stderr)


def extract_text_from_pdf_pdfplumber(pdf_path):
    """Extract text and tables from PDF using pdfplumber"""
    pages_content = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            page_cache = []
            is_paybill = False

            # First pass: cache text and detect paybill format
            for page_index, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                if not is_paybill and "Receipt No" in text and "Paid In" in text and "Completion Time" in text:
                    is_paybill = True
                page_cache.append({'index': page_index, 'page': page, 'text': text})

            # Second pass: extract per-page content
            for cache_entry in page_cache:
                page_index = cache_entry['index']
                page = cache_entry['page']
                text = cache_entry['text']

                page_data = {
                    'page_number': page_index,
                    'text': text if not is_paybill else "",
                    'tables': []
                }

                if is_paybill:
                    tables = page.extract_tables()
                    for table in tables:
                        if table and len(table) > 0:
                            header_row = table[0] if table else []
                            if any(col and ("Receipt No" in str(col) or "Paid In" in str(col)) for col in header_row):
                                page_data['tables'].append({
                                    'page_number': page_index,
                                    'header': header_row,
                                    'rows': table[1:] if len(table) > 1 else []
                                })
                            else:
                                page_data['tables'].append({
                                    'page_number': page_index,
                                    'header': None,
                                    'rows': [row for row in table if row and len(row) >= 4]
                                })
                else:
                    tables = []
                    try:
                        tables = page.extract_tables()
                    except Exception:
                        tables = []

                    if not tables:
                        try:
                            tables = page.extract_tables({
                                'vertical_strategy': 'lines_strict',
                                'horizontal_strategy': 'lines_strict',
                            })
                        except Exception:
                            tables = []

                    for table in tables:
                        if table and len(table) > 0:
                            page_data['tables'].append({
                                'page_number': page_index,
                                'header': table[0] if table else None,
                                'rows': table[1:] if len(table) > 1 else table
                            })

                pages_content.append(page_data)

    except Exception as e:
        print(f"Error extracting with pdfplumber: {e}", file=sys.stderr)
        return None
    
    return {
        'pages': pages_content,
        'is_paybill': is_paybill
    }


def extract_text_from_pdf_ocr(pdf_path):
    """Fallback: Extract text using OCR"""
    if not OCR_AVAILABLE:
        return None
    
    try:
        images = convert_from_path(pdf_path)
        text_content = []
        
        for image in images:
            text = pytesseract.image_to_string(image)
            text_content.append(text)
        
        return '\n'.join(text_content)
    except Exception as e:
        print(f"Error with OCR: {e}", file=sys.stderr)
        return None


def parse_paybill_table(tables_data):
    """Parse M-Pesa Paybill table rows
    Columns: Receipt No, Initiation Time (ignore), Completion Time, Details, Currency (ignore), 
    Transaction Status (ignore), Balance (ignore), Paid In, Withdrawn (ignore), Trade Order Id (ignore)
    """
    transactions = []
    header_row = None
    rows = []
    row_page_numbers = []
    row_table_indices = []

    # Handle both old format (list of rows) and new format (list of dicts with header/rows/page)
    if tables_data and isinstance(tables_data[0], dict):
        for table_index, table_data in enumerate(tables_data):
            header_candidate = table_data.get('header')
            if header_candidate and not header_row:
                header_row = header_candidate

            table_rows = table_data.get('rows', []) or []
            rows.extend(table_rows)

            page_number = table_data.get('page_number')
            row_page_numbers.extend([page_number] * len(table_rows))
            row_table_indices.extend([table_index] * len(table_rows))
    else:
        rows = tables_data or []
        row_page_numbers = [None] * len(rows)
        row_table_indices = [0] * len(rows)
        header_row = None
    
    # Identify column indices from header row
    paid_in_col = None
    completion_time_col = None
    details_col = None
    receipt_no_col = None
    balance_col = None
    withdrawn_col = None
    
    if header_row:
        for i, cell in enumerate(header_row):
            cell_str = str(cell).strip().upper() if cell else ""
            if "PAID IN" in cell_str or "PAIDIN" in cell_str:
                paid_in_col = i
            elif "BALANCE" in cell_str:
                balance_col = i  # Track balance column to exclude it
            elif "WITHDRAWN" in cell_str:
                withdrawn_col = i  # Track withdrawn column to exclude it
            elif "COMPLETION" in cell_str or "COMPLETION TIME" in cell_str:
                completion_time_col = i
            elif "DETAILS" in cell_str:
                details_col = i
            elif "RECEIPT" in cell_str and "NO" in cell_str:
                receipt_no_col = i
    
    # If no header found, try to find it in first few rows
    if not header_row:
        for row in rows[:5]:
            if not row:
                continue
            for i, cell in enumerate(row):
                cell_str = str(cell).strip().upper() if cell else ""
                if "PAID IN" in cell_str or "PAIDIN" in cell_str:
                    header_row = row
                    paid_in_col = i
                    break
                elif "BALANCE" in cell_str:
                    balance_col = i
            if header_row:
                break
    
    # Process data rows - skip header row if found
    start_idx = 1 if header_row and header_row in rows else 0
    for row_offset, row in enumerate(rows[start_idx:], start=0):
        if not row or len(row) < 4:
            continue
        
        try:
            receipt_no = ""
            completion_time = ""
            details = ""
            paid_in = ""
            
            # Use column indices if available - STRICTLY use only Paid In column
            if paid_in_col is not None and paid_in_col < len(row):
                paid_in_str = str(row[paid_in_col]).strip() if row[paid_in_col] else ""
                if paid_in_str and parse_amount(paid_in_str):
                    paid_in = paid_in_str
            else:
                # If we don't have Paid In column index, we CANNOT guess - skip this row
                # This prevents picking up Balance or other columns
                continue
            
            if completion_time_col is not None and completion_time_col < len(row):
                completion_time = str(row[completion_time_col]).strip() if row[completion_time_col] else ""
            
            if details_col is not None and details_col < len(row):
                details = str(row[details_col]).strip() if row[details_col] else ""
            
            if receipt_no_col is not None and receipt_no_col < len(row):
                receipt_no = str(row[receipt_no_col]).strip() if row[receipt_no_col] else ""
            
            # Extract Withdrawn (debit) amount
            withdrawn = ""
            if withdrawn_col is not None and withdrawn_col < len(row):
                withdrawn = str(row[withdrawn_col]).strip() if row[withdrawn_col] else ""
            
            # NO FALLBACK - if we don't have column indices, we skip the row
            # This ensures we only extract from the correct "Paid In" column
            
            # Fallback for other fields if column indices not available (but we already have paid_in)
            if not completion_time:
                for i, cell in enumerate(row):
                    if i == paid_in_col or i == balance_col or i == withdrawn_col:
                        continue
                    cell_str = str(cell).strip() if cell else ""
                    if re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', cell_str):
                        completion_time = cell_str
                        break
            
            if not details:
                for i, cell in enumerate(row):
                    if i == paid_in_col or i == balance_col or i == withdrawn_col:
                        continue
                    cell_str = str(cell).strip() if cell else ""
                    if "Pay Bill" in cell_str or "Paybill" in cell_str or (len(cell_str) > 20 and not re.match(r'^[\d,.\s]+$', cell_str.replace(',', '').replace('.', '').replace(' ', ''))):
                        details = cell_str
                        break
            
            if not receipt_no:
                for i, cell in enumerate(row):
                    if i == paid_in_col or i == balance_col or i == withdrawn_col:
                        continue
                    cell_str = str(cell).strip() if cell else ""
                    if cell_str and len(cell_str) > 5 and not re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', cell_str) and not parse_amount(cell_str):
                        receipt_no = cell_str
                        break
            
            # Skip header rows
            if "Receipt No" in receipt_no or "Completion Time" in completion_time or "Paid In" in paid_in:
                continue
            
            # Skip empty rows or rows without paid in amount
            if not receipt_no and not details:
                continue
            
            # Parse date from completion time
            tran_date = parse_date(completion_time)
            if not tran_date:
                continue
            
            # Parse amounts - process both Paid In (credits) and Withdrawn (debits)
            credit = parse_amount(paid_in) if paid_in else None
            debit = parse_amount(withdrawn) if withdrawn else None
            
            # Skip if both credit and debit are None or zero
            # Note: parse_amount returns None for invalid amounts, or a float (including 0.0) for valid amounts
            has_valid_credit = credit is not None and credit > 0
            has_valid_debit = debit is not None and debit > 0
            
            if not has_valid_credit and not has_valid_debit:
                continue
            
            # Set to 0.0 if None (for database storage)
            credit = credit if credit is not None else 0.0
            debit = debit if debit is not None else 0.0
            
            page_number = row_page_numbers[start_idx + row_offset] if row_page_numbers else None
            table_index = row_table_indices[start_idx + row_offset] if row_table_indices else None

            transactions.append({
                'tran_date': tran_date,
                'value_date': tran_date,
                'particulars': details,
                'credit': credit,
                'debit': debit,
                'balance': None,
                'transaction_code': receipt_no if receipt_no else None,
                'page_number': page_number,
                'row_index': row_offset,
                'table_index': table_index,
                'source': 'paybill_table'
            })
        except Exception as e:
            print(f"Error parsing row: {e}", file=sys.stderr)
            continue
    
    return transactions


def log_bank_skip(reason, row, page_number=None, row_offset=None, table_index=None, extra=None):
    """Emit detailed logging for skipped bank rows when debug mode is enabled."""
    if not PARSE_DEBUG:
        return

    row_preview = ' | '.join([str(cell).strip() for cell in row if cell is not None])
    if len(row_preview) > 250:
        row_preview = row_preview[:247] + "..."

    payload = {
        'reason': reason,
        'page_number': page_number,
        'row_offset': row_offset,
        'table_index': table_index,
        'extra': extra,
        'row_preview': row_preview,
    }
    debug_log(f"[BANK_SKIP] {json.dumps(payload, ensure_ascii=False)}")


def log_text_skip(reason, line=None, page_number=None, line_index=None, extra=None):
    """Emit detailed logging for skipped text rows when debug mode is enabled."""
    if not PARSE_DEBUG:
        return

    snippet = (line or "").strip()
    if len(snippet) > 250:
        snippet = snippet[:247] + "..."

    payload = {
        'reason': reason,
        'page_number': page_number,
        'line_index': line_index,
        'extra': extra,
        'line_preview': snippet,
    }
    debug_log(f"[TEXT_SKIP] {json.dumps(payload, ensure_ascii=False)}")


def parse_bank_table(rows, header_row=None, page_number=None, table_index=None):
    """Parse Bank statement table rows
    Columns: Tran Date, Value Date (ignore), Tran Particulars, Instrument Id (ignore), 
    Debit (ignore), Credit, Balance (ignore)
    """
    transactions = []
    
    # Try to identify column indices from header if available
    date_col = None
    particulars_col = None
    credit_col = None
    instrument_id_col = None  # Track Instrument Id column - might contain part of particulars
    
    # First, look for header row in the first few rows
    header_row_found = None
    balance_col = None
    debit_col = None
    if not header_row:
        for row in rows[:5]:
            if not row:
                continue
            for i, cell in enumerate(row):
                cell_str = str(cell).strip().upper() if cell else ""
                if "CREDIT" in cell_str or "TRAN DATE" in cell_str or "PARTICULARS" in cell_str:
                    header_row_found = row
                    header_row = row
                    break
            if header_row_found:
                break
    
    if header_row:
        for i, cell in enumerate(header_row):
            cell_str = str(cell).strip().upper() if cell else ""
            if "TRAN DATE" in cell_str or ("DATE" in cell_str and "VALUE" not in cell_str):
                date_col = i
            elif "PARTICULARS" in cell_str or "DETAILS" in cell_str or "DESCRIPTION" in cell_str:
                particulars_col = i
            elif "INSTRUMENT" in cell_str and "ID" in cell_str:
                instrument_id_col = i  # Track this - might contain part of particulars
            elif "CREDIT" in cell_str:
                # CRITICAL: Verify this is the Credit column by checking it's not Balance or Debit
                # Only set credit_col if we explicitly see "CREDIT" in the header and it's not part of another word
                if "BALANCE" not in cell_str and "DEBIT" not in cell_str:
                    credit_col = i
            elif "BALANCE" in cell_str:
                balance_col = i  # Track balance column to exclude it
            elif "DEBIT" in cell_str:
                debit_col = i  # Track debit column to exclude it
    
    # Process data rows - skip header row if found
    start_idx = 1 if header_row_found else 0
    for row_offset, row in enumerate(rows[start_idx:], start=0):
        if not row or len(row) < 2:
            log_bank_skip(
                "empty_or_short_row",
                row or [],
                page_number=page_number,
                row_offset=row_offset,
                table_index=table_index,
            )
            continue
        
        try:
            tran_date = ""
            particulars = ""
            credit = None
            credit_candidates = []
            possible_balance_idx = None
            
            # Track columns we should never treat as credit (balance, debit, last column when unknown)
            row_len = len(row)
            last_value_idx = None
            for idx in range(row_len - 1, -1, -1):
                cell = row[idx] if idx < len(row) else None
                cell_str = str(cell).strip() if cell else ""
                if cell_str:
                    last_value_idx = idx
                    break

            excluded_amount_indexes = set()
            if balance_col is not None:
                excluded_amount_indexes.add(balance_col)
            if debit_col is not None:
                excluded_amount_indexes.add(debit_col)
            # If we couldn't positively identify the credit column, assume the last populated column is balance
            if credit_col is None and balance_col is None and last_value_idx is not None:
                possible_balance_idx = last_value_idx
            
            # Skip if this looks like a header row (but be less strict)
            row_str = ' '.join([str(c) for c in row if c]).upper()
            # Only skip if it's clearly a header (contains multiple header keywords)
            header_keywords = ["TRAN DATE", "CREDIT", "PARTICULARS", "VALUE DATE", "DEBIT", "BALANCE"]
            header_count = sum(1 for keyword in header_keywords if keyword in row_str)
            if header_count >= 2:  # Only skip if it has 2+ header keywords
                log_bank_skip(
                    "probable_header_row",
                    row,
                    page_number=page_number,
                    row_offset=row_offset,
                    table_index=table_index,
                    extra={'header_keywords_found': header_count}
                )
                continue
            
            # Skip footer sections and statement summaries
            footer_keywords = [
                "GRAND TOTAL", "TOTAL", "NOTE:", "ANY OMISSION", "ERRORS IN THIS STATEMENT",
                "BRANCH MANAGER", "PROMPTLY ADVISED", "WITHIN 30 DAYS", "PRESUMED TO BE IN ORDER",
                "ACCOUNT NO", "CUSTOMER NAME", "HEAD OFFICE", "P.O. BOX", "TEL:", "FAX:", "MOBILE:",
                "EMAIL:", "EQUITY", "BANK", "STATEMENT", "PAGE",
                # CRITICAL: Statement summary keywords to prevent balance rows being parsed as transactions
                "END OF STATEMENT", "SUMMARY", "OPENING BALANCE", "CLOSING BALANCE",
                "TOTAL DEBITS", "TOTAL CREDITS", "IMPORTANT NOTICE", "OPENING", "CLOSING",
                "BROUGHT FORWARD", "CARRIED FORWARD", "BALANCE B/F", "BALANCE C/F"
            ]
            footer_count = sum(1 for keyword in footer_keywords if keyword in row_str)
            # CRITICAL: Skip if "GRAND TOTAL" appears anywhere in the row (even in particulars)
            if footer_count >= 2 or any(keyword in row_str for keyword in ["GRAND TOTAL", "NOTE:", "ANY OMISSION", "BRANCH MANAGER"]):
                log_bank_skip(
                    "footer_or_summary_row",
                    row,
                    page_number=page_number,
                    row_offset=row_offset,
                    table_index=table_index,
                    extra={'footer_keywords_found': footer_count}
                )
                continue
            
            # Also check particulars column specifically for "Grand Total"
            if particulars_col is not None and particulars_col < len(row):
                particulars_cell = str(row[particulars_col]).strip().upper() if row[particulars_col] else ""
                # CRITICAL: Skip if particulars contains "GRAND TOTAL" anywhere (even if combined with other text)
                if "GRAND TOTAL" in particulars_cell:
                    log_bank_skip(
                        "grand_total_in_particulars_col",
                        row,
                        page_number=page_number,
                        row_offset=row_offset,
                        table_index=table_index
                    )
                    continue
                # Also skip if it's just "TOTAL" (likely a summary row)
                if ("TOTAL" in particulars_cell) and len(particulars_cell) < 50:
                    log_bank_skip(
                        "total_summary_row",
                        row,
                        page_number=page_number,
                        row_offset=row_offset,
                        table_index=table_index
                    )
                    continue
            
            # If we have column indices, use them
            if date_col is not None and date_col < len(row):
                tran_date = str(row[date_col]).strip() if row[date_col] else ""
            
            if particulars_col is not None and particulars_col < len(row):
                # Get the full particulars - handle cases where cell might be None or empty
                cell_value = row[particulars_col] if particulars_col < len(row) else None
                if cell_value is not None:
                    particulars = str(cell_value).strip()
                else:
                    particulars = ""
                
                # CRITICAL: If particulars is incomplete (starts with "---" or is very short), 
                # try to combine with adjacent cells to get the full description
                if not particulars or len(particulars) < 10 or particulars.startswith('---'):
                    # Try combining with cells to the right (particulars might be split across columns)
                    combined_parts = [particulars] if particulars else []
                    
                    # First, check Instrument Id column if it exists (often contains part of particulars)
                    if instrument_id_col is not None and instrument_id_col < len(row):
                        instrument_cell = row[instrument_id_col]
                        if instrument_cell is not None:
                            instrument_str = str(instrument_cell).strip()
                            # If Instrument Id has content and looks like part of particulars (has alphanumeric)
                            if instrument_str and len(instrument_str) > 0 and re.search(r'[A-Za-z0-9]', instrument_str):
                                # Check if it's not just a date or amount
                                is_date = bool(re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', instrument_str))
                                is_amount = parse_amount(instrument_str) is not None
                                if not is_date and not is_amount:
                                    combined_parts.append(instrument_str)
                    
                    # Then check cells to the right of particulars column
                    for offset in range(1, 5):  # Check up to 4 cells to the right
                        next_col_idx = particulars_col + offset
                        # Skip if this is the instrument_id_col (already checked)
                        if next_col_idx == instrument_id_col:
                            continue
                        if next_col_idx < len(row):
                            next_cell = row[next_col_idx]
                            if next_cell is not None:
                                next_cell_str = str(next_cell).strip()
                                # Skip if it's clearly a date, amount, or header
                                if next_cell_str and len(next_cell_str) > 0:
                                    # CRITICAL: Stop merging if we hit summary/footer keywords
                                    summary_keywords = [
                                        "END OF STATEMENT", "SUMMARY", "OPENING", "CLOSING", 
                                        "TOTAL DEBITS", "TOTAL CREDITS", "IMPORTANT NOTICE"
                                    ]
                                    if any(keyword in next_cell_str.upper() for keyword in summary_keywords):
                                        break  # Don't merge summary text into particulars
                                    
                                    # CRITICAL: Stop merging if we hit transaction boundary markers
                                    # These indicate the start of a NEW transaction, not continuation of current one
                                    transaction_markers = [
                                        r'^APP/',      # APP/CUSTOMER NAME pattern
                                        r'^BY:/',      # BY:/reference pattern
                                        r'^MPS\s+\d',  # MPS followed by phone/code
                                        r'^FROM:',     # FROM: sender pattern
                                        r'^TO:',       # TO: recipient pattern
                                        r'^\d{12}',    # 12+ digit codes at start (like 454787546843)
                                    ]
                                    is_new_transaction = any(re.match(pattern, next_cell_str, re.IGNORECASE) for pattern in transaction_markers)
                                    if is_new_transaction:
                                        break  # Don't merge next transaction into current particulars
                                    
                                    is_date = bool(re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', next_cell_str))
                                    is_amount = parse_amount(next_cell_str) is not None
                                    is_header = any(keyword in next_cell_str.upper() for keyword in ["CREDIT", "DEBIT", "BALANCE", "INSTRUMENT"])
                                    
                                    # If it's not a date, amount, or header, it might be part of particulars
                                    if not is_date and not is_amount and not is_header:
                                        # Check if it looks like continuation (has letters/numbers, not just spaces)
                                        if re.search(r'[A-Za-z0-9]', next_cell_str):
                                            combined_parts.append(next_cell_str)
                                    else:
                                        # If we hit a date/amount/header, stop combining
                                        break
                    
                    # Join all parts to get full particulars
                    if combined_parts:
                        particulars = ' '.join([p for p in combined_parts if p]).strip()
                        
                        # CRITICAL: Remove footer text from particulars if it got included
                        footer_patterns = [
                            r'Note:.*?presumed to be in order.*?',
                            r'Note:.*?Branch Manager.*?',
                            r'Any omission or errors.*?presumed to be in order.*?',
                            r'MN\d+',  # Footer reference numbers
                        ]
                        for pattern in footer_patterns:
                            particulars = re.sub(pattern, '', particulars, flags=re.IGNORECASE | re.DOTALL)
                        particulars = re.sub(r'\s+', ' ', particulars).strip()
                elif particulars_col < len(row):
                    # Cell exists but is None/empty - set to empty string
                    particulars = ""
            
            if credit_col is not None and credit_col < len(row):
                credit_str = str(row[credit_col]).strip() if row[credit_col] else ""
                if credit_str:
                    # CRITICAL: Exclude phone numbers - they don't have decimals/commas
                    # Phone numbers are 9-12 digits without decimals
                    cleaned_credit = credit_str.replace(',', '').replace('.', '')
                    if len(cleaned_credit) > 10 and '.' not in credit_str and ',' not in credit_str:
                        # Likely a phone number, skip
                        pass
                    else:
                        # CRITICAL: Double-check this is not the Balance column
                        # If balance_col is identified and it matches credit_col, skip
                        if balance_col is not None and credit_col == balance_col:
                            pass
                        else:
                            parsed_credit = parse_amount(credit_str)
                            if parsed_credit and parsed_credit > 0:
                                credit_candidates.append({
                                    'amount': parsed_credit,
                                    'source': 'credit_header',
                                    'index': credit_col,
                                    'raw': credit_str,
                                })
                            # Large amounts are still captured; users can review/archive later
            
            # Fallback: find columns by content if indices not available
            if not tran_date or not particulars or not credit_candidates:
                for i, cell in enumerate(row):
                    # Skip balance and debit columns explicitly
                    if i in excluded_amount_indexes:
                        continue
                    
                    cell_str = str(cell).strip() if cell else ""
                    
                    # Skip if it contains "Balance" or "Debit" text
                    if "balance" in cell_str.lower() or "debit" in cell_str.lower():
                        continue
                    
                    # Tran Date contains date pattern
                    if not tran_date and re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', cell_str):
                        tran_date = cell_str
                    
                    # Particulars is usually a text field (not just numbers)
                    # Look for text that contains letters and numbers (like "MPS 254721404848...")
                    if not particulars:
                        # Check if it contains letters (not just numbers/dates)
                        has_letters = bool(re.search(r'[A-Za-z]', cell_str))
                        # Check if it's not just a date or amount
                        is_not_date = not re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', cell_str)
                        is_not_amount = not parse_amount(cell_str)
                        
                        # If it has letters and is not a date/amount, it's likely particulars
                        if has_letters and is_not_date and is_not_amount and len(cell_str) > 3:
                            particulars = cell_str
                        # Or if it's a long string (might be account number or transaction code)
                        elif len(cell_str) > 20 and is_not_date and is_not_amount:
                            particulars = cell_str
                    
                    # Credit is a positive numeric amount
                    # Skip if it looks like a date
                    if credit is None and not re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', cell_str):
                        # CRITICAL: Exclude phone numbers - must have decimal or comma for currency
                        cleaned_cell = cell_str.replace(' ', '').replace(',', '').replace('.', '')
                        # Skip if it's too long without decimals/commas (likely phone number)
                        if len(cleaned_cell) > 10 and '.' not in cell_str and ',' not in cell_str:
                            continue
                        # Check if it's a valid amount format (digits with optional commas and .00)
                        if re.match(r'^[\d,]+\.?\d{0,2}$', cell_str.replace(' ', '')):
                            amount = parse_amount(cell_str)
                            if amount and amount > 0:
                                # Note: Large amounts (>50K) will be flagged later, not rejected here
                                # Must have decimal/comma for currency or be small amount
                                if ('.' in cell_str or ',' in cell_str) or (amount < 10000 and len(cleaned_cell) <= 6):
                                    credit_candidates.append({
                                        'amount': amount,
                                        'source': 'fallback_scan',
                                        'index': i,
                                        'raw': cell_str,
                                    })

            # Resolve credit amount from collected candidates
            if credit_candidates:
                # Prefer header-derived credits
                header_candidate = next((c for c in credit_candidates if c['source'] == 'credit_header'), None)
                if header_candidate:
                    credit = header_candidate['amount']
                else:
                    # IMPROVED: Prefer credit closest to particulars column (column alignment)
                    # rather than just smallest amount (which can pick from wrong transaction)
                    if particulars_col is not None:
                        # Sort by distance from particulars column, then by amount
                        credit = min(credit_candidates, key=lambda c: (abs(c['index'] - particulars_col), c['amount']))['amount']
                    else:
                        # Fallback: Prefer realistic contribution-sized amounts first (<= 100,000)
                        realistic = [c for c in credit_candidates if c['amount'] <= 100000]
                        candidates = realistic or credit_candidates
                        credit = min(candidates, key=lambda c: (c['amount'], c['index']))['amount']

            # As a last resort, consider the rightmost value if we couldn't identify credit column
            if credit is None and possible_balance_idx is not None and possible_balance_idx < len(row):
                possible_value = str(row[possible_balance_idx]).strip() if row[possible_balance_idx] else ""
                if possible_value:
                    # CRITICAL: Skip if the row context references balance, summary, or statement end
                    context_upper = row_str.upper()
                    balance_indicators = [
                        "BALANCE", "BAL.", "B/F", "C/F", "CARRIED FORWARD", "BROUGHT FORWARD",
                        "OPENING", "CLOSING", "SUMMARY", "END OF STATEMENT", "TOTAL DEBITS", "TOTAL CREDITS"
                    ]
                    if not any(keyword in context_upper for keyword in balance_indicators):
                        possible_amount = parse_amount(possible_value)
                        if possible_amount and possible_amount > 0:
                            credit = possible_amount
            
            # Skip header rows (but be less strict - only if multiple indicators)
            is_header = False
            if tran_date and ("Tran Date" in str(tran_date) or "Date" in str(tran_date).title()):
                is_header = True
            if particulars and ("Tran Particulars" in str(particulars) or "Particulars" in str(particulars).title()):
                is_header = True
            # Only skip if it's clearly a header row (has date header AND particulars header)
            if is_header and ("Tran Date" in str(tran_date) or "Date" in str(tran_date).title()) and ("Particulars" in str(particulars) or "Tran Particulars" in str(particulars)):
                log_bank_skip(
                    "header_cells_detected",
                    row,
                    page_number=page_number,
                    row_offset=row_offset,
                    table_index=table_index
                )
                continue
            
            # CRITICAL: Final check - skip if particulars contains "Grand Total" even after all other checks
            if particulars_col is not None and particulars_col < len(row):
                particulars_final_check = str(row[particulars_col]).strip().upper() if row[particulars_col] else ""
                if "GRAND TOTAL" in particulars_final_check:
                    log_bank_skip(
                        "grand_total_post_header_check",
                        row,
                        page_number=page_number,
                        row_offset=row_offset,
                        table_index=table_index
                    )
                    continue
            
            # Skip if no date
            if not tran_date:
                log_bank_skip(
                    "missing_tran_date",
                    row,
                    page_number=page_number,
                    row_offset=row_offset,
                    table_index=table_index
                )
                continue
            
            # Parse date
            parsed_date = parse_date(tran_date)
            if not parsed_date:
                log_bank_skip(
                    "unparsable_tran_date",
                    row,
                    page_number=page_number,
                    row_offset=row_offset,
                    table_index=table_index,
                    extra={'tran_date': tran_date}
                )
                continue
            
            # CRITICAL: Additional check - if particulars contains "Grand Total" after parsing, skip
            if particulars and "GRAND TOTAL" in particulars.upper():
                log_bank_skip(
                    "grand_total_in_recovered_particulars",
                    row,
                    page_number=page_number,
                    row_offset=row_offset,
                    table_index=table_index
                )
                continue
            
            # Extract debit amount (similar logic to credit extraction)
            debit = None
            debit_candidates = []
            
            # Look for debit column if identified
            if debit_col is not None and debit_col < len(row):
                debit_cell = str(row[debit_col]).strip() if row[debit_col] else ""
                if debit_cell and debit_cell.lower() not in ['debit', 'withdrawn', '-', 'n/a']:
                    debit_amount = parse_amount(debit_cell)
                    if debit_amount and debit_amount > 0:
                        debit_candidates.append({
                            'amount': debit_amount,
                            'source': 'debit_header',
                            'index': debit_col,
                            'raw': debit_cell,
                        })
            
            # Resolve debit amount from candidates
            if debit_candidates:
                debit = debit_candidates[0]['amount']
            else:
                debit = 0.0
            
            # Process transactions with either credit OR debit (or both)
            # Skip only if BOTH are missing/zero
            if (credit is None or credit <= 0) and (debit is None or debit <= 0):
                log_bank_skip(
                    "missing_credit_and_debit_value",
                    row,
                    page_number=page_number,
                    row_offset=row_offset,
                    table_index=table_index,
                    extra={'credit_candidates': len(credit_candidates), 'debit_candidates': len(debit_candidates)}
                )
                continue
            
            # Ensure valid values (default to 0.0 if None)
            credit = credit if credit and credit > 0 else 0.0
            debit = debit if debit and debit > 0 else 0.0
            
            # CRITICAL: Detect implausibly large amounts that are likely running balances
            # If credit > 500,000 AND row contains balance-related context, skip it
            if credit > 500000:
                row_context = ' '.join([str(c) for c in row if c]).upper()
                balance_context_keywords = [
                    "BALANCE", "CLOSING", "OPENING", "SUMMARY", "TOTAL", "B/F", "C/F"
                ]
                if any(keyword in row_context for keyword in balance_context_keywords):
                    log_bank_skip(
                        "implausibly_large_amount_with_balance_context",
                        row,
                        page_number=page_number,
                        row_offset=row_offset,
                        table_index=table_index,
                        extra={'credit': credit, 'context_keywords': [k for k in balance_context_keywords if k in row_context]}
                    )
                    continue
            
            # If no particulars found or incomplete, use a default or try to extract from row
            # CRITICAL: Capture the FULL description/particulars
            if not particulars or len(particulars) < 3 or particulars.startswith('---'):
                # Try to combine all non-date, non-amount cells
                # This is a more aggressive approach to capture split particulars
                other_cells = []
                for i, cell in enumerate(row):
                    # Skip balance, debit, credit, and date columns explicitly
                    if (balance_col is not None and i == balance_col) or (debit_col is not None and i == debit_col) or (credit_col is not None and i == credit_col) or (date_col is not None and i == date_col):
                        continue
                    # Also skip if this was the particulars column we already checked
                    if particulars_col is not None and i == particulars_col:
                        continue
                    
                    cell_str = str(cell).strip() if cell else ""
                    if cell_str and cell_str != tran_date:
                        # Skip if it contains "Balance", "Debit", "Credit", "Instrument" text
                        if any(keyword in cell_str.lower() for keyword in ["balance", "debit", "credit", "instrument", "value date"]):
                            continue
                        # Skip if it's a date
                        if re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', cell_str):
                            continue
                        # CRITICAL: Skip if it's a transaction boundary marker (new transaction starting)
                        transaction_markers = [
                            r'^APP/',      # APP/CUSTOMER NAME pattern
                            r'^BY:/',      # BY:/reference pattern
                            r'^MPS\s+\d',  # MPS followed by phone/code
                            r'^FROM:',     # FROM: sender pattern
                            r'^TO:',       # TO: recipient pattern
                        ]
                        is_new_transaction = any(re.match(pattern, cell_str, re.IGNORECASE) for pattern in transaction_markers)
                        if is_new_transaction and len(other_cells) > 0:  # Only skip if we already have some particulars
                            break  # Stop combining - we've hit the next transaction
                        
                        # Skip if it's an amount
                        amount = parse_amount(cell_str)
                        if not amount or amount <= 0:
                            # Prioritize cells with letters (likely to be particulars)
                            has_letters = bool(re.search(r'[A-Za-z]', cell_str))
                            has_numbers = bool(re.search(r'\d', cell_str))
                            # Include if it has letters (like "MPS", "EAZZYPAY") or is a long alphanumeric string
                            if has_letters or (has_numbers and len(cell_str) > 10):
                                other_cells.append(cell_str)
                            elif len(cell_str) > 0 and not cell_str.startswith('---'):
                                # Also include shorter cells that might be part of particulars
                                other_cells.append(cell_str)
                
                if other_cells:
                    # Join all cells to get full particulars
                    combined = ' '.join(other_cells).strip()
                    # If we got something meaningful, use it
                    if len(combined) > 3:
                        # If we already had a partial particulars, prepend it
                        if particulars and not particulars.startswith('---'):
                            particulars = (particulars + " " + combined).strip()
                        else:
                            particulars = combined
                    elif not particulars or particulars.startswith('---'):
                        particulars = 'Transaction'
                elif not particulars or particulars.startswith('---'):
                    particulars = 'Transaction'
            
            # Clean up particulars - remove excessive newlines and dates
            if particulars:
                # Remove multiple consecutive newlines
                particulars = re.sub(r'\n+', ' ', particulars)
                # Remove standalone dates (they shouldn't be in particulars)
                particulars = re.sub(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', '', particulars)
                particulars = particulars.strip()
                # Limit length to prevent database issues
                if len(particulars) > 1000:
                    particulars = particulars[:1000]

            # Skip rows that contain no descriptive text (likely balance summaries)
            if not particulars or not re.search(r'[A-Za-z0-9]', particulars):
                log_bank_skip(
                    "no_descriptive_particulars",
                    row,
                    page_number=page_number,
                    row_offset=row_offset,
                    table_index=table_index
                )
                continue
            
            # CRITICAL: Check for footer/summary keywords AFTER cell merging
            # (Footer text might have been merged into particulars after initial check)
            particulars_upper = particulars.upper()
            footer_indicators = [
                "END OF STATEMENT", "SUMMARY", "OPENING BALANCE", "CLOSING BALANCE",
                "TOTAL DEBITS", "TOTAL CREDITS", "IMPORTANT NOTICE", "PLEASE EXAMINE",
                "GRAND TOTAL", "BROUGHT FORWARD", "CARRIED FORWARD", "BALANCE B/F", "BALANCE C/F"
            ]
            footer_found_count = sum(1 for keyword in footer_indicators if keyword in particulars_upper)
            
            # CRITICAL: Also check for dash separator patterns (often precede "End of Statement")
            has_dash_separator = bool(re.search(r'-{3,}', particulars))  # 3+ consecutive dashes
            
            # Skip if we find 2+ footer keywords OR specific critical keywords OR dash separator + footer keyword
            if footer_found_count >= 2 or \
               (has_dash_separator and footer_found_count >= 1) or \
               any(keyword in particulars_upper for keyword in 
                   ["END OF STATEMENT", "IMPORTANT NOTICE", "PLEASE EXAMINE YOUR STATEMENT"]):
                log_bank_skip(
                    "footer_text_in_final_particulars",
                    row,
                    page_number=page_number,
                    row_offset=row_offset,
                    table_index=table_index,
                    extra={'particulars_snippet': particulars[:200], 'footer_keywords_found': footer_found_count, 
                           'has_dash_separator': has_dash_separator}
                )
                continue
            
            # Extract transaction code from particulars
            transaction_code = extract_transaction_code(particulars)
            
            transaction_data = {
                'tran_date': parsed_date,
                'value_date': parsed_date,
                'particulars': particulars,
                'credit': credit,
                'debit': debit,
                'balance': None,
                'transaction_code': transaction_code
            }
            
            transaction_data['page_number'] = page_number
            transaction_data['row_index'] = row_offset
            if table_index is not None:
                transaction_data['table_index'] = table_index
            transaction_data['source'] = 'bank_table'
            transactions.append(transaction_data)
        except Exception as e:
            print(f"Error parsing bank row: {e}", file=sys.stderr)
            continue
    
    return transactions

def detect_table_rows(text, page_number=None, initial_balance=None):
    """Detect transaction rows from text (fallback method) - improved for bank statements"""
    transactions = []
    lines = text.split('\n')
    prev_balance = initial_balance

    def looks_like_currency(amount_str: str) -> bool:
        if not amount_str:
            return False
        amount_str = amount_str.strip()

        has_decimal = amount_str.count('.') == 1
        has_comma = ',' in amount_str
        if not has_decimal and not has_comma:
            return False

        if has_decimal:
            integer_part, decimal_part = amount_str.split('.', 1)
            if not decimal_part.isdigit() or len(decimal_part) != 2:
                return False
        else:
            integer_part = amount_str

        integer_digits = integer_part.replace(',', '').replace(' ', '')
        if not integer_digits.isdigit():
            return False

        if len(integer_digits) == 0:
            return False

        return True
    
    # Pattern for transaction rows: date, particulars, amount
    date_pattern = r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}'
    amount_pattern = r'[\d,]+\.?\d{0,2}'
    
    # Footer keywords to skip (including statement summaries)
    footer_keywords = [
        "GRAND TOTAL", "TOTAL", "NOTE:", "ANY OMISSION", "ERRORS IN THIS STATEMENT",
        "BRANCH MANAGER", "PROMPTLY ADVISED", "WITHIN 30 DAYS", "PRESUMED TO BE IN ORDER",
        "ACCOUNT NO", "CUSTOMER NAME", "HEAD OFFICE", "P.O. BOX", "TEL:", "FAX:", "MOBILE:",
        "EMAIL:", "EQUITY", "BANK", "STATEMENT", "PAGE",
        # CRITICAL: Statement summary keywords
        "END OF STATEMENT", "SUMMARY", "OPENING BALANCE", "CLOSING BALANCE",
        "TOTAL DEBITS", "TOTAL CREDITS", "IMPORTANT NOTICE", "OPENING", "CLOSING",
        "BROUGHT FORWARD", "CARRIED FORWARD", "BALANCE B/F", "BALANCE C/F"
    ]
    
    # Header keywords to skip
    header_keywords = [
        "TRAN DATE", "VALUE DATE", "PARTICULARS", "CREDIT", "DEBIT", "BALANCE", "INSTRUMENT",
        "ACCOUNT NO", "CUSTOMER NAME", "HEAD OFFICE", "P.O. BOX", "TEL:", "FAX:", "MOBILE:",
        "EMAIL:", "EQUITY", "BANK", "STATEMENT"
    ]
    
    i = 0
    while i < len(lines):
        line_index = i
        line = lines[i].strip()
        if not line or len(line) < 10:
            log_text_skip(
                "blank_or_short_line",
                line=line,
                page_number=page_number,
                line_index=line_index,
            )
            i += 1
            continue
        
        line_upper = line.upper()
        
        # Handle lines that contain "Grand Total"
        if "GRAND TOTAL" in line_upper:
            grand_total_idx = line_upper.find("GRAND TOTAL")
            prefix = line[:grand_total_idx].strip()
            if prefix and re.search(date_pattern, prefix):
                # Trim the Grand Total portion and proceed with the prefix (actual transaction)
                line = prefix
                line_upper = line.upper()
            else:
                log_text_skip(
                    "grand_total_line",
                    line=line,
                    page_number=page_number,
                    line_index=line_index,
                )
                i += 1
                continue
        
        # Skip footer sections (check for multiple footer keywords)
        footer_count = sum(1 for keyword in footer_keywords if keyword in line_upper)
        # CRITICAL: Also check for statement summary keywords
        summary_indicators = ["END OF STATEMENT", "SUMMARY", "OPENING BALANCE", "CLOSING BALANCE", 
                              "TOTAL DEBITS", "TOTAL CREDITS", "IMPORTANT NOTICE"]
        has_summary = any(keyword in line_upper for keyword in summary_indicators)
        
        if footer_count >= 2 or has_summary or any(keyword in line_upper for keyword in ["NOTE:", "ANY OMISSION", "BRANCH MANAGER"]):
            log_text_skip(
                "footer_or_summary_line",
                line=line,
                page_number=page_number,
                line_index=line_index,
                extra={'footer_keywords_found': footer_count, 'has_summary': has_summary}
            )
            i += 1
            continue
        
        # Skip header rows
        header_count = sum(1 for keyword in header_keywords if keyword in line_upper)
        if header_count >= 2:
            log_text_skip(
                "header_line",
                line=line,
                page_number=page_number,
                line_index=line_index,
                extra={'header_keywords_found': header_count}
            )
            i += 1
            continue
        
        # Check if line contains a date
        date_match = re.search(date_pattern, line)
        if not date_match:
            log_text_skip(
                "no_date_found",
                line=line,
                page_number=page_number,
                line_index=line_index,
            )
            i += 1
            continue
        
        # Extract date
        date_str = date_match.group()
        tran_date = parse_date(date_str)
        if not tran_date:
            log_text_skip(
                "unparsable_date",
                line=line,
                page_number=page_number,
                line_index=line_index,
                extra={'date_str': date_str}
            )
            i += 1
            continue
        
        # Try to get the full transaction by combining with next lines if needed
        # Bank statements often have particulars split across multiple lines
        full_line = line
        next_i = i + 1
        # Look ahead up to 5 lines to capture complete particulars
        while next_i < len(lines) and next_i <= i + 5:
            next_line = lines[next_i].strip()
            if not next_line:
                next_i += 1
                continue
            
            next_line_upper = next_line.upper()

            # Determine if this is a continuation line (e.g., BY:/... reference)
            continuation_prefixes = ("BY:/", "BY :/", "BY:", "BY /", "BY-")
            is_reference_line = next_line_upper.startswith(continuation_prefixes)

            # If next line has a date and isn't a known continuation, we've moved on
            if re.search(date_pattern, next_line) and not is_reference_line:
                break
            
            # Check if next line contains footer text - if so, stop combining
            footer_keywords_in_line = [
                "NOTE:", "ANY OMISSION", "ERRORS IN THIS STATEMENT", "BRANCH MANAGER",
                "PROMPTLY ADVISED", "WITHIN 30 DAYS", "PRESUMED TO BE IN ORDER", "GRAND TOTAL"
            ]
            if any(keyword in next_line_upper for keyword in footer_keywords_in_line):
                # Footer detected - stop combining
                break
            
            # Always combine with next line if it doesn't have a date or is a known continuation
            # This ensures we capture the full particulars even if split
            if not re.search(date_pattern, next_line) or is_reference_line:
                full_line += " " + next_line
                next_i += 1
                # Stop if we've found what looks like a complete transaction (has amount)
                # But continue if we're still building particulars
                if re.search(amount_pattern, full_line):
                    # Check if we have a reasonable amount - if yes, might be complete
                    amounts_found = re.findall(amount_pattern, full_line)
                    has_reasonable_amount = False
                    for amt in amounts_found:
                        try:
                            val = float(amt.replace(',', ''))
                            # Check if it's a reasonable credit (not a phone number)
                            # Phone numbers are 9-12 digits without decimals
                            if 0.01 <= val <= 1000000000 and ('.' in amt or ',' in amt):
                                has_reasonable_amount = True
                                break
                        except:
                            pass
                    if has_reasonable_amount:
                        # Might be complete, but continue one more line to be sure
                        continue
            else:
                break
        
        full_line_upper = full_line.upper()
        if "GRAND TOTAL" in full_line_upper:
            grand_total_idx = full_line_upper.find("GRAND TOTAL")
            prefix = full_line[:grand_total_idx].strip()
            if prefix and re.search(date_pattern, prefix):
                full_line = prefix
            else:
                log_text_skip(
                    "grand_total_line_full",
                    line=full_line,
                    page_number=page_number,
                    line_index=line_index,
                )
                i = next_i if next_i > i else i + 1
                continue

        # Extract amounts - only process credits (positive amounts)
        # CRITICAL: Look for amounts that are clearly in the Credit column position
        # Bank statements typically have: Date | Particulars | Credit | Balance
        # The credit amount is usually the last numeric value with .00 or comma formatting
        
        # First, try to find amounts that look like currency (have .00 or commas)
        amount_matches = list(re.finditer(amount_pattern, full_line))
        if not amount_matches:
            log_text_skip(
                "no_amounts_detected",
                line=full_line,
                page_number=page_number,
                line_index=line_index
            )
            i += 1
            continue

        amounts = [match.group() for match in amount_matches]
        currency_amounts = [amt for amt in amounts if looks_like_currency(amt)]
        if not currency_amounts:
            log_text_skip(
                "no_currency_amounts",
                line=full_line,
                page_number=page_number,
                line_index=line_index
            )
            i += 1
            continue

        balance_value = parse_amount(currency_amounts[-1])
        amount_candidate_value = parse_amount(currency_amounts[-2]) if len(currency_amounts) >= 2 else None
        
        # Only process credit transactions, ignore debits
        credit = 0.0
        
        # Find the credit amount - look for amounts that look like currency (have .00 or commas)
        # CRITICAL: Exclude phone numbers, transaction codes, and other non-amount numbers
        # Strategy: Look for amounts that:
        # 1. Have decimal point with 2 decimal places (.00)
        # 2. OR have comma thousands separator
        # 3. Are in a reasonable range (0.01 to 1 billion)
        # 4. Are NOT part of transaction codes (like TD45E3DTYR)
        # 5. Are NOT phone numbers (9-12 digits without decimals/commas)
        
        for match in reversed(amount_matches):
            amount_str = match.group()
            try:
                # Skip if it doesn't look like a currency amount
                cleaned_amount = amount_str.replace(',', '').replace('.', '')
                
                # Skip phone numbers (9-12 digits without decimals/commas)
                if len(cleaned_amount) >= 9 and len(cleaned_amount) <= 12 and '.' not in amount_str and ',' not in amount_str:
                    continue
                
                amount_pos = match.start()
                right_index = match.end()

                # Only skip if alphanumeric characters are touching the amount with no whitespace
                left_touching = amount_pos > 0 and not full_line[amount_pos - 1].isspace()
                right_touching = right_index < len(full_line) and not full_line[right_index].isspace()

                if left_touching:
                    left_char = full_line[amount_pos - 1]
                    if left_char.isalpha():
                        continue
                if right_touching:
                    right_char = full_line[right_index]
                    if right_char.isalpha():
                        continue
                
                amount_val = float(amount_str.replace(',', ''))
                
                # Check if it's a reasonable credit amount
                if 0.01 <= amount_val <= 1000000000:
                    # Must have decimal point with 2 places OR comma thousands separator
                    # This ensures we're getting currency amounts, not transaction codes
                    has_decimal = '.' in amount_str and amount_str.count('.') == 1
                    has_comma = ',' in amount_str
                    
                    if has_decimal:
                        # Check if it has exactly 2 decimal places (currency format)
                        decimal_parts = amount_str.split('.')
                        if len(decimal_parts) == 2 and len(decimal_parts[1]) == 2:
                            # CRITICAL: Check context - must NOT be Balance or Debit
                            context_upper = full_line[max(0, amount_pos-30):amount_pos+30].upper()
                            # Skip if it's clearly in Balance or Debit context
                            if (
                                'BALANCE' in context_upper
                                or 'DEBIT' in context_upper
                                or re.search(r'\bDR\b', context_upper)
                            ):
                                continue
                            # Prefer amounts that appear after particulars (Credit column position)
                            # In bank statements: Date | Particulars | Credit | Balance
                            # Credit is usually the second-to-last amount, Balance is the last
                            # Check if there's another amount after this one (likely Balance)
                            remaining_text = full_line[right_index:]
                            remaining_amounts = [
                                amt for amt in re.findall(amount_pattern, remaining_text)
                                if looks_like_currency(amt)
                            ]
                            # If there's another amount after this, and it's larger, this might be Credit
                            # But if this is the last amount, it might be Balance
                            if remaining_amounts:
                                # There's another amount after - this could be Credit
                                # Note: Large amounts (>50K) will be flagged later, not rejected here
                                credit = amount_val
                                break
                            else:
                                # This is the last amount - might be Balance, skip it
                                continue
                    elif has_comma:
                        # Has comma thousands separator - likely currency
                        context_upper = full_line[max(0, amount_pos-30):amount_pos+30].upper()
                        # Skip if it's clearly in Balance or Debit context
                        if (
                            'BALANCE' in context_upper
                            or 'DEBIT' in context_upper
                            or re.search(r'\bDR\b', context_upper)
                        ):
                            continue
                        # Check if there's another amount after this
                        remaining_text = full_line[right_index:]
                        remaining_amounts = [
                            amt for amt in re.findall(amount_pattern, remaining_text)
                            if looks_like_currency(amt)
                        ]
                        if remaining_amounts:
                            # There's another amount after - this could be Credit
                            # Note: Large amounts (>50K) will be flagged later, not rejected here
                            if amount_val < 10000:
                                credit = amount_val
                                break
                            # For larger numbers, prefer those with decimals
                            elif '.' in full_line[max(0, amount_pos-5):amount_pos+5]:
                                credit = amount_val
                                break
                        else:
                            # This is the last amount - might be Balance, skip it
                            continue
            except:
                continue
        
        # Skip if no credit amount
        if credit <= 0:
            log_text_skip(
                "missing_credit_value",
                line=full_line,
                page_number=page_number,
                line_index=line_index,
                extra={'amounts_found': amounts}
            )
            i += 1
            continue

        amount_candidate_value = credit if credit > 0 else amount_candidate_value

        if (
            balance_value is not None
            and prev_balance is not None
            and amount_candidate_value is not None
        ):
            balance_delta = round(balance_value - prev_balance, 2)
            if abs(abs(balance_delta) - amount_candidate_value) <= 0.05:
                if balance_delta < 0:
                    log_text_skip(
                        "debit_row_detected",
                        line=full_line,
                        page_number=page_number,
                        line_index=line_index,
                        extra={
                            'balance_delta': balance_delta,
                            'amount': amount_candidate_value,
                        }
                    )
                    prev_balance = balance_value
                    i = next_i if next_i > i else i + 1
                    continue
        
        # Extract particulars (everything except date and amounts)
        particulars = full_line
        # Remove dates
        particulars = re.sub(date_pattern, '', particulars)
        # Remove ALL amounts (but be careful not to remove numbers that are part of particulars like phone numbers)
        # Remove amounts in reverse order to maintain string positions
        for amount in reversed(amounts):
            try:
                amount_val = float(amount.replace(',', ''))
                # Only remove if it's likely an amount (reasonable value between 0.01 and 1 billion)
                # AND it's not part of a phone number (phone numbers are 9-12 digits, amounts have decimals or commas)
                if 0.01 <= amount_val <= 1000000000:
                    # Check if this looks like an amount (has decimal point or comma separator)
                    # Phone numbers don't have decimals or commas in the middle
                    if '.' in amount or ',' in amount or (len(amount.replace(',', '').replace('.', '')) >= 4 and amount_val >= 100):
                        # Remove this amount from particulars
                        # Use word boundaries to avoid partial matches
                        # Replace with space to maintain word separation
                        particulars = re.sub(r'\b' + re.escape(amount) + r'\b', '', particulars)
            except:
                pass
        
        # CRITICAL: Remove footer text from particulars
        # Footer patterns to remove
        footer_patterns = [
            r'Note:.*?presumed to be in order.*?',
            r'Note:.*?Branch Manager.*?',
            r'Any omission or errors.*?presumed to be in order.*?',
            r'MN\d+',  # Footer reference numbers like MN2154520251027123259
        ]
        for pattern in footer_patterns:
            particulars = re.sub(pattern, '', particulars, flags=re.IGNORECASE | re.DOTALL)
        
        # Clean up particulars
        particulars = re.sub(r'\s+', ' ', particulars).strip()
        # Remove common header words that might have leaked in
        particulars = re.sub(r'\b(TRAN DATE|VALUE DATE|PARTICULARS|CREDIT|DEBIT|BALANCE|INSTRUMENT)\b', '', particulars, flags=re.IGNORECASE)
        # Remove any remaining standalone amounts (numbers with commas/decimals that might have been missed)
        # Pattern: numbers with commas or decimals that are standalone (not part of phone/transaction codes)
        particulars = re.sub(r'\b[\d,]+\.\d{2}\b', '', particulars)  # Remove amounts like "2,000.00" or "490,441.00"
        particulars = re.sub(r'\b[\d,]{4,}\.\d{0,2}\b', '', particulars)  # Remove large numbers with decimals (like "490441.00")
        particulars = re.sub(r'\s+', ' ', particulars).strip()
        
        # CRITICAL: Final check - skip if particulars contains "Grand Total"
        if "GRAND TOTAL" in particulars.upper():
            log_text_skip(
                "grand_total_in_particulars_text",
                line=full_line,
                page_number=page_number,
                line_index=line_index
            )
            prev_balance = balance_value if balance_value is not None else prev_balance
            i += 1
            continue
        
        # CRITICAL: Comprehensive footer/summary check (same as table parser)
        particulars_upper = particulars.upper()
        footer_indicators = [
            "END OF STATEMENT", "SUMMARY", "OPENING BALANCE", "CLOSING BALANCE",
            "TOTAL DEBITS", "TOTAL CREDITS", "IMPORTANT NOTICE", "PLEASE EXAMINE",
            "GRAND TOTAL", "BROUGHT FORWARD", "CARRIED FORWARD", "BALANCE B/F", "BALANCE C/F"
        ]
        footer_found_count = sum(1 for keyword in footer_indicators if keyword in particulars_upper)
        has_dash_separator = bool(re.search(r'-{3,}', particulars))  # 3+ consecutive dashes
        
        # Skip if we find 2+ footer keywords OR dash + footer keyword OR specific critical keywords
        if footer_found_count >= 2 or \
           (has_dash_separator and footer_found_count >= 1) or \
           any(keyword in particulars_upper for keyword in 
               ["END OF STATEMENT", "IMPORTANT NOTICE", "PLEASE EXAMINE YOUR STATEMENT"]):
            log_text_skip(
                "footer_text_in_final_particulars_text",
                line=full_line,
                page_number=page_number,
                line_index=line_index,
                extra={'particulars_snippet': particulars[:200], 'footer_keywords_found': footer_found_count,
                       'has_dash_separator': has_dash_separator}
            )
            prev_balance = balance_value if balance_value is not None else prev_balance
            i += 1
            continue
        
        # CRITICAL: Detect implausibly large amounts with balance context (text parser)
        if credit > 500000:
            balance_context_keywords = ["BALANCE", "CLOSING", "OPENING", "SUMMARY", "TOTAL", "B/F", "C/F"]
            if any(keyword in particulars_upper for keyword in balance_context_keywords):
                log_text_skip(
                    "implausibly_large_amount_text",
                    line=full_line,
                    page_number=page_number,
                    line_index=line_index,
                    extra={'credit': credit, 'particulars_snippet': particulars[:100]}
                )
                prev_balance = balance_value if balance_value is not None else prev_balance
                i += 1
                continue
        
        # Skip if particulars is too short or looks like a header
        if len(particulars) < 3 or particulars.upper() in ["TRAN DATE", "VALUE DATE", "PARTICULARS"]:
            log_text_skip(
                "particulars_too_short",
                line=full_line,
                page_number=page_number,
                line_index=line_index,
                extra={'particulars': particulars}
            )
            prev_balance = balance_value if balance_value is not None else prev_balance
            i += 1
            continue
        
        if particulars:
            # Extract transaction code from particulars
            transaction_code = extract_transaction_code(particulars)
            
            transactions.append({
                'tran_date': tran_date,
                'value_date': tran_date,
                'particulars': particulars,
                'credit': credit,
                'debit': 0.0,
                'balance': balance_value,
                'transaction_code': transaction_code,
                'page_number': page_number,
                'row_index': line_index,
                'source': 'text'
            })
        
        prev_balance = balance_value if balance_value is not None else prev_balance
        i = next_i if next_i > i else i + 1
    
    return transactions, prev_balance


def parse_date(date_str):
    """Parse date string to ISO format"""
    if not date_str:
        return None
    
    date_str = date_str.strip()
    
    # Common date formats
    formats = [
        '%d/%m/%Y',
        '%d-%m-%Y',
        '%Y-%m-%d',
        '%d/%m/%y',
        '%d-%m-%y',
        '%Y/%m/%d',
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime('%Y-%m-%d')
        except:
            continue
    
    # Try parsing with regex
    match = re.match(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})', date_str)
    if match:
        day, month, year = match.groups()
        if len(year) == 2:
            year = '20' + year
        try:
            dt = datetime(int(year), int(month), int(day))
            return dt.strftime('%Y-%m-%d')
        except:
            pass
    
    return None


def parse_amount(amount_str):
    """Parse amount string to float, preserving decimal places (.00 for cents)"""
    if not amount_str:
        return None
    
    amount_str = str(amount_str).strip()
    
    # Reject if it looks like a date (contains date patterns)
    if re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', amount_str):
        return None
    
    # Reject if it's too long (likely not an amount)
    if len(amount_str) > 25:
        return None
    
    # Remove currency symbols and thousand separators (commas), but keep decimal point
    # Handle formats like: "12,001.00", "12001.00", "12,001", "12001"
    cleaned = amount_str.replace(',', '').replace(' ', '')
    
    # Remove any currency symbols but keep digits and decimal point
    cleaned = re.sub(r'[^\d.]', '', cleaned)
    
    # Must have at least one digit
    if not cleaned or not re.search(r'\d', cleaned):
        return None
    
    # Validate format - should be digits with optional decimal point and 0-2 decimal places
    if not re.match(r'^\d+\.?\d{0,2}$', cleaned):
        return None
    
    try:
        value = float(cleaned)
        
        # Reject if value is too large (max for decimal(15,2) is 999999999999999.99)
        # But we'll be more conservative - reject anything over 1 billion
        if value > 1000000000:
            return None
        
        # Reject negative values (we only want credits)
        if value < 0:
            return None
        
        # Reject zero
        if value == 0:
            return None
        
        # Round to 2 decimal places to preserve .00 format
        return round(value, 2)
    except:
        return None


def extract_transaction_code(particulars):
    """
    Extract transaction code from particulars field.
    Looks for common patterns like:
    - TL4SU4EMEF, TL54U4EMEF (M-Pesa transaction codes)
    - S54508048, S45903272 (Statement reference codes)
    - Reference numbers at the start or embedded in text
    """
    if not particulars:
        return None
    
    particulars_str = str(particulars).strip()
    
    # Pattern 1: M-Pesa transaction codes (TL followed by alphanumeric, 8-12 chars)
    mpesa_match = re.search(r'\b(TL[A-Z0-9]{6,10})\b', particulars_str, re.IGNORECASE)
    if mpesa_match:
        return mpesa_match.group(1).upper()
    
    # Pattern 2: Statement reference codes (S followed by 8-11 digits)
    ref_match = re.search(r'\b(S\d{8,11})\b', particulars_str, re.IGNORECASE)
    if ref_match:
        return ref_match.group(1).upper()
    
    # Pattern 3: Numeric transaction codes (8-15 digits, not phone numbers)
    # Avoid matching phone numbers (254XXXXXXXXX)
    numeric_match = re.search(r'\b(?!254)(\d{8,15})\b', particulars_str)
    if numeric_match:
        code = numeric_match.group(1)
        # Exclude if it looks like a phone number
        if not code.startswith('254') and not code.startswith('0'):
            return code
    
    # Pattern 4: Other alphanumeric codes (like REMITLY reference numbers)
    # Look for standalone alphanumeric strings (6-15 chars)
    alphanum_match = re.search(r'\b([A-Z0-9]{8,15})\b', particulars_str, re.IGNORECASE)
    if alphanum_match:
        code = alphanum_match.group(1).upper()
        # Exclude common words/patterns
        excluded_patterns = ['EVIMERIA', 'INITIATIVE', 'ENTERPRISE', 'REMITLY', 'PAYBILL', 'ACCOUNT']
        if not any(pattern in code for pattern in excluded_patterns):
            return code
    
    # Pattern 5: Extract first meaningful code-like string from start of particulars
    # (fallback for cases where code is at the beginning)
    first_token_match = re.match(r'^([A-Z0-9]{6,15})', particulars_str, re.IGNORECASE)
    if first_token_match:
        return first_token_match.group(1).upper()
    
    return None


def main():
    parser = argparse.ArgumentParser(description='Extract transactions from PDF bank statement')
    parser.add_argument('pdf_path', help='Path to PDF file')
    parser.add_argument('--output', help='Output JSON file path', default=None)
    
    args = parser.parse_args()
    
    pdf_path = Path(args.pdf_path)
    if not pdf_path.exists():
        print(f"Error: PDF file not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)
    
    # Try pdfplumber first
    result = extract_text_from_pdf_pdfplumber(str(pdf_path))
    
    transactions = []
    
    if result:
        pages = result.get('pages', [])
        
        if result['is_paybill']:
            paybill_tables = []
            for page in pages:
                for table in page.get('tables', []):
                    paybill_tables.append(table)
            transactions = parse_paybill_table(paybill_tables)
        else:
            text_transactions = []
            table_transactions = []

            # Text-based extraction per page
            last_balance = None
            for page in pages:
                page_number = page.get('page_number')
                page_text = page.get('text') or ""
                if page_text and len(page_text) > 50:
                    detected, last_balance = detect_table_rows(
                        page_text,
                        page_number=page_number,
                        initial_balance=last_balance,
                    )
                    text_transactions.extend(detected)

            # Table extraction per page
            for page in pages:
                page_number = page.get('page_number')
                tables = page.get('tables', [])
                for table_index, table in enumerate(tables):
                    if isinstance(table, dict):
                        rows = table.get('rows') or []
                        header_row = table.get('header')
                        table_page = table.get('page_number', page_number)
                    else:
                        rows = table or []
                        header_row = table[0] if table else None
                        table_page = page_number

                    if not rows:
                        continue

                    table_transactions.extend(
                        parse_bank_table(
                            rows,
                            header_row,
                            page_number=table_page,
                            table_index=table_index
                        )
                    )

            transactions = list(text_transactions)

            if table_transactions:
                table_has_complete = all(
                    len(t.get('particulars', '')) > 15 and not t.get('particulars', '').startswith('---')
                    for t in table_transactions[:10]
                )

                if table_has_complete and len(table_transactions) > len(text_transactions):
                    transactions = table_transactions
                elif not text_transactions:
                    transactions = table_transactions
                else:
                    seen_keys = {
                        (t.get('tran_date'), t.get('credit'), t.get('debit'), t.get('particulars'))
                        for t in transactions
                    }
                    for entry in table_transactions:
                        key = (entry.get('tran_date'), entry.get('credit'), entry.get('debit'), entry.get('particulars'))
                        if key not in seen_keys:
                            transactions.append(entry)
                            seen_keys.add(key)
    
    # Fallback to OCR if pdfplumber didn't work or returned little content
    if not transactions and OCR_AVAILABLE:
        print("Falling back to OCR...", file=sys.stderr)
        ocr_text = extract_text_from_pdf_ocr(str(pdf_path))
        if ocr_text and len(ocr_text) > 100:
            transactions, _ = detect_table_rows(ocr_text, page_number=None)
    
    # Output JSON
    output_json = json.dumps(transactions, indent=2)
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(output_json)
        
        # Also write debug text
        debug_path = args.output.replace('.json', '_debug.txt')
        with open(debug_path, 'w') as f:
            f.write(f"Extracted {len(transactions)} transactions\n\n")
            if result:
                f.write(f"Text length: {len(result.get('text', ''))}\n")
                f.write(f"Tables found: {len(result.get('tables', []))}\n")
                f.write(f"Is Paybill: {result.get('is_paybill', False)}\n")
    else:
        print(output_json)
    
    sys.exit(0)


if __name__ == '__main__':
    main()

