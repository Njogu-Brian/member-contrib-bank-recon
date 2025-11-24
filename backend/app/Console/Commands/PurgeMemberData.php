<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PurgeMemberData extends Command
{
    protected $signature = 'evimeria:purge-members {--force : Skip confirmation prompt}';

    protected $description = 'Remove all member records plus dependent transactions/contributions so fresh data can be imported.';

    public function handle(): int
    {
        if (!$this->option('force')) {
            $confirmed = $this->confirm(
                'This will permanently delete members, transactions, wallets, contributions and related records. Continue?'
            );

            if (!$confirmed) {
                $this->warn('Aborted. No records were deleted.');
                return self::SUCCESS;
            }
        }

        $tables = [
            'roi_calculations',
            'investment_payouts',
            'investments',
            'payment_receipts',
            'payment_penalties',
            'payments',
            'transaction_splits',
            'transaction_match_logs',
            'manual_contributions',
            'contributions',
            'wallets',
            'transactions',
            'expense_members',
            'members',
        ];

        DB::beginTransaction();

        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');

            foreach ($tables as $table) {
                if (!DB::getSchemaBuilder()->hasTable($table)) {
                    $this->line("Skipping {$table} (table missing)");
                    continue;
                }

                DB::table($table)->truncate();
                $this->line("Truncated {$table}");
            }

            DB::statement('SET FOREIGN_KEY_CHECKS=1');
            DB::commit();

            $this->info('Member data cleared successfully.');
            return self::SUCCESS;
        } catch (\Throwable $e) {
            DB::rollBack();
            DB::statement('SET FOREIGN_KEY_CHECKS=1');

            $this->error('Failed to purge member data: ' . $e->getMessage());
            $this->line($e->getTraceAsString());

            return self::FAILURE;
        }
    }
}

