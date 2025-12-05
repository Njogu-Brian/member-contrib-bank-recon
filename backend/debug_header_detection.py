import sys
import os
sys.path.insert(0, '../ocr-parser')

# Import the actual parser
import pdfplumber

pdf = pdfplumber.open('storage/app/statements/1764919651_EvimeriaAccount_statementTB25120500632751.pdf')
table = pdf.pages[0].extract_tables()[0]

print("=== HEADER ROW DETECTION TEST ===\n")
header_row = table[0]

print(f"Header row has {len(header_row)} cells:\n")

# Simulate parser logic
date_col = None
particulars_col = None
credit_col = None

for i, cell in enumerate(header_row):
    cell_str = str(cell).strip().upper() if cell else ""
    print(f"Col {i}: '{cell}' → Upper: '{cell_str}'")
    
    if "TRAN DATE" in cell_str or ("DATE" in cell_str and "VALUE" not in cell_str):
        date_col = i
        print(f"  ✅ Identified as DATE column")
    elif "PARTICULARS" in cell_str or "DETAILS" in cell_str or "DESCRIPTION" in cell_str or "NARRATIVE" in cell_str:
        particulars_col = i
        print(f"  ✅ Identified as PARTICULARS column")
    elif "CREDIT" in cell_str:
        if "BALANCE" not in cell_str and "DEBIT" not in cell_str:
            credit_col = i
            print(f"  ✅ Identified as CREDIT column")

print(f"\n=== FINAL COLUMN ASSIGNMENTS ===")
print(f"date_col = {date_col}")
print(f"particulars_col = {particulars_col}")
print(f"credit_col = {credit_col}")

print(f"\n=== ROW 5 (LOCHOKA) DATA ===")
row5 = table[5]
print(f"Col {particulars_col} (should be Narrative): {repr(row5[particulars_col])}")
print(f"Col 9 (Remarks 1): {repr(row5[9])}")

pdf.close()

