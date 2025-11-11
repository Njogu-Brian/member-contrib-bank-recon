#!/usr/bin/env python3
"""Debug script to see what text is extracted from PDF"""

import sys
from pathlib import Path

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False
    print("pdfplumber not installed", file=sys.stderr)

if len(sys.argv) < 2:
    print("Usage: python debug_pdf.py <pdf_file>", file=sys.stderr)
    sys.exit(1)

pdf_path = Path(sys.argv[1])

if not pdf_path.exists():
    print(f"File not found: {pdf_path}", file=sys.stderr)
    sys.exit(1)

if HAS_PDFPLUMBER:
    print("Extracting text with pdfplumber...", file=sys.stderr)
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text += f"\n--- Page {i+1} ---\n"
                    text += page_text
        print(text)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
else:
    print("pdfplumber not available", file=sys.stderr)
    sys.exit(1)

