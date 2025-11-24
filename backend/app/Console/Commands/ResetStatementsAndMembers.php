<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class ResetStatementsAndMembers extends Command
{
    protected $signature = 'evimeria:reset-members-statements {--force : Skip confirmation prompt}';

    protected $description = 'Delete all bank statements, transactions, and member records so fresh uploads can be imported';

    public function handle(): int
    {
        if (! $this->option('force') && ! $this->confirm('This will DELETE all statements, transactions, and member records. Continue?')) {
            $this->comment('Reset aborted.');
            return self::SUCCESS;
        }

        $tables = [
            'transactions',
            'statement_duplicates',
            'bank_statements',
            'member_profiles',
            'members',
            'member_documents',
            'member_notes',
            'wallet_transactions',
            'wallets',
            'contributions',
        ];

        $this->withForeignKeysDisabled(function () use ($tables) {
            foreach ($tables as $table) {
                if (! Schema::hasTable($table)) {
                    $this->warn("Skipping {$table} (table not found)");
                    continue;
                }

                DB::table($table)->truncate();
                $this->line("Truncated {$table}");
            }
        });

        $this->purgeStatementFiles();

        $this->info('Member and statement data reset complete.');
        return self::SUCCESS;
    }

    protected function purgeStatementFiles(): void
    {
        $disk = Storage::disk('local');

        foreach (['statements', 'statements/statements', 'public/statements'] as $directory) {
            if ($disk->exists($directory)) {
                $disk->deleteDirectory($directory);
                $this->line("Deleted storage/app/{$directory}");
            }
        }
    }

    protected function withForeignKeysDisabled(callable $callback): void
    {
        $connection = DB::connection();
        $driver = $connection->getDriverName();

        $disable = fn () => null;
        $enable = fn () => null;

        if ($driver === 'mysql') {
            $disable = fn () => $connection->statement('SET FOREIGN_KEY_CHECKS=0');
            $enable = fn () => $connection->statement('SET FOREIGN_KEY_CHECKS=1');
        } elseif ($driver === 'sqlite') {
            $disable = fn () => $connection->statement('PRAGMA foreign_keys = OFF');
            $enable = fn () => $connection->statement('PRAGMA foreign_keys = ON');
        } elseif ($driver === 'pgsql') {
            $disable = fn () => $connection->statement('SET session_replication_role = replica');
            $enable = fn () => $connection->statement('SET session_replication_role = DEFAULT');
        }

        $disable();

        try {
            $callback();
        } finally {
            $enable();
        }
    }
}

