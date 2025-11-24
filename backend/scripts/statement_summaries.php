<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';

$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$summary = DB::table('transactions')
    ->selectRaw('bank_statement_id, COUNT(*) as txn_count, SUM(credit) as total_credit, SUM(CASE WHEN assignment_status = "duplicate" THEN 1 ELSE 0 END) as duplicates')
    ->groupBy('bank_statement_id')
    ->orderBy('bank_statement_id')
    ->get();

echo $summary->toJson(JSON_PRETTY_PRINT) . PHP_EOL;

