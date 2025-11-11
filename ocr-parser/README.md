# OCR Parser Service

Python service for parsing bank statement PDFs with OCR fallback.

## Installation

1. Install Tesseract OCR:
   - **Windows**: Download from https://github.com/UB-Mannheim/tesseract/wiki
   - **macOS**: `brew install tesseract`
   - **Linux**: `sudo apt-get install tesseract-ocr`

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Configure Tesseract path (if not in PATH):
   - Set `TESSERACT_CMD` environment variable
   - Or modify `pytesseract.pytesseract.tesseract_cmd` in the script

## Usage

```bash
python parse_pdf.py statement.pdf --output output.json
```

The script will:
1. Try to extract text directly from PDF (pdfplumber)
2. Fall back to OCR if text extraction fails
3. Parse transaction rows using heuristics
4. Output JSON array of transactions

## Output Format

```json
[
  {
    "tran_date": "2025-04-04",
    "value_date": "2025-04-04",
    "particulars": "MPS2547... JACINTA WAN 0716227320",
    "credit": 3000.0,
    "debit": 0.0,
    "balance": 50000.0
  }
]
```

