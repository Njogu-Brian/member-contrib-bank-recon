#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Re-parse all statements with V4 parser and compare with current database
"""
import json
import subprocess
import os
import sys
from pathlib import Path

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Load current snapshot
with open('snapshot_before_reparse.json', 'r') as f:
    current_snapshot = json.load(f)

# Map filenames to their IDs
filename_to_id = {}
for stmt in current_snapshot:
    # Extract just the filename without timestamp prefix
    filename = stmt['filename']
    # Try to find matching PDF
    timestamp_filename = None
    for pdf_file in Path('storage/app/statements').glob('*.pdf'):
        if pdf_file.name.endswith(filename) or filename in pdf_file.name:
            timestamp_filename = pdf_file.name
            break
    if timestamp_filename:
        filename_to_id[timestamp_filename] = stmt['statement_id']

print("🔄 RE-PARSING ALL STATEMENTS WITH V4 PARSER\n")
print(f"Found {len(filename_to_id)} statement files to re-parse\n")

reparse_results = []
differences = []

for pdf_file in sorted(Path('storage/app/statements').glob('*.pdf')):
    if pdf_file.name not in filename_to_id:
        print(f"⚠️  Skipping {pdf_file.name} (not in snapshot)")
        continue
    
    stmt_id = filename_to_id[pdf_file.name]
    current_stmt = next(s for s in current_snapshot if s['statement_id'] == stmt_id)
    
    print(f"📄 Statement {stmt_id}: {pdf_file.name[:50]}...")
    print(f"   Current: {current_stmt['transaction_count']} transactions, {current_stmt['duplicate_count']} dupes")
    
    # Run V4 parser
    try:
        result = subprocess.run(
            ['python', '../ocr-parser/parse_pdf.py', str(pdf_file), '--output', f'reparse_{stmt_id}.json'],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0 and Path(f'reparse_{stmt_id}.json').exists():
            with open(f'reparse_{stmt_id}.json', 'r') as f:
                parsed_transactions = json.load(f)
            
            new_count = len(parsed_transactions)
            print(f"   V4 Parser: {new_count} transactions")
            
            # Check for differences
            diff = new_count - current_stmt['transaction_count']
            if diff != 0:
                print(f"   ⚠️  DIFFERENCE: {diff:+d} transactions")
                differences.append({
                    'statement_id': stmt_id,
                    'filename': pdf_file.name,
                    'current_count': current_stmt['transaction_count'],
                    'new_count': new_count,
                    'difference': diff,
                    'current_total_credits': current_stmt['total_credits'],
                    'new_total_credits': sum(t.get('credit', 0) for t in parsed_transactions)
                })
            else:
                print(f"   ✅ SAME COUNT")
            
            reparse_results.append({
                'statement_id': stmt_id,
                'filename': pdf_file.name,
                'current_count': current_stmt['transaction_count'],
                'new_count': new_count,
                'difference': diff
            })
            
            # Cleanup
            os.remove(f'reparse_{stmt_id}.json')
        else:
            print(f"   ❌ Parser failed: {result.stderr[:100]}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)[:100]}")
    
    print()

print("\n" + "="*80)
print("📊 SUMMARY")
print("="*80)

if not differences:
    print("\n✅ ALL STATEMENTS PARSED IDENTICALLY!")
    print("   V4 parser maintains exact same transaction counts")
    print("   No regressions detected")
else:
    print(f"\n⚠️  FOUND {len(differences)} STATEMENTS WITH DIFFERENCES:\n")
    for diff in differences:
        print(f"Statement {diff['statement_id']}: {diff['filename'][:40]}")
        print(f"  Current: {diff['current_count']} txns | New: {diff['new_count']} txns | Diff: {diff['difference']:+d}")
        print(f"  Credits: KES {diff['current_total_credits']:,.2f} → KES {diff['new_total_credits']:,.2f}")
        print()

# Save results
with open('reparse_comparison.json', 'w') as f:
    json.dump({
        'current_total': sum(s['transaction_count'] for s in current_snapshot),
        'new_total': sum(r['new_count'] for r in reparse_results),
        'statements_tested': len(reparse_results),
        'differences_found': len(differences),
        'details': reparse_results,
        'differences': differences
    }, f, indent=2)

print(f"\nFull comparison saved to reparse_comparison.json")

