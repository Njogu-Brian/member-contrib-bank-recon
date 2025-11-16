# OCR Parser Service

Python service for extracting transactions from PDF bank statements.

## Installation

1. Install Python 3.9 or higher
2. Install Tesseract OCR:
   - Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki
   - macOS: `brew install tesseract`
   - Linux: `sudo apt-get install tesseract-ocr`
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

```bash
python parse_pdf.py <pdf_path> --output <json_path>
```

## Output

Returns JSON array of transactions with the following structure:
```json
[
  {
    "tran_date": "2025-10-31",
    "value_date": "2025-10-31",
    "particulars": "Transaction description",
    "credit": 5000.0,
    "debit": 0.0,
    "balance": null,
    "transaction_code": "TJVMV8W9FC"
  }
]
```

