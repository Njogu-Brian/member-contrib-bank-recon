<?php

namespace App\Console\Commands;

use App\Models\Transaction;
use Illuminate\Console\Command;

class DeleteDebitTransactions extends Command
{
    protected $signature = 'transactions:delete-debits';
    protected $description = 'Delete all debit transactions (credit = 0, debit > 0)';

    public function handle()
    {
        $this->info('Deleting debit transactions...');
        
        $count = Transaction::where('credit', 0)
            ->where('debit', '>', 0)
            ->count();
        
        if ($count > 0) {
            Transaction::where('credit', 0)
                ->where('debit', '>', 0)
                ->delete();
            
            $this->info("Deleted {$count} debit transactions.");
        } else {
            $this->info('No debit transactions found.');
        }
        
        return 0;
    }
}

