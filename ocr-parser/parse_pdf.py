#!/usr/bin/env python3
"""
Bank Statement PDF Parser with OCR fallback
Extracts transaction rows from PDF bank statements.
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False

try:
    from pdf2image import convert_from_path
    import pytesseract
    HAS_OCR = True
    # Try to find Tesseract
    try:
        pytesseract.get_tesseract_version()
        TESSERACT_AVAILABLE = True
    except Exception:
        TESSERACT_AVAILABLE = False
        print("Warning: Tesseract OCR not found. OCR fallback will not be available.", file=sys.stderr)
        print("Install Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki", file=sys.stderr)
except ImportError:
    HAS_OCR = False
    TESSERACT_AVAILABLE = False


def extract_text_from_pdf_pdfplumber(pdf_path):
    """Extract text using pdfplumber (preferred method)."""
    if not HAS_PDFPLUMBER:
        return None
    
    text = ""
    tables_data = []  # Store structured table data for Paybill
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            paybill_header = None
            paybill_rows = []
            is_paybill_doc = False
            
            # First pass: identify if this is a Paybill document and get the header
            for page in pdf.pages:
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        if table and len(table) > 0:
                            header_row = table[0] if table else []
                            header_text = ' '.join(str(cell) if cell else '' for cell in header_row).lower()
                            
                            if 'receipt no' in header_text or 'paid in' in header_text or 'completion time' in header_text:
                                is_paybill_doc = True
                                if paybill_header is None:
                                    paybill_header = header_row
                                break  # Found header, break inner loop
                    if is_paybill_doc:
                        break  # Found Paybill, break page loop
            
            # Second pass: extract all rows from all pages if this is a Paybill document
            if is_paybill_doc and paybill_header:
                header_text_lower = ' '.join(str(cell) if cell else '' for cell in paybill_header).lower()
                header_col_count = len(paybill_header)
                
                for page in pdf.pages:
                    tables = page.extract_tables()
                    if tables:
                        for table in tables:
                            if not table or len(table) == 0:
                                continue
                            
                            # Check if this table is part of the Paybill table
                            # It could be:
                            # 1. Has header row (first page or repeated header)
                            # 2. Has same column count as header (continuation table)
                            # 3. Has transaction code pattern in first cell (data rows)
                            
                            first_row = table[0] if table else []
                            if not first_row:
                                continue
                            
                            first_row_text = ' '.join(str(cell) if cell else '' for cell in first_row).lower()
                            first_row_col_count = len(first_row)
                            
                            # Determine if this is a Paybill table
                            is_paybill_table = False
                            
                            # Check 1: Has header row
                            if 'receipt no' in first_row_text or first_row_text == header_text_lower:
                                is_paybill_table = True
                            # Check 2: Same column count as header (likely continuation)
                            elif first_row_col_count == header_col_count and header_col_count > 0:
                                # Check if first cell looks like a transaction code (data row, not header)
                                first_cell = str(first_row[0]).strip() if first_row[0] else ''
                                if re.match(r'^[A-Z][A-Z0-9]{8,12}$', first_cell):
                                    is_paybill_table = True
                                # Or check if any cell in first row has date pattern
                                elif any(cell and re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s+\d{1,2}:\d{2}:\d{2}', str(cell)) for cell in first_row):
                                    is_paybill_table = True
                            
                            if is_paybill_table:
                                # Process all rows in this table
                                for idx, row in enumerate(table):
                                    if not row:
                                        continue
                                    
                                    # Skip header rows
                                    row_text = ' '.join(str(cell) if cell else '' for cell in row).lower()
                                    if 'receipt no' in row_text or row_text == header_text_lower:
                                        continue  # Skip header row
                                    
                                    # Check if row has actual data
                                    has_data = any(cell and str(cell).strip() for cell in row if cell)
                                    if not has_data:
                                        continue
                                    
                                    # Validate it's a data row (not a header or summary row)
                                    # Check if first cell is a transaction code OR has date pattern
                                    row_first_cell = str(row[0]).strip() if len(row) > 0 and row[0] else ''
                                    has_transaction_code = re.match(r'^[A-Z][A-Z0-9]{8,12}$', row_first_cell)
                                    
                                    # Check if any cell has a date pattern
                                    has_date = False
                                    for cell in row:
                                        if cell and re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s+\d{1,2}:\d{2}:\d{2}', str(cell)):
                                            has_date = True
                                            break
                                    
                                    # Only add if it looks like a transaction row
                                    if has_transaction_code or has_date:
                                        paybill_rows.append(row)
                            else:
                                # Regular table - convert to text
                                for row in table:
                                    if row:
                                        row_text = ' '.join(str(cell) if cell else '' for cell in row if cell)
                                        if row_text.strip():
                                            text += row_text + "\n"
                
                # Store the combined Paybill table
                if paybill_rows:
                    tables_data.append({
                        'type': 'paybill',
                        'header': paybill_header,
                        'rows': paybill_rows
                    })
            else:
                # Not a Paybill document, extract text normally
                for page in pdf.pages:
                    tables = page.extract_tables()
                    if tables:
                        for table in tables:
                            for row in table:
                                if row:
                                    row_text = ' '.join(str(cell) if cell else '' for cell in row if cell)
                                    if row_text.strip():
                                        text += row_text + "\n"
                    
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        
        # Return both text and structured table data
        return {'text': text, 'tables': tables_data}
    except Exception as e:
        print(f"Error with pdfplumber: {e}", file=sys.stderr)
        return None


def extract_text_from_pdf_ocr(pdf_path):
    """Extract text using OCR (fallback method)."""
    if not HAS_OCR or not TESSERACT_AVAILABLE:
        return None
    
    try:
        images = convert_from_path(pdf_path, dpi=300)
        text = ""
        for image in images:
            text += pytesseract.image_to_string(image) + "\n"
        return text
    except Exception as e:
        print(f"Error with OCR: {e}", file=sys.stderr)
        return None


def parse_date(date_str):
    """Parse date string to YYYY-MM-DD format."""
    if not date_str:
        return None
    
    # Common date formats
    formats = [
        '%d/%m/%Y',
        '%d-%m-%Y',
        '%Y-%m-%d',
        '%d/%m/%y',
        '%d-%m-%y',
        '%Y/%m/%d',
    ]
    
    date_str = date_str.strip()
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            # Convert 2-digit years
            if dt.year < 2000:
                dt = dt.replace(year=dt.year + 100)
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            continue
    
    return None


def parse_amount(amount_str):
    """Parse amount string to float."""
    if not amount_str:
        return 0.0
    
    # Remove currency symbols and commas
    amount_str = re.sub(r'[^\d.-]', '', str(amount_str))
    try:
        return float(amount_str)
    except ValueError:
        return 0.0


def parse_paybill_table(table_data):
    """Parse Paybill statement table directly from pdfplumber table extraction."""
    rows = []
    
    if not table_data or 'rows' not in table_data or 'header' not in table_data:
        return rows
    
    header = table_data['header']
    table_rows = table_data['rows']
    
    # Find column indices
    receipt_no_idx = None
    completion_time_idx = None
    details_idx = None
    paid_in_idx = None
    withdrawn_idx = None
    
    for idx, cell in enumerate(header):
        if cell:
            cell_lower = str(cell).lower()
            if 'receipt no' in cell_lower:
                receipt_no_idx = idx
            elif 'completion time' in cell_lower:
                completion_time_idx = idx
            elif 'details' in cell_lower:
                details_idx = idx
            elif 'paid in' in cell_lower:
                paid_in_idx = idx
            elif 'withdrawn' in cell_lower:
                withdrawn_idx = idx
    
    # Parse each row
    for row in table_rows:
        if not row or len(row) == 0:
            continue
        
        # Skip if row is empty or all cells are None/empty
        if not any(cell and str(cell).strip() for cell in row):
            continue
        
        # Get Receipt No. (transaction code)
        transaction_code = None
        if receipt_no_idx is not None and receipt_no_idx < len(row) and row[receipt_no_idx]:
            transaction_code = str(row[receipt_no_idx]).strip()
            # Skip if transaction code is empty or looks like a header
            if not transaction_code or transaction_code.lower() in ['receipt no.', 'receipt no', 'receipt']:
                continue
        
        # Get Completion Time (transaction date) - IGNORE Initiation Time
        tran_date = None
        if completion_time_idx is not None and completion_time_idx < len(row) and row[completion_time_idx]:
            completion_time_str = str(row[completion_time_idx]).strip()
            # Skip if it looks like a header
            if completion_time_str.lower() not in ['completion time', 'completion']:
                # Parse date from "31-10-2025 17:18:52" format
                date_time_match = re.match(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(\d{1,2}:\d{2}:\d{2})', completion_time_str)
                if date_time_match:
                    tran_date = parse_date(date_time_match.group(1))
        
        # Get Details (particulars)
        particulars = None
        if details_idx is not None and details_idx < len(row) and row[details_idx]:
            particulars = str(row[details_idx]).strip()
            # Skip if it looks like a header
            if particulars.lower() in ['details', 'particulars']:
                continue
        
        # Get Paid In (credit amount) - THIS IS REQUIRED - ALL Paid In amounts should be captured
        credit_amount = 0.0
        if paid_in_idx is not None and paid_in_idx < len(row) and row[paid_in_idx]:
            paid_in_str = str(row[paid_in_idx]).strip()
            # Skip if it looks like a header, but process all other values
            if paid_in_str.lower() not in ['paid in', 'paid']:
                if paid_in_str and paid_in_str.lower() not in ['none', 'null', 'n/a', '-', '']:
                    credit_amount = parse_amount(paid_in_str)
        
        # Get Withdrawn (debit amount) - we'll skip if this has value and Paid In is empty
        withdrawn_amount = 0.0
        if withdrawn_idx is not None and withdrawn_idx < len(row) and row[withdrawn_idx]:
            withdrawn_str = str(row[withdrawn_idx]).strip()
            if withdrawn_str and withdrawn_str.lower() not in ['', 'none', 'null', 'n/a', '-', 'withdrawn']:
                withdrawn_amount = parse_amount(withdrawn_str)
        
        # Skip if this is a withdrawal transaction (no Paid In, but has Withdrawn)
        # Only skip if Withdrawn > 0 AND Paid In is 0 or empty
        if credit_amount == 0 and withdrawn_amount > 0:
            continue
        
        # Skip if we don't have required fields
        # For Paybill, we need: date, particulars, and Paid In amount > 0
        if not tran_date or not particulars:
            continue
        
        # CRITICAL: Only skip if Paid In is 0 or empty (no credit transaction)
        # All transactions with Paid In > 0 should be captured
        if credit_amount == 0:
            continue
        
        # Build the transaction row
        transaction_row = {
            'tran_date': tran_date,
            'value_date': tran_date,  # Use same date for value date
            'particulars': particulars,
            'credit': credit_amount,
            'debit': 0.0,  # We ignore withdrawn
            'balance': None,  # We ignore balance
            'transaction_code': transaction_code,  # Store transaction code
        }
        
        rows.append(transaction_row)
    
    return rows


def detect_table_rows(text):
    """Detect table rows in text using heuristics. Handles multi-line transactions."""
    lines = text.split('\n')
    rows = []
    
    # Patterns for detecting transaction rows
    date_pattern = re.compile(r'^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}')  # Date at start of line
    # Paybill transaction codes: TJQID8GA3G, TJQ8M8C3P9, etc. - usually 10-11 chars, starts with T, then letters/numbers
    transaction_code_pattern = re.compile(r'^[A-Z][A-Z0-9]{8,12}\b')  # Transaction code at start (Paybill format)
    amount_pattern = re.compile(r'[\d,]+\.?\d{0,2}')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Skip empty lines and header lines
        if not line:
            i += 1
            continue
        
        if any(header in line.lower() for header in ['tran date', 'value date', 'particulars', 'credit', 'debit', 'balance', 'narration', 'description', 'instrument', 'receipt no', 'initiation time', 'completion time', 'paid in', 'withdrawn', 'transaction status', 'reason type', 'other party info', 'trade order id', 'currency']):
            i += 1
            continue
        
        # Check if this line starts with a date (transaction row start) OR transaction code (Paybill format)
        date_match = date_pattern.match(line)
        code_match = transaction_code_pattern.match(line)
        
        # Handle Paybill format: transaction code first, then date/time
        # Paybill columns: Receipt No. | Initiation Time | Completion Time | Details | Status | Balance | Paid In | Withdrawn | Trade Order Id | Reason Type | Other Party Info
        # We need: Receipt No. (transaction code), Initiation Time (date), Details (particulars), Paid In (credit)
        # We ignore: Balance, Withdrawn, Trade Order Id, Reason Type, Currency, Other Party Info
        
        # Check if this looks like a Paybill row (transaction code pattern OR contains "Pay Bill" keywords)
        is_paybill_row = code_match and not date_match
        if not is_paybill_row and re.search(r'\bPay\s+Bill|Pay\s+Bill\s+Online\b', line, re.I):
            # Might be a Paybill row even if code pattern didn't match - check if it has date/time pattern
            if re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s+\d{1,2}:\d{2}:\d{2}', line):
                is_paybill_row = True
        
        if is_paybill_row:
            # This might be a Paybill transaction - look for date/time after the code
            parts = re.split(r'\s{2,}|\t', line)
            parts = [p.strip() for p in parts if p.strip()]
            
            if len(parts) < 2:
                parts = line.split()
            
            # Transaction code (Receipt No.) - might be first part or might need to find it
            transaction_code = None
            if parts:
                # Check if first part matches transaction code pattern
                if re.match(r'^[A-Z][A-Z0-9]{8,12}$', parts[0]):
                    transaction_code = parts[0]
                else:
                    # Look for transaction code in the line
                    code_match_in_line = re.search(r'\b([A-Z][A-Z0-9]{8,12})\b', line)
                    if code_match_in_line:
                        transaction_code = code_match_in_line.group(1)
            
            # Look for date in subsequent parts (Initiation Time or Completion Time)
            # Date format in Paybill: "26-10-2025 14:53:26" or "27-10-2025 13:24:39"
            tran_date = None
            value_date = None
            date_idx = None
            
            # First, try to find date/time pattern in the entire line (more reliable)
            date_time_pattern = re.search(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(\d{1,2}:\d{2}:\d{2})', line)
            if date_time_pattern:
                parsed_date = parse_date(date_time_pattern.group(1))
                if parsed_date:
                    tran_date = parsed_date
                    # Find which part contains this date
                    for idx, part in enumerate(parts):
                        if date_time_pattern.group(0) in part or date_time_pattern.group(1) in part:
                            date_idx = idx
                            break
                    if date_idx is None:
                        date_idx = 1  # Default to second position if not found
            
            # If not found in line, try parsing individual parts
            if not tran_date:
                for idx, part in enumerate(parts):
                    # Try parsing date/time format (e.g., "26-10-2025 14:53:26")
                    date_time_match = re.match(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(\d{1,2}:\d{2}:\d{2})', part)
                    if date_time_match:
                        parsed_date = parse_date(date_time_match.group(1))
                        if parsed_date:
                            if tran_date is None:
                                tran_date = parsed_date
                                date_idx = idx
                            elif value_date is None:
                                value_date = parsed_date
                            continue
                    
                    # Try parsing date without time
                    parsed_date = parse_date(part)
                    if parsed_date:
                        if tran_date is None:
                            tran_date = parsed_date
                            date_idx = idx
                        elif value_date is None:
                            value_date = parsed_date
            
            if tran_date:
                # For Paybill, the structure is typically:
                # Receipt No. | Initiation Time | Completion Time | Details | Status | Balance | Paid In | Withdrawn | Trade Order Id | Reason Type | Other Party Info
                # We need to find: Details (particulars) and Paid In (credit amount)
                
                # Find the "Details" column - usually after the date/time columns
                # Look for "Pay Bill" or "Pay Bill Online" which indicates the start of Details
                particulars_start = None
                particulars_end = None
                paid_in_idx = None
                
                # Find Details column - it contains "Pay Bill" or "Pay Bill Online" and account info
                # Details usually starts after date/time columns
                start_search_idx = date_idx + 1 if date_idx is not None else 1
                
                for idx in range(start_search_idx, len(parts)):
                    part = parts[idx]
                    
                    # Details column usually starts with "Pay Bill" or contains account names with "Acc"
                    if re.search(r'Pay\s+Bill|Acc\.|Acc\s+', part, re.I):
                        if particulars_start is None:
                            particulars_start = idx
                        # Continue collecting particulars - Details can span multiple parts
                        particulars_end = idx + 1
                    elif particulars_start is not None:
                        # We're in the Details section - continue until we hit Status or a clear separator
                        # Check if this part looks like it's still part of Details (not Status, not an amount)
                        if not re.match(r'^(Completed|Failed|Pending|Processing|KES)$', part, re.I) and not parse_amount(part) > 0:
                            # Might still be part of Details (could be continuation of account name)
                            if len(part) > 3 and not re.match(r'^\d+$', part):
                                particulars_end = idx + 1
                            else:
                                break  # Hit something that's not Details
                        else:
                            break  # Hit Status or amount, stop collecting Details
                
                # If we couldn't find Paid In by position, look for amounts at the end
                # Paybill column order: Details | Status | Balance | Paid In | Withdrawn | Trade Order Id | Reason Type
                # We need to find Paid In which comes after Balance
                if paid_in_idx is None:
                    # Find all amounts after Details
                    line_amounts = []
                    status_idx = None
                    
                    # First, find Status column (usually "Completed", "Failed", etc.)
                    for idx, part in enumerate(parts):
                        if idx > (particulars_end or date_idx):
                            if re.match(r'^(Completed|Failed|Pending|Processing)$', part, re.I):
                                status_idx = idx
                                break
                    
                    # Now look for amounts after Status
                    # Balance is usually the first amount, Paid In is the second
                    start_idx = status_idx + 1 if status_idx else (particulars_end or date_idx) + 1
                    amount_indices = []
                    
                    for idx in range(start_idx, len(parts)):
                        part = parts[idx]
                        # Skip non-numeric parts (like "Pay Utility", "Pay Bill Online")
                        if re.match(r'^(Pay\s+Utility|Pay\s+Bill\s+Online|Utility\s+Account)$', part, re.I):
                            continue
                        amt = parse_amount(part)
                        if amt > 0:
                            amount_indices.append((idx, amt))
                    
                    # Paid In is typically the second amount after Status (first is Balance, second is Paid In)
                    # Or if only one amount, it might be Paid In
                    if len(amount_indices) >= 2:
                        # Second amount is usually Paid In (first is Balance)
                        paid_in_idx = amount_indices[1][0]
                    elif len(amount_indices) == 1:
                        # Only one amount - check if it's reasonable (not a balance which is usually larger)
                        idx, amt = amount_indices[0]
                        if 100 <= amt <= 1000000:  # Reasonable range for contributions
                            paid_in_idx = idx
                
                # Extract particulars
                particulars_parts = []
                if particulars_start is not None and particulars_end is not None:
                    particulars_parts = parts[particulars_start:particulars_end]
                elif particulars_start is not None:
                    # Take everything from particulars_start until Paid In
                    end_idx = paid_in_idx if paid_in_idx else len(parts)
                    particulars_parts = parts[particulars_start:end_idx]
                
                # Get Paid In amount
                credit_amount = 0.0
                if paid_in_idx is not None and paid_in_idx < len(parts):
                    credit_amount = parse_amount(parts[paid_in_idx])
                
                # Skip if no credit amount found or if it's a withdrawn transaction
                if credit_amount == 0:
                    i += 1
                    continue
                
                # Build the row
                row = {
                    'tran_date': tran_date,
                    'value_date': value_date,
                    'particulars': ' '.join(particulars_parts).strip(),
                    'credit': credit_amount,  # "Paid In" amount
                    'debit': 0.0,  # We ignore Withdrawn
                    'balance': None,  # We ignore Balance
                }
                
                # Only add if we have a date, particulars, and credit amount
                if row['tran_date'] and row['particulars'] and row['credit'] > 0:
                    rows.append(row)
                
                i += 1
                continue
        
        if date_match:
            # This is the start of a transaction row
            # Parse the first line to get dates
            # Try splitting by multiple spaces first, then fall back to single spaces
            parts = re.split(r'\s{2,}|\t', line)
            parts = [p.strip() for p in parts if p.strip()]
            
            # If splitting by multiple spaces didn't work well, try single space split
            if len(parts) < 2:
                parts = line.split()
            
            if len(parts) >= 2:
                tran_date = parse_date(parts[0])
                value_date = parse_date(parts[1]) if len(parts) > 1 else None
                
                if tran_date:
                    # Collect multi-line particulars
                    particulars_parts = []
                    amount_line_idx = None
                    amounts_found = []
                    
                    # Look ahead for amounts (usually on the same line or next few lines)
                    # Check current line first
                    line_amounts = amount_pattern.findall(line)
                    if len(line_amounts) >= 2:
                        # Amounts are on the same line
                        amount_line_idx = i
                        # Extract amounts from end of line (last 2 are usually credit and balance)
                        for amt_str in line_amounts[-2:]:
                            amt = parse_amount(amt_str)
                            if amt > 0:
                                amounts_found.append(amt)
                        
                        # Extract particulars - everything after dates but before amounts
                        # Split the line more carefully to separate particulars from amounts
                        # The format is usually: date date particulars... amount amount
                        # Try to find where amounts start by looking for numeric patterns at the end
                        line_parts = line.split()
                        # Find the last 2 numeric values (credit and balance)
                        amount_positions = []
                        for idx in range(len(line_parts) - 1, -1, -1):
                            if parse_amount(line_parts[idx]) > 0:
                                amount_positions.insert(0, idx)
                                if len(amount_positions) >= 2:
                                    break
                        
                        if amount_positions:
                            # Particulars are everything between dates and first amount
                            particulars_start_idx = 2 if value_date else 1
                            if particulars_start_idx < amount_positions[0]:
                                particulars_parts.extend(line_parts[particulars_start_idx:amount_positions[0]])
                            elif len(parts) > particulars_start_idx:
                                # Fallback to original parts
                                amount_start_idx = len(parts)
                                for j in range(len(parts) - 1, -1, -1):
                                    if parse_amount(parts[j]) > 0:
                                        amount_start_idx = j
                                        break
                                if particulars_start_idx < amount_start_idx:
                                    particulars_parts.extend(parts[particulars_start_idx:amount_start_idx])
                    else:
                        # Amounts might be on subsequent lines, collect particulars first
                        particulars_start = 2 if value_date else 1
                        if particulars_start < len(parts):
                            particulars_parts.extend(parts[particulars_start:])
                        
                        # Look ahead for amounts on next lines
                        j = i + 1
                        while j < len(lines) and j < i + 5:  # Look ahead max 5 lines
                            next_line = lines[j].strip()
                            if not next_line:
                                j += 1
                                continue
                            
                            # Check if this line has amounts
                            next_amounts = amount_pattern.findall(next_line)
                            if len(next_amounts) >= 2:
                                amount_line_idx = j
                                for amt_str in next_amounts[-2:]:
                                    amt = parse_amount(amt_str)
                                    if amt > 0:
                                        amounts_found.append(amt)
                                break
                            elif len(next_amounts) == 1:
                                # Might be a continuation line, check if next line has more amounts
                                if j + 1 < len(lines):
                                    next_next_line = lines[j + 1].strip()
                                    next_next_amounts = amount_pattern.findall(next_next_line)
                                    if len(next_next_amounts) >= 1:
                                        # This line is part of particulars
                                        particulars_parts.append(next_line)
                                        j += 1
                                        continue
                            
                            # If no date pattern at start, it's likely part of particulars
                            if not date_pattern.match(next_line):
                                particulars_parts.append(next_line)
                            else:
                                # New transaction starts, stop here
                                break
                            
                            j += 1
                    
                    # Build the row
                    if len(amounts_found) >= 2:
                        credit_amount = amounts_found[0] if len(amounts_found) >= 1 else 0.0
                        debit_amount = amounts_found[1] if len(amounts_found) >= 2 else 0.0
                        
                        # Skip debit transactions (we only need credits)
                        if credit_amount == 0 and debit_amount > 0:
                            if amount_line_idx is not None:
                                i = amount_line_idx + 1
                            else:
                                i = j if 'j' in locals() else i + 1
                            continue
                        
                        row = {
                            'tran_date': tran_date,
                            'value_date': value_date,
                            'particulars': ' '.join(particulars_parts).strip(),
                            'credit': credit_amount,
                            'debit': debit_amount,
                            'balance': amounts_found[1] if len(amounts_found) >= 2 else None,
                        }
                        
                        # Only add if we have a date and credit amount
                        if row['tran_date'] and row['credit'] > 0:
                            rows.append(row)
                        
                        # Move to next line after this transaction
                        if amount_line_idx is not None:
                            i = amount_line_idx + 1
                        else:
                            i = j if 'j' in locals() else i + 1
                    else:
                        i += 1
                else:
                    i += 1
            else:
                i += 1
        else:
            i += 1
    
    return rows




def main():
    parser = argparse.ArgumentParser(description='Parse bank statement PDF')
    parser.add_argument('pdf_file', help='Path to PDF file')
    parser.add_argument('--output', '-o', help='Output JSON file path')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    
    args = parser.parse_args()
    
    try:
        pdf_path = Path(args.pdf_file)
        
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        
        # Try pdfplumber first
        extraction_result = extract_text_from_pdf_pdfplumber(pdf_path)
        
        rows = []
        
        # Check if we got structured Paybill tables
        if extraction_result and isinstance(extraction_result, dict) and 'tables' in extraction_result:
            paybill_tables = extraction_result.get('tables', [])
            if paybill_tables:
                # Parse Paybill tables directly
                for table_data in paybill_tables:
                    if table_data.get('type') == 'paybill':
                        parsed_rows = parse_paybill_table(table_data)
                        rows.extend(parsed_rows)
                
                if rows:
                    # Successfully parsed Paybill tables
                    if args.debug:
                        print(f"Debug: Parsed {len(rows)} transactions from Paybill tables", file=sys.stderr)
                else:
                    # Fall back to text parsing
                    text = extraction_result.get('text', '')
                    if text:
                        rows = detect_table_rows(text)
        else:
            # Regular text extraction (for non-Paybill statements)
            text = extraction_result if isinstance(extraction_result, str) else (extraction_result.get('text', '') if isinstance(extraction_result, dict) else '')
            
            # Fallback to OCR
            if not text or len(text.strip()) < 100:
                print("Falling back to OCR...", file=sys.stderr)
                text = extract_text_from_pdf_ocr(pdf_path)
            
            if not text:
                raise Exception("Could not extract text from PDF")
            
            # Debug: Save extracted text
            if args.debug:
                debug_file = args.output.replace('.json', '_debug.txt') if args.output else 'debug_text.txt'
                with open(debug_file, 'w', encoding='utf-8') as f:
                    f.write(text)
                print(f"Debug: Extracted text saved to {debug_file}", file=sys.stderr)
                print(f"Debug: Text length: {len(text)} characters", file=sys.stderr)
                print(f"Debug: First 500 chars: {text[:500]}", file=sys.stderr)
            
            # Parse rows from text
            rows = detect_table_rows(text)
        
        if args.debug:
            print(f"Debug: Detected {len(rows)} transaction rows", file=sys.stderr)
        
        output = json.dumps(rows, indent=2, ensure_ascii=False)
        
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(output)
            print(f"Parsed {len(rows)} transactions, saved to {args.output}", file=sys.stderr)
        else:
            print(output)
        
        sys.exit(0)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()

