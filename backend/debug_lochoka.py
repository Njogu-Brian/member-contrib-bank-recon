import pdfplumber

pdf = pdfplumber.open('storage/app/statements/1764919651_EvimeriaAccount_statementTB25120500632751.pdf')
table = pdf.pages[0].extract_tables()[0]

print('Row 1 (VIRGINIA - works correctly):')
print(f'  Total columns: {len(table[1])}')
print(f'  Col 2 (Narrative): {repr(table[1][2])}')
print(f'  Col 9 (Remarks 1): {repr(table[1][9])}')

print('\nRow 5 (LOCHOKA #1 - showing 627851XXXXXX instead):')
print(f'  Total columns: {len(table[5])}')
print(f'  Col 2 (Narrative): {repr(table[5][2])}')
print(f'  Col 9 (Remarks 1): {repr(table[5][9])}')

print('\nDiagnosis:')
print(f'  Parser should use: Col 2 = "{table[5][2]}"')
print(f'  Parser actually uses: Col 9 = "{table[5][9]}"')
print(f'  WHY? Let me check if Col 2 is empty or has special chars...')
print(f'  Col 2 length: {len(table[5][2])}')
print(f'  Col 2 stripped: "{table[5][2].strip()}"')
print(f'  Col 2 first line only: "{table[5][2].split(chr(10))[0]}"')

pdf.close()

