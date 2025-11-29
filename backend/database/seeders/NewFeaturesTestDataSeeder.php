<?php

namespace Database\Seeders;

use App\Models\AccountingPeriod;
use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\KycDocument;
use App\Models\Member;
use App\Models\MpesaReconciliationLog;
use App\Models\Payment;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class NewFeaturesTestDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding test data for new features...');

        // Get admin user for approvals
        $adminUser = User::where('email', 'admin@evimeria.com')
            ->orWhere('email', 'admin@evimeria.test')
            ->first();

        if (!$adminUser) {
            $adminUser = User::first();
        }

        if (!$adminUser) {
            $this->command->error('No admin user found. Please ensure RolePermissionSeeder has run.');
            return;
        }

        // Seed KYC test data
        $this->seedKycData($adminUser);

        // Seed MPESA reconciliation test data
        $this->seedMpesaReconciliationData($adminUser);

        // Seed Accounting test data
        $this->seedAccountingData($adminUser);

        $this->command->info('New features test data seeding completed!');
    }

    protected function seedKycData(User $adminUser): void
    {
        $this->command->info('Seeding KYC test data...');

        // Get members that don't have KYC status set or are inactive
        $members = Member::where(function ($query) {
            $query->whereNull('kyc_status')
                ->orWhere('kyc_status', 'pending')
                ->orWhere('is_active', false);
        })->limit(5)->get();

        if ($members->isEmpty()) {
            $members = Member::limit(5)->get();
        }

        $documentTypes = ['national_id', 'passport', 'drivers_license', 'birth_certificate'];
        $statuses = ['pending', 'approved', 'rejected'];

        foreach ($members as $index => $member) {
            // Set KYC status
            $status = $statuses[$index % count($statuses)];
            $member->update([
                'kyc_status' => $status,
                'is_active' => $status === 'approved',
                'kyc_approved_at' => $status === 'approved' ? now()->subDays(rand(1, 30)) : null,
                'kyc_approved_by' => $status === 'approved' ? $adminUser->id : null,
                'activated_at' => $status === 'approved' ? now()->subDays(rand(1, 30)) : null,
                'activated_by' => $status === 'approved' ? $adminUser->id : null,
            ]);

            // Create KYC documents
            $numDocuments = ($index % 3) + 1;
            for ($i = 0; $i < $numDocuments; $i++) {
                $docStatus = in_array($status, ['approved', 'rejected']) ? $status : 'pending';
                KycDocument::updateOrCreate(
                    [
                        'member_id' => $member->id,
                        'document_type' => $documentTypes[$i % count($documentTypes)],
                    ],
                    [
                        'user_id' => $adminUser->id,
                        'file_name' => $documentTypes[$i % count($documentTypes)] . '_' . $member->id . '.pdf',
                        'disk' => 'public',
                        'path' => 'kyc_documents/test_' . Str::uuid() . '.pdf',
                        'status' => $docStatus,
                        'notes' => 'Test document for KYC verification',
                    ]
                );
            }

            // Ensure wallet exists for activated members
            if ($status === 'approved' && !$member->wallet) {
                Wallet::create([
                    'member_id' => $member->id,
                    'balance' => rand(1000, 50000),
                    'locked_balance' => 0,
                ]);
            }
        }

        $this->command->info("Created/Updated KYC data for {$members->count()} members.");
    }

    protected function seedMpesaReconciliationData(User $adminUser): void
    {
        $this->command->info('Seeding MPESA reconciliation test data...');

        // Get members with payments
        $memberIds = Payment::whereNotNull('member_id')
            ->distinct('member_id')
            ->pluck('member_id')
            ->take(5);

        if ($memberIds->isEmpty()) {
            // Create test payments if none exist
            $members = Member::where('is_active', true)->limit(3)->get();
            
            foreach ($members as $member) {
                Payment::create([
                    'member_id' => $member->id,
                    'channel' => 'mpesa',
                    'provider_reference' => 'PAY' . strtoupper(Str::random(7)),
                    'mpesa_transaction_id' => 'TXN' . strtoupper(Str::random(8)),
                    'mpesa_receipt_number' => 'RCP' . strtoupper(Str::random(9)),
                    'amount' => rand(500, 5000),
                    'currency' => 'KES',
                    'status' => 'completed',
                    'reconciliation_status' => 'pending',
                    'payload' => ['test' => true],
                ]);
            }

            $memberIds = Payment::whereNotNull('member_id')
                ->distinct('member_id')
                ->pluck('member_id')
                ->take(5);
        }

        $logStatuses = ['matched', 'unmatched', 'duplicate', 'pending'];
        $paymentStatuses = ['reconciled', 'unmatched', 'duplicate', 'pending'];
        $members = Member::whereIn('id', $memberIds)->get();

        foreach ($members as $index => $member) {
            $payments = Payment::where('member_id', $member->id)
                ->where('channel', 'mpesa')
                ->limit(2)
                ->get();
            
            foreach ($payments as $paymentIndex => $payment) {
                $logStatus = $logStatuses[($index + $paymentIndex) % count($logStatuses)];
                $paymentStatus = $paymentStatuses[($index + $paymentIndex) % count($paymentStatuses)];
                
                // Update payment reconciliation status
                $payment->update([
                    'reconciliation_status' => $paymentStatus,
                    'reconciled_at' => $paymentStatus !== 'pending' ? now()->subDays(rand(1, 30)) : null,
                    'reconciled_by' => $paymentStatus !== 'pending' ? $adminUser->id : null,
                ]);

                // Create reconciliation log
                $transaction = null;
                if ($logStatus === 'matched') {
                    $transaction = Transaction::where('member_id', $member->id)
                        ->where('credit', $payment->amount)
                        ->first();
                }

                MpesaReconciliationLog::updateOrCreate(
                    [
                        'payment_id' => $payment->id,
                    ],
                    [
                        'transaction_id' => $transaction?->id,
                        'status' => $logStatus,
                        'reconciled_at' => $logStatus !== 'pending' ? now()->subDays(rand(1, 30)) : null,
                        'reconciled_by' => $logStatus !== 'pending' ? $adminUser->id : null,
                        'notes' => "Test reconciliation log - Status: {$logStatus}",
                    ]
                );
            }
        }

        $logCount = MpesaReconciliationLog::count();
        $this->command->info("Created/Updated {$logCount} MPESA reconciliation logs.");
    }

    protected function seedAccountingData(User $adminUser): void
    {
        $this->command->info('Seeding Accounting test data...');

        // Create Chart of Accounts
        $accounts = [
            ['code' => '1000', 'name' => 'Assets', 'type' => 'asset', 'parent_id' => null],
            ['code' => '1100', 'name' => 'Cash and Bank', 'type' => 'asset', 'parent_id' => null],
            ['code' => '1101', 'name' => 'Cash on Hand', 'type' => 'asset', 'parent_id' => null],
            ['code' => '1102', 'name' => 'Bank Account', 'type' => 'asset', 'parent_id' => null],
            ['code' => '2000', 'name' => 'Liabilities', 'type' => 'liability', 'parent_id' => null],
            ['code' => '3000', 'name' => 'Equity', 'type' => 'equity', 'parent_id' => null],
            ['code' => '4000', 'name' => 'Revenue', 'type' => 'revenue', 'parent_id' => null],
            ['code' => '4100', 'name' => 'Member Contributions', 'type' => 'revenue', 'parent_id' => null],
            ['code' => '5000', 'name' => 'Expenses', 'type' => 'expense', 'parent_id' => null],
            ['code' => '5100', 'name' => 'Operating Expenses', 'type' => 'expense', 'parent_id' => null],
        ];

        $accountMap = [];
        foreach ($accounts as $accountData) {
            $account = ChartOfAccount::updateOrCreate(
                ['code' => $accountData['code']],
                [
                    'name' => $accountData['name'],
                    'type' => $accountData['type'],
                    'parent_id' => $accountData['parent_id'],
                    'is_active' => true,
                ]
            );
            $accountMap[$accountData['code']] = $account;
        }

        // Create parent-child relationships
        $accountMap['1101']->update(['parent_id' => $accountMap['1100']->id]);
        $accountMap['1102']->update(['parent_id' => $accountMap['1100']->id]);
        $accountMap['1100']->update(['parent_id' => $accountMap['1000']->id]);
        $accountMap['4100']->update(['parent_id' => $accountMap['4000']->id]);
        $accountMap['5100']->update(['parent_id' => $accountMap['5000']->id]);

        // Create accounting period
        $currentYear = date('Y');
        $period = AccountingPeriod::firstOrCreate(
            [
                'period_name' => "{$currentYear} Annual Period",
            ],
            [
                'start_date' => "{$currentYear}-01-01",
                'end_date' => "{$currentYear}-12-31",
                'is_closed' => false,
            ]
        );

        // Create sample journal entries
        $cashAccount = $accountMap['1101'];
        $revenueAccount = $accountMap['4100'];
        $expenseAccount = $accountMap['5100'];
        $bankAccount = $accountMap['1102'];

        // Entry 1: Member Contribution
        $entry1 = JournalEntry::create([
            'entry_number' => 'JE-' . date('Y') . '-001',
            'entry_date' => now()->subDays(5),
            'period_id' => $period->id,
            'description' => 'Member contribution received',
            'reference_type' => 'contribution',
            'reference_id' => 1,
            'created_by' => $adminUser->id,
            'is_posted' => true,
            'posted_at' => now()->subDays(5),
        ]);

        JournalEntryLine::create([
            'journal_entry_id' => $entry1->id,
            'account_id' => $cashAccount->id,
            'debit' => 5000,
            'credit' => 0,
            'description' => 'Cash received',
        ]);

        JournalEntryLine::create([
            'journal_entry_id' => $entry1->id,
            'account_id' => $revenueAccount->id,
            'debit' => 0,
            'credit' => 5000,
            'description' => 'Contribution revenue',
        ]);

        // Entry 2: Operating Expense
        $entry2 = JournalEntry::create([
            'entry_number' => 'JE-' . date('Y') . '-002',
            'entry_date' => now()->subDays(3),
            'period_id' => $period->id,
            'description' => 'Office supplies purchase',
            'reference_type' => 'expense',
            'reference_id' => 1,
            'created_by' => $adminUser->id,
            'is_posted' => true,
            'posted_at' => now()->subDays(3),
        ]);

        JournalEntryLine::create([
            'journal_entry_id' => $entry2->id,
            'account_id' => $expenseAccount->id,
            'debit' => 1500,
            'credit' => 0,
            'description' => 'Office supplies expense',
        ]);

        JournalEntryLine::create([
            'journal_entry_id' => $entry2->id,
            'account_id' => $bankAccount->id,
            'debit' => 0,
            'credit' => 1500,
            'description' => 'Bank payment',
        ]);

        // Entry 3: Draft entry
        $entry3 = JournalEntry::create([
            'entry_number' => 'JE-' . date('Y') . '-003',
            'entry_date' => now(),
            'period_id' => $period->id,
            'description' => 'Draft entry for review',
            'created_by' => $adminUser->id,
            'is_posted' => false,
            'posted_at' => null,
        ]);

        JournalEntryLine::create([
            'journal_entry_id' => $entry3->id,
            'account_id' => $cashAccount->id,
            'debit' => 2000,
            'credit' => 0,
            'description' => 'Cash debit',
        ]);

        JournalEntryLine::create([
            'journal_entry_id' => $entry3->id,
            'account_id' => $revenueAccount->id,
            'debit' => 0,
            'credit' => 2000,
            'description' => 'Revenue credit',
        ]);

        $accountCount = ChartOfAccount::count();
        $entryCount = JournalEntry::count();
        
        $this->command->info("Created/Updated {$accountCount} chart of accounts and {$entryCount} journal entries.");
    }
}

