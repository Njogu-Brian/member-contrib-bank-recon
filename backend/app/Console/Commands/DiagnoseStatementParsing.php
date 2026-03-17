<?php

namespace App\Console\Commands;

use App\Models\BankStatement;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DiagnoseStatementParsing extends Command
{
    protected $signature = 'diagnose:statement-parsing';
    protected $description = 'Diagnose why statement parsing may not be working (queue, Python, etc.)';

    public function handle(): int
    {
        $this->info('=== Statement Parsing Diagnostic ===');
        $this->newLine();

        // 1. Queue connection
        $queueDriver = config('queue.default');
        $this->info('1. Queue connection: ' . $queueDriver);
        if ($queueDriver === 'database') {
            $this->warn('   → Jobs are queued. You need "php artisan queue:work" running, OR set QUEUE_CONNECTION=sync in .env');
        } else {
            $this->info('   → OK: Jobs run immediately (no worker needed)');
        }
        $this->newLine();

        // 2. Pending jobs
        $pending = 0;
        try {
            $pending = DB::table('jobs')->count();
            $failed = DB::table('failed_jobs')->count();
            $this->info("2. Pending jobs: {$pending} | Failed jobs: {$failed}");
            if ($pending > 0) {
                $this->warn('   → Jobs are waiting. Run: php artisan queue:work --once (or set QUEUE_CONNECTION=sync)');
            }
        } catch (\Throwable $e) {
            $this->error('   Could not check jobs table: ' . $e->getMessage());
        }
        $this->newLine();

        // 3. Python
        $pythonPath = env('PYTHON_PATH', 'python3');
        $scriptPath = base_path('../ocr-parser/parse_pdf.py');
        $scriptPath = is_file($scriptPath) ? realpath($scriptPath) : $scriptPath;
        $this->info("3. Python path: {$pythonPath}");
        $this->info("   Parser script: {$scriptPath}");
        if (!is_file($scriptPath)) {
            $this->error('   → Parser script NOT found. Expected at: ' . base_path('../ocr-parser/parse_pdf.py'));
        } else {
            $this->info('   → Parser script exists');
        }
        $this->newLine();

        // 4. proc_open
        $disabled = explode(',', ini_get('disable_functions'));
        $disabled = array_map('trim', $disabled);
        if (in_array('proc_open', $disabled)) {
            $this->error('4. proc_open is DISABLED in PHP. Statement parsing will fail. Contact your host.');
        } else {
            $this->info('4. proc_open: OK (enabled)');
        }
        $this->newLine();

        // 5. Recent statements
        try {
            $statements = BankStatement::orderBy('id', 'desc')->take(5)->get(['id', 'filename', 'status', 'error_message', 'created_at']);
            $this->info('5. Last 5 statements:');
            foreach ($statements as $s) {
                $err = $s->error_message ? ' | Error: ' . substr($s->error_message, 0, 60) : '';
                $this->line("   ID {$s->id} | {$s->status} | {$s->filename} | {$s->created_at}{$err}");
            }
            $uploaded = BankStatement::where('status', 'uploaded')->count();
            if ($uploaded > 0) {
                $this->warn("   → {$uploaded} statement(s) stuck at 'uploaded' - processing never ran");
            }
        } catch (\Throwable $e) {
            $this->error('   Could not fetch statements: ' . $e->getMessage());
        }
        $this->newLine();

        // 6. Laravel log
        $logPath = storage_path('logs/laravel.log');
        if (is_file($logPath)) {
            $lines = array_slice(file($logPath), -50);
            $relevant = array_filter($lines, fn($l) => str_contains($l, 'OCR') || str_contains($l, 'ProcessBankStatement') || str_contains($l, 'parsePdf') || str_contains($l, 'statement'));
            if (!empty($relevant)) {
                $this->info('6. Recent log entries (OCR/statement):');
                foreach (array_slice($relevant, -10) as $line) {
                    $this->line('   ' . trim($line));
                }
            } else {
                $this->info('6. No recent OCR/statement entries in log');
            }
        } else {
            $this->info('6. Log file not found');
        }
        $this->newLine();

        $this->info('=== Recommendations ===');
        if ($queueDriver === 'database' && $pending > 0) {
            $this->line('• Add to crontab (runs every minute, processes 1 job):');
            $this->line('  * * * * * cd ' . base_path() . ' && php artisan queue:work --once >> storage/logs/queue-cron.log 2>&1');
            $this->newLine();
            $this->line('• Or set QUEUE_CONNECTION=sync in .env and run: php artisan config:clear');
        }

        return 0;
    }
}
