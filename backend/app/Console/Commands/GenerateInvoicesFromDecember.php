<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;

class GenerateInvoicesFromDecember extends Command
{
    protected $signature = 'invoices:generate-from-december
                            {--year= : Use this year for 1st December (default: current year)}
                            {--dry-run : Show what would be generated without creating}';
    protected $description = 'Generate weekly invoices from 1st December to now; skips any week that already has invoices';

    public function handle()
    {
        $year = $this->option('year')
            ? (int) $this->option('year')
            : Carbon::now()->year;

        $fromDate = Carbon::createFromDate($year, 12, 1)->startOfDay();
        $toDate = Carbon::now();

        if ($fromDate->isFuture()) {
            $this->warn('1st December ' . $year . ' is in the future. Using 1st December ' . ($year - 1));
            $fromDate = Carbon::createFromDate($year - 1, 12, 1)->startOfDay();
        }

        $this->info("Generating weekly invoices from {$fromDate->format('M d, Y')} to {$toDate->format('M d, Y')}");
        $this->info('Weeks that already have invoices for a member will be skipped.');
        if ($this->option('dry-run')) {
            $this->info('DRY RUN – no invoices will be created.');
        }
        $this->newLine();

        $options = [
            '--from' => $fromDate->format('Y-m-d'),
            '--to'   => $toDate->format('Y-m-d'),
        ];
        if ($this->option('dry-run')) {
            $options['--dry-run'] = true;
        }

        return $this->call('invoices:backfill', $options);
    }
}
