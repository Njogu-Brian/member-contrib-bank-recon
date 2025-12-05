<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 CHECKING DUPLICATE DETECTION SOURCES\n\n";

echo "STATEMENTS:\n";
$statements = \App\Models\BankStatement::all();
foreach ($statements as $s) {
    echo "  ID {$s->id}: {$s->filename}\n";
    echo "    Txns: {$s->transactions()->count()} | Dupes: {$s->duplicates()->count()}\n";
}

echo "\nCHECKING FOR DUPLICATES BY STATUS:\n";
$dupByStatus = \App\Models\Transaction::where('assignment_status', 'duplicate')->count();
echo "  Transactions with assignment_status='duplicate': {$dupByStatus}\n";

echo "\nCHECKING statement_duplicates TABLE:\n";
$dupRecords = \App\Models\StatementDuplicate::count();
echo "  Records in statement_duplicates: {$dupRecords}\n";

if ($dupRecords > 0) {
    echo "\n  Sample duplicates:\n";
    $samples = \App\Models\StatementDuplicate::take(5)->get();
    foreach ($samples as $dup) {
        echo "    - Statement {$dup->bank_statement_id}: {$dup->duplicate_reason} | Credit: {$dup->credit}\n";
    }
}

echo "\n🔍 CHECKING FOR OBSERVER/EVENT LISTENERS:\n";
$observers = glob(__DIR__ . '/app/Observers/*Observer.php');
foreach ($observers as $obs) {
    $name = basename($obs);
    echo "  Found: {$name}\n";
}

