import pdfplumber
import json

pdf = pdfplumber.open('storage/app/statements/1764919651_EvimeriaAccount_statementTB25120500632751.pdf')
tables = pdf.pages[0].extract_tables()

print(f'Tables found: {len(tables)}\n')

if tables:
    print('First table - looking for LOCHOKA rows:')
    for i, row in enumerate(tables[0]):
        # Check if this row contains LOCHOKA
        row_str = ' '.join([str(c) for c in row if c])
        if 'LOCHOKA' in row_str or i < 2:  # Show header + LOCHOKA rows
            print(f'\n=== Row {i} ({len(row)} cells) ===')
            for j, cell in enumerate(row):
                cell_preview = str(cell)[:120] if cell else "(empty)"
                print(f'  Col {j}: {cell_preview}')

pdf.close()

