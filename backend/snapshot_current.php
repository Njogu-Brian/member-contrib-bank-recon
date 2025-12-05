<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$statements = \App\Models\BankStatement::where('status', 'completed')->orderBy('id')->get();

$snapshot = [];
foreach ($statements as $stmt) {
    $transactions = $stmt->transactions()
        ->select('id', 'tran_date', 'particulars', 'credit', 'debit', 'transaction_code')
        ->orderBy('id')
        ->get();
    
    $snapshot[] = [
        'statement_id' => $stmt->id,
        'filename' => $stmt->filename,
        'transaction_count' => $transactions->count(),
        'duplicate_count' => $stmt->duplicates()->count(),
        'total_credits' => $transactions->sum('credit'),
        'sample_transactions' => $transactions->take(5)->map(function($t) {
            return [
                'id' => $t->id,
                'date' => $t->tran_date,
                'particulars_length' => strlen($t->particulars),
                'particulars_preview' => substr($t->particulars, 0, 60),
                'credit' => $t->credit,
                'code' => $t->transaction_code
            ];
        })
    ];
}

file_put_contents('snapshot_before_reparse.json', json_encode($snapshot, JSON_PRETTY_PRINT));

echo "Snapshot saved to snapshot_before_reparse.json\n";
echo "Total Statements: " . count($snapshot) . "\n";
echo "Total Transactions: " . array_sum(array_column($snapshot, 'transaction_count')) . "\n";

