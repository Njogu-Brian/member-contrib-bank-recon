from pathlib import Path
import sys
sys.path.append(str(Path(__file__).resolve().parent.parent / "ocr-parser"))
from parse_pdf import extract_text_from_pdf_pdfplumber, detect_table_rows

pdf_path = Path(r"D:\Projects\Evimeria_System\backend\storage\app\statements\statements\1762965105_30.10.2024-27-10-2025 (1).pdf")
res = extract_text_from_pdf_pdfplumber(str(pdf_path))
text = res["text"]
transactions = detect_table_rows(text)
print(f"Parsed {len(transactions)} transactions")
for tx in transactions:
    if "254723861052" in tx["particulars"]:
        print(tx)
        break
