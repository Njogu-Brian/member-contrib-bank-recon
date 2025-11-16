from pathlib import Path
import sys
sys.path.append(str(Path(__file__).resolve().parent.parent / "ocr-parser"))
from parse_pdf import extract_text_from_pdf_pdfplumber

pdf_path = Path(r"D:\Projects\Evimeria_System\backend\storage\app\statements\statements\1762965105_30.10.2024-27-10-2025 (1).pdf")
res = extract_text_from_pdf_pdfplumber(str(pdf_path))
text = res["text"]
lines = text.split("\n")
for idx, line in enumerate(lines):
    if "254723861052" in line:
        print(f"Line {idx}: {line}")
        for offset in range(1,4):
            if idx+offset < len(lines):
                print(f"  +{offset}: {lines[idx+offset]}")
        break
