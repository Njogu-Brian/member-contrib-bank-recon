import pdfplumber

pdf = pdfplumber.open('storage/app/statements/1764919651_EvimeriaAccount_statementTB25120500632751.pdf')
table = pdf.pages[0].extract_tables()[0]

print('ALL Dec-03 rows in extracted table:')
print(f'Total rows in table: {len(table)}\n')

for idx, row in enumerate(table):
    # Check if row contains 03/12/2025
    row_str = ' '.join([str(c) if c else '' for c in row])
    if '03/12/2025' in row_str:
        print(f'=== Row {idx} ===')
        print(f'  Col 0 (Tran Date): {repr(row[0])}')
        print(f'  Col 1 (Value Date): {repr(row[1])}')
        print(f'  Col 2 (Narrative): {repr(row[2])}')
        print(f'  Col 3 (Txn Ref): {repr(row[3])}')
        print(f'  Col 6 (Credit): {repr(row[6])}')
        print(f'  Col 9 (Remarks 1): {repr(row[9])}')
        print()

pdf.close()

