# Fixtures

This directory contains sample files for testing.

## Files

- `sample_members.csv` - Sample member data for bulk upload
- `sample_statement.pdf` - Sample bank statement PDF (add your own sanitized PDF here)

## Usage

1. **Sample Members CSV**: Use this for testing bulk member upload
   - Format: `name,phone,email,member_code`
   - Upload via Members page in the frontend

2. **Sample Statement PDF**: 
   - Add a sanitized bank statement PDF here for testing
   - Should contain transaction rows with dates, particulars, credits, debits, and balances
   - Upload via Upload page in the frontend

## Note

- Replace `sample_statement.pdf` with your own sanitized test PDF
- Ensure PDFs don't contain sensitive real data
- Use test data only

