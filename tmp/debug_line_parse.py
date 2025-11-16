from pathlib import Path
import re

line = "06-02-2025 06-02-2025 MPS 254723861052 TB6921IO59 12,000.00 1,560,100.00"
amount_pattern = r"[\d,]+\.?\d{0,2}"
amounts = re.findall(amount_pattern, line)
print(amounts)
credit = 0.0
for amount_str in reversed(amounts):
    cleaned_amount = amount_str.replace(",", "").replace(".", "")
    if len(cleaned_amount) >= 9 and len(cleaned_amount) <= 12 and '.' not in amount_str and ',' not in amount_str:
        continue
    amount_pos = line.rfind(amount_str)
    context = line[max(0, amount_pos-10):amount_pos+len(amount_str)+10]
    if re.search(r"[A-Za-z]\d+|\d+[A-Za-z]", context):
        if re.search(r"[A-Z]{2,}\d+[A-Z0-9]+", context):
            continue
    amount_val = float(amount_str.replace(',', ''))
    has_decimal = '.' in amount_str and amount_str.count('.') == 1
    if has_decimal:
        remaining_text = line[amount_pos + len(amount_str):]
        remaining_amounts = re.findall(amount_pattern, remaining_text)
        if remaining_amounts:
            credit = amount_val
            break
        else:
            continue
    elif ',' in amount_str:
        remaining_text = line[amount_pos + len(amount_str):]
        remaining_amounts = re.findall(amount_pattern, remaining_text)
        if remaining_amounts:
            if amount_val < 10000:
                credit = amount_val
                break
            elif '.' in line[max(0, amount_pos-5):amount_pos+5]:
                credit = amount_val
                break
        else:
            continue
print('credit', credit)
