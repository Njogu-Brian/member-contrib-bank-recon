<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';

$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\BankStatement;
use App\Jobs\ProcessBankStatement;
use Illuminate\Support\Facades\DB;

$ids = $argv;
array_shift($ids); // remove script name

if (empty($ids)) {
    $ids = BankStatement::pluck('id')->toArray();
}

$count = 0;
foreach ($ids as $id) {
    $statement = BankStatement::find($id);
    if (!$statement) {
        echo "Statement {$id} not found" . PHP_EOL;
        continue;
    }

    $statement->transactions()->delete();
    $statement->duplicates()->delete();

    DB::table('bank_statements')
        ->where('id', $statement->id)
        ->update([
            'status' => 'uploaded',
            'error_message' => null,
            'raw_metadata' => null,
        ]);

    $statement->refresh();
    ProcessBankStatement::dispatch($statement);
    $count++;
    echo "Queued statement {$statement->id}" . PHP_EOL;
}

echo "Re-queued {$count} statement(s)" . PHP_EOL;

