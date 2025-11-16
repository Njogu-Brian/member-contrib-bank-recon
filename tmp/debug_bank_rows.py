import pdfplumber
from pathlib import Path

pdf_path = Path(r"D:\Projects\Evimeria_System\backend\storage\app\statements\statements\1762965105_30.10.2024-27-10-2025 (1).pdf")
page_number = 3  # zero-based index? We'll iterate

with pdfplumber.open(pdf_path) as pdf:
    for page_index, page in enumerate(pdf.pages):
        tables = page.extract_tables()
        if not tables:
            continue
        print(f"-- Page {page_index+1} tables: {len(tables)}")
        for table_index, table in enumerate(tables):
            print(f"Table {table_index} rows: {len(table)}")
            for row in table[:8]:
                print(row)
            print('-'*40)
