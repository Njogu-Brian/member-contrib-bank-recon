<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$statement = \App\Models\BankStatement::latest()->first();

if (!$statement) {
    echo "No statements found\n";
    exit(1);
}

echo "Statement ID: {$statement->id}\n";
echo "Status: {$statement->status}\n";
echo "Transactions: " . $statement->transactions()->count() . "\n";

if ($statement->error_message) {
    echo "Error: {$statement->error_message}\n";
}

// Check if there are pending jobs
$pendingJobs = \Illuminate\Support\Facades\DB::table('jobs')->count();
echo "Pending jobs: {$pendingJobs}\n";

if ($statement->status === 'uploaded' || $statement->status === 'processing') {
    echo "\nProcessing job manually...\n";
    try {
        $job = new \App\Jobs\ProcessBankStatement($statement);
        $job->handle(
            app(\App\Services\OcrParserService::class),
            app(\App\Services\MatchingService::class)
        );
        echo "Job completed successfully!\n";
        $statement->refresh();
        echo "New status: {$statement->status}\n";
        echo "Transactions: " . $statement->transactions()->count() . "\n";
    } catch (\Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
        echo "Trace: " . $e->getTraceAsString() . "\n";
    }
}

