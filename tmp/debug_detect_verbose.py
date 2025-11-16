from pathlib import Path
import sys
import re
sys.path.append(str(Path(__file__).resolve().parent.parent / "ocr-parser"))
from parse_pdf import extract_text_from_pdf_pdfplumber

pdf_path = Path(r"D:\Projects\Evimeria_System\backend\storage\app\statements\statements\1762965105_30.10.2024-27-10-2025 (1).pdf")
res = extract_text_from_pdf_pdfplumber(str(pdf_path))
text = res["text"]
lines = text.split("\n")

def parse_date(date_str):
    from datetime import datetime
    date_str = date_str.strip()
    formats = ['%d/%m/%Y','%d-%m-%Y','%Y-%m-%d','%d/%m/%y','%d-%m-%y','%Y/%m/%d']
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
        except:
            continue
    m = re.match(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})', date_str)
    if m:
        day, month, year = m.groups()
        if len(year) == 2:
            year = '20' + year
        try:
            return datetime(int(year), int(month), int(day)).strftime('%Y-%m-%d')
        except:
            pass
    return None

date_pattern = r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}"
amount_pattern = r"[\d,]+\.?\d{0,2}"

i = 0
while i < len(lines):
    line = lines[i].strip()
    if not line or len(line) < 10:
        i += 1
        continue
    date_match = re.search(date_pattern, line)
    if not date_match:
        i += 1
        continue
    tran_date = parse_date(date_match.group())
    full_line = line
    next_i = i + 1
    while next_i < len(lines) and next_i <= i + 5:
        next_line = lines[next_i].strip()
        if not next_line:
            next_i += 1
            continue
        if re.search(date_pattern, next_line):
            break
        full_line += " " + next_line
        if '254723861052' in full_line:
            break
        next_i += 1
    if '254723861052' in full_line:
        print('Full line:', full_line)
        amounts = re.findall(amount_pattern, full_line)
        print('Amounts:', amounts)
        credit = None
        for amount_str in reversed(amounts):
            cleaned_amount = amount_str.replace(',', '').replace('.', '')
            if len(cleaned_amount) >= 9 and len(cleaned_amount) <= 12 and '.' not in amount_str and ',' not in amount_str:
                continue
            amount_pos = full_line.rfind(amount_str)
            context = full_line[max(0, amount_pos-10):amount_pos+len(amount_str)+10]
            if re.search(r'[A-Za-z]\d+|\d+[A-Za-z]', context):
                if re.search(r'[A-Z]{2,}\d+[A-Z0-9]+', context):
                    print('Skipping', amount_str, 'due to code context', context)
                    continue
            amount_val = float(amount_str.replace(',', ''))
            has_decimal = '.' in amount_str and amount_str.count('.') == 1
            if has_decimal:
                remaining_text = full_line[amount_pos + len(amount_str):]
                remaining_amounts = re.findall(amount_pattern, remaining_text)
                print('Consider', amount_str, 'remaining', remaining_amounts)
                if remaining_amounts:
                    credit = amount_val
                    print('Selected credit', credit)
                    break
                else:
                    continue
            elif ',' in amount_str:
                remaining_text = full_line[amount_pos + len(amount_str):]
                remaining_amounts = re.findall(amount_pattern, remaining_text)
                if remaining_amounts:
                    if amount_val < 10000:
                        credit = amount_val
                        break
                    elif '.' in full_line[max(0, amount_pos-5):amount_pos+5]:
                        credit = amount_val
                        break
                else:
                    continue
        print('Final credit', credit)
        break
    i = next_i if next_i > i else i + 1
