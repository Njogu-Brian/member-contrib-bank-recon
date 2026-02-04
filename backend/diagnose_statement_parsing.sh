#!/bin/bash
# Run this on the server after SSH: bash diagnose_statement_parsing.sh
# Or: ssh -p 1980 royalce1@breysomsolutions.co.ke "cd ~/laravel-app/evimeria/backend && bash diagnose_statement_parsing.sh"

set -e
cd "$(dirname "$0")"
EVIMERIA_ROOT="$(cd .. && pwd)"
BACKEND="$EVIMERIA_ROOT/backend"
# If run from backend/
if [ ! -f artisan ]; then
  BACKEND="$(pwd)"
  EVIMERIA_ROOT="$(dirname "$BACKEND")"
fi
cd "$BACKEND"

echo "=============================================="
echo "Statement parsing diagnostic"
echo "=============================================="
echo "Backend: $BACKEND"
echo "Project root: $EVIMERIA_ROOT"
echo ""

echo "--- 1. Queue worker process ---"
if pgrep -f "artisan.*queue:work" >/dev/null; then
  echo "OK: Queue worker is running"
  ps aux | grep -E "artisan.*queue" | grep -v grep || true
else
  echo "WARNING: No 'php artisan queue:work' process found. Statements are processed by this job."
  echo "  Start with: cd $BACKEND && nohup php artisan queue:work >> storage/logs/queue-worker.log 2>&1 &"
fi
echo ""

echo "--- 2. QUEUE_CONNECTION ---"
grep -E "^QUEUE_CONNECTION=" .env 2>/dev/null || echo "(not set in .env, default is database)"
echo ""

echo "--- 3. Pending jobs in database ---"
php artisan tinker --execute="echo 'Pending: ' . \DB::table('jobs')->count() . \"\n\"; echo 'Failed: ' . \DB::table('failed_jobs')->count() . \"\n\";" 2>/dev/null || echo "(tinker failed)"
echo ""

echo "--- 4. Python and parser script ---"
PYTHON_PATH="${PYTHON_PATH:-python3}"
if command -v python3 &>/dev/null; then
  echo "python3: $(python3 --version 2>&1)"
elif command -v python &>/dev/null; then
  echo "python: $(python --version 2>&1)"
  PYTHON_PATH="python"
else
  echo "WARNING: Neither python3 nor python found. Parser will fail."
fi
PARSER_SCRIPT="$EVIMERIA_ROOT/ocr-parser/parse_pdf.py"
if [ -f "$PARSER_SCRIPT" ]; then
  echo "OK: Parser script exists: $PARSER_SCRIPT"
else
  echo "ERROR: Parser script NOT found: $PARSER_SCRIPT"
  echo "  OcrParserService expects: backend/../ocr-parser/parse_pdf.py"
fi
echo ""

echo "--- 5. pdfplumber (required by parser) ---"
$PYTHON_PATH -c "import pdfplumber; print('OK: pdfplumber')" 2>/dev/null || echo "WARNING: pdfplumber not installed. Run: pip install pdfplumber"
echo ""

echo "--- 6. Statements storage ---"
STATEMENTS_ROOT="$BACKEND/storage/app/statements"
if [ -d "$STATEMENTS_ROOT" ]; then
  echo "OK: Statements dir exists: $STATEMENTS_ROOT"
  echo "    Files: $(find "$STATEMENTS_ROOT" -type f -name "*.pdf" 2>/dev/null | wc -l) PDF(s)"
else
  echo "WARNING: Statements directory not found: $STATEMENTS_ROOT"
fi
echo ""

echo "--- 7. Recent Laravel log (OCR / statement / ProcessBankStatement) ---"
LOG_FILE="$BACKEND/storage/logs/laravel.log"
if [ -f "$LOG_FILE" ]; then
  grep -E "OCR parser|ProcessBankStatement|statement|parsePdf|parse_pdf" "$LOG_FILE" 2>/dev/null | tail -30 || echo "(no matching lines)"
else
  echo "Log file not found: $LOG_FILE"
fi
echo ""

echo "--- 8. Last 5 bank statements (status) ---"
php artisan tinker --execute="
\$s = \App\Models\BankStatement::orderBy('id','desc')->take(5)->get(['id','filename','status','created_at','raw_metadata']);
foreach(\$s as \$r) { echo \$r->id . ' | ' . \$r->status . ' | ' . substr(\$r->filename,0,50) . ' | ' . \$r->created_at . \"\n\"; }
" 2>/dev/null || echo "(tinker failed)"
echo ""

echo "--- 9. Manual parser test (first PDF in storage) ---"
FIRST_PDF="$(find "$STATEMENTS_ROOT" -type f -name "*.pdf" 2>/dev/null | head -1)"
if [ -n "$FIRST_PDF" ] && [ -f "$PARSER_SCRIPT" ]; then
  echo "Running: $PYTHON_PATH $PARSER_SCRIPT \"$FIRST_PDF\" --output /tmp/parser_test.json"
  if $PYTHON_PATH "$PARSER_SCRIPT" "$FIRST_PDF" --output /tmp/parser_test.json 2>/tmp/parser_test.err; then
    COUNT=$(grep -o '"tran_date"' /tmp/parser_test.json 2>/dev/null | wc -l)
    echo "OK: Parser ran successfully. Transaction lines in output: $COUNT"
    rm -f /tmp/parser_test.json /tmp/parser_test.err
  else
    echo "Parser failed. Stderr:"
    cat /tmp/parser_test.err 2>/dev/null || true
  fi
else
  echo "Skipped (no PDF or no parser script)"
fi
echo ""

echo "=============================================="
echo "Done. Fix any ERROR/WARNING above."
echo "=============================================="
