from pathlib import Path
import sys
sys.path.append(str(Path(__file__).resolve().parent.parent / "ocr-parser"))
import parse_pdf

print(parse_pdf.looks_like_currency("000889"))
