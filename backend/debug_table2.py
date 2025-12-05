import pdfplumber

pdf = pdfplumber.open('storage/app/statements/1764919651_EvimeriaAccount_statementTB25120500632751.pdf')
tables = pdf.pages[0].extract_tables()

print(f'Total tables found: {len(tables)}\n')

for table_idx, table in enumerate(tables):
    print(f'\n==== TABLE {table_idx} ====')
    print(f'Rows: {len(table)}')
    if table:
        print(f'Columns: {len(table[0]) if table[0] else 0}')
        print('Header row:')
        if table[0]:
            for i, cell in enumerate(table[0]):
                print(f'  Col {i}: {str(cell)[:60] if cell else "(empty)"}')
        
        # Show first LOCHOKA row if exists
        for row_idx, row in enumerate(table):
            row_str = ' '.join([str(c) for c in row if c])
            if 'LOCHOKA' in row_str:
                print(f'\nFirst LOCHOKA row (row {row_idx}):')
                for i, cell in enumerate(row):
                    print(f'  Col {i}: {str(cell)[:80] if cell else "(empty)"}')
                break

pdf.close()

