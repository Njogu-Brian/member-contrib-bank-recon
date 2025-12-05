<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$stmts = \App\Models\BankStatement::all();
echo "Statements in database:\n";
foreach($stmts as $s) {
    echo "  ID {$s->id}: {$s->filename} | Status: {$s->status}\n";
}
echo "\nTotal: {$stmts->count()} statements\n";

