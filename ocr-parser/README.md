# OCR Parser Service

Python service for parsing bank statement PDFs with OCR fallback.

## Installation

### Windows
See [SETUP_WINDOWS.md](SETUP_WINDOWS.md) for detailed Windows setup instructions.

Quick setup:
1. Install Python 3.9+ from https://www.python.org/downloads/ (check "Add to PATH")
2. Install Tesseract from https://github.com/UB-Mannheim/tesseract/wiki
3. Install dependencies: `python -m pip install -r requirements.txt`

### macOS
1. Install Tesseract: `brew install tesseract`
2. Install dependencies: `pip install -r requirements.txt`

### Linux
1. Install Tesseract: `sudo apt-get install tesseract-ocr`
2. Install dependencies: `pip install -r requirements.txt`

### Configure Tesseract Path (if needed)
If Tesseract is not in your PATH:
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

