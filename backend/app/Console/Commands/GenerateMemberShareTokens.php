<?php

namespace App\Console\Commands;

use App\Models\Member;
use Illuminate\Console\Command;

class GenerateMemberShareTokens extends Command
{
    protected $signature = 'members:generate-share-tokens {--dry-run : Show what would be updated without making changes}';

    protected $description = 'Generate public share/registration tokens for members that are missing them';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $members = Member::whereNull('public_share_token')->get();

        if ($members->isEmpty()) {
            $this->info('All members already have public share tokens.');
            return self::SUCCESS;
        }

        $this->info("Found {$members->count()} member(s) without public share tokens.");

        if ($dryRun) {
            $this->warn('Dry run - no changes will be made.');
            foreach ($members as $m) {
                $this->line("  - Member #{$m->id}: {$m->name}");
            }
            return self::SUCCESS;
        }

        $bar = $this->output->createProgressBar($members->count());
        $bar->start();

        foreach ($members as $member) {
            $member->getPublicShareToken();
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Generated tokens for {$members->count()} member(s).");

        return self::SUCCESS;
    }
}
