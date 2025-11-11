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
except ImportError:
    HAS_OCR = False


def extract_text_from_pdf_pdfplumber(pdf_path):
    """Extract text using pdfplumber (preferred method)."""
    if not HAS_PDFPLUMBER:
        return None
    
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
    except Exception as e:
        print(f"Error with pdfplumber: {e}", file=sys.stderr)
        return None


def extract_text_from_pdf_ocr(pdf_path):
    """Extract text using OCR (fallback method)."""
    if not HAS_OCR:
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


def detect_table_rows(text):
    """Detect table rows in text using heuristics."""
    lines = text.split('\n')
    rows = []
    current_row = {}
    
    # Patterns for detecting transaction rows
    date_pattern = re.compile(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}')
    amount_pattern = re.compile(r'[\d,]+\.?\d{0,2}')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Look for date patterns
        dates = date_pattern.findall(line)
        amounts = amount_pattern.findall(line)
        
        # If we find a date and amounts, likely a transaction row
        if dates and len(amounts) >= 2:
            # Try to parse as a row
            parts = re.split(r'\s{2,}|\t', line)
            parts = [p.strip() for p in parts if p.strip()]
            
            if len(parts) >= 4:
                row = {
                    'tran_date': parse_date(parts[0]) if parts[0] else None,
                    'value_date': parse_date(parts[1]) if len(parts) > 1 else None,
                    'particulars': ' '.join(parts[2:-3]) if len(parts) > 5 else parts[2] if len(parts) > 2 else '',
                    'credit': 0.0,
                    'debit': 0.0,
                    'balance': None,
                }
                
                # Extract amounts (usually last 3 columns: credit, debit, balance)
                amount_values = []
                for part in parts[-3:]:
                    amt = parse_amount(part)
                    if amt > 0:
                        amount_values.append(amt)
                
                if len(amount_values) >= 1:
                    # Heuristic: if only one amount, assume it's credit if positive
                    if len(amount_values) == 1:
                        row['credit'] = amount_values[0]
                    elif len(amount_values) == 2:
                        # Usually credit and balance, or debit and balance
                        row['credit'] = amount_values[0]
                        row['balance'] = amount_values[1]
                    elif len(amount_values) >= 3:
                        row['credit'] = amount_values[0]
                        row['debit'] = amount_values[1]
                        row['balance'] = amount_values[2]
                
                if row['tran_date'] and row['particulars']:
                    rows.append(row)
    
    return rows


def parse_pdf(pdf_path):
    """Main parsing function."""
    pdf_path = Path(pdf_path)
    
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    # Try pdfplumber first
    text = extract_text_from_pdf_pdfplumber(pdf_path)
    
    # Fallback to OCR
    if not text or len(text.strip()) < 100:
        print("Falling back to OCR...", file=sys.stderr)
        text = extract_text_from_pdf_ocr(pdf_path)
    
    if not text:
        raise Exception("Could not extract text from PDF")
    
    # Parse rows
    rows = detect_table_rows(text)
    
    return rows


def main():
    parser = argparse.ArgumentParser(description='Parse bank statement PDF')
    parser.add_argument('pdf_file', help='Path to PDF file')
    parser.add_argument('--output', '-o', help='Output JSON file path')
    
    args = parser.parse_args()
    
    try:
        rows = parse_pdf(args.pdf_file)
        
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
        sys.exit(1)


if __name__ == '__main__':
    main()

