<?php

namespace Database\Seeders;

use App\Models\AnalyticsSnapshot;
use App\Models\Announcement;
use App\Models\AuditLog;
use App\Models\AuditRow;
use App\Models\AuditRun;
use App\Models\BankStatement;
use App\Models\Budget;
use App\Models\BudgetMonth;
use App\Models\Contribution;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Investment;
use App\Models\InvestmentPayout;
use App\Models\ManualContribution;
use App\Models\Meeting;
use App\Models\MeetingAttendanceUpload;
use App\Models\Member;
use App\Models\Motion;
use App\Models\NotificationLog;
use App\Models\NotificationPreference;
use App\Models\Payment;
use App\Models\PaymentReceipt;
use App\Models\ReportExport;
use App\Models\Role;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Vote;
use App\Models\Wallet;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class DemoSeeder extends Seeder
{
    protected User $adminUser;
    protected User $treasurerUser;
    protected User $memberUser;

    public function run(): void
    {
        DB::transaction(function () {
            $this->seedRolesAndUsers();
            $this->seedSettings();
            $statements = $this->seedStatements();
            [$members, $transactions] = $this->seedMembersAndWallets($statements);
            $this->seedBudgetsAndExpenses($transactions);
            $this->seedAnnouncementsAndNotifications();
            $this->seedMeetings();
            $this->seedInvestments($members);
            $this->seedReportsAndAnalytics();
            $this->seedAuditRun($members);
            $this->seedAuditTrail($members);
        });
    }

    protected function seedRolesAndUsers(): void
    {
        $roles = collect([
            ['name' => 'Administrator', 'slug' => 'admin', 'description' => 'Full system access'],
            ['name' => 'Treasurer', 'slug' => 'treasurer', 'description' => 'Finance and approvals'],
            ['name' => 'Member', 'slug' => 'member', 'description' => 'Standard member access'],
        ])->mapWithKeys(function (array $role) {
            $model = Role::updateOrCreate(
                ['slug' => $role['slug']],
                ['name' => $role['name'], 'description' => $role['description']]
            );

            return [$role['slug'] => $model];
        });

        $this->adminUser = User::updateOrCreate(
            ['email' => 'admin@evimeria.test'],
            [
                'name' => 'System Admin',
                'password' => Hash::make('Password!23'),
                'is_active' => true,
            ]
        );
        $this->adminUser->roles()->syncWithoutDetaching($roles['admin']);
        $this->ensureProfile($this->adminUser, 'approved', 4);

        $this->treasurerUser = User::updateOrCreate(
            ['email' => 'treasurer@evimeria.test'],
            [
                'name' => 'Treasurer Jane',
                'password' => Hash::make('Password!23'),
                'is_active' => true,
            ]
        );
        $this->treasurerUser->roles()->syncWithoutDetaching($roles['treasurer']);
        $this->ensureProfile($this->treasurerUser, 'in_review', 3);

        $this->memberUser = User::updateOrCreate(
            ['email' => 'member@evimeria.test'],
            [
                'name' => 'Member Joe',
                'password' => Hash::make('Password!23'),
                'is_active' => true,
            ]
        );
        $this->memberUser->roles()->syncWithoutDetaching($roles['member']);
        $this->ensureProfile($this->memberUser, 'pending', 2);
    }

    protected function ensureProfile(User $user, string $status, int $step): void
    {
        $user->profile()->updateOrCreate(
            [],
            [
                'kyc_status' => $status,
                'current_step' => $step,
                'national_id' => (string) fake()->numerify('2########'),
                'phone' => fake()->phoneNumber(),
                'address' => fake()->address(),
                'date_of_birth' => fake()->date(),
                'metadata' => ['seeded' => true],
                'kyc_verified_at' => $status === 'approved' ? now()->subDays(5) : null,
            ]
        );
    }

    protected function seedSettings(): void
    {
        Setting::set('contribution_start_date', now()->subMonths(18)->toDateString());
        Setting::set('weekly_contribution_amount', 1500);
        Setting::set('default_currency', 'KES');
        Setting::set('late_payment_penalty', 250);
    }

    protected function seedStatements(): Collection
    {
        return collect(range(1, 3))->map(function (int $index) {
            $date = Carbon::now()->subMonths($index);
            $filename = "statement-{$date->format('Y-m')}.pdf";
            $relativePath = "statements/{$filename}";

            $statement = BankStatement::updateOrCreate(
                ['file_hash' => "seed-statement-{$index}"],
                [
                    'filename' => $filename,
                    'file_path' => $relativePath,
                    'statement_date' => $date,
                    'account_number' => '001234567890',
                    'status' => 'completed',
                    'raw_metadata' => [
                        'seeded' => true,
                        'generated_by' => 'DemoSeeder',
                        'month' => $date->format('F Y'),
                    ],
                ]
            );

            $this->ensureStatementFileExists($relativePath);

            return $statement;
        });
    }

    /**
     * @return array{Members: \Illuminate\Support\Collection, Transactions: \Illuminate\Support\Collection}
     */
    protected function seedMembersAndWallets(Collection $statements): array
    {
        $members = Member::factory()->count(20)->create();
        $transactions = collect();

        foreach ($members as $index => $member) {
            $wallet = Wallet::updateOrCreate(
                ['member_id' => $member->id],
                ['balance' => 0, 'locked_balance' => 0]
            );

            $balance = 0;
            for ($i = 0; $i < 3; $i++) {
                $amount = fake()->numberBetween(800, 3500);
                $balance += $amount;
                $contribution = Contribution::create([
                    'wallet_id' => $wallet->id,
                    'member_id' => $member->id,
                    'amount' => $amount,
                    'source' => fake()->randomElement(['mpesa', 'bank']),
                    'reference' => Str::upper(Str::random(8)),
                    'contributed_at' => now()->subWeeks($i + random_int(1, 6)),
                    'status' => 'cleared',
                    'metadata' => ['seeded' => true],
                ]);

                $payment = Payment::create([
                    'contribution_id' => $contribution->id,
                    'member_id' => $member->id,
                    'channel' => $contribution->source === 'mpesa' ? 'mpesa' : 'bank',
                    'provider_reference' => 'PAY' . Str::upper(Str::random(7)),
                    'amount' => $amount,
                    'currency' => 'KES',
                    'status' => 'completed',
                    'payload' => ['seeded' => true],
                ]);

                PaymentReceipt::create([
                    'payment_id' => $payment->id,
                    'file_name' => "receipt-{$payment->id}.pdf",
                    'disk' => 'public',
                    'path' => "receipts/receipt-{$payment->id}.pdf",
                    'qr_code_path' => "receipts/receipt-{$payment->id}.png",
                ]);
            }

            ManualContribution::create([
                'member_id' => $member->id,
                'amount' => fake()->numberBetween(500, 2000),
                'contribution_date' => now()->subWeeks(random_int(2, 10)),
                'payment_method' => 'cash',
                'notes' => 'Seeded manual entry',
                'created_by' => $this->adminUser->id,
            ]);

            $wallet->update([
                'balance' => $balance,
                'locked_balance' => fake()->numberBetween(0, 300),
            ]);

            $statement = $statements[$index % $statements->count()];
            $amount = fake()->numberBetween(1200, 5000);
            $transaction = Transaction::create([
                'bank_statement_id' => $statement->id,
                'tran_date' => now()->subDays(random_int(5, 120)),
                'value_date' => now()->subDays(random_int(3, 90)),
                'particulars' => "Contribution from {$member->name}",
                'transaction_type' => 'credit',
                'credit' => $amount,
                'debit' => 0,
                'balance' => $amount + fake()->numberBetween(1000, 5000),
                'transaction_code' => Str::upper(Str::random(10)),
                'phones' => [$member->phone],
                'row_hash' => (string) Str::uuid(),
                'member_id' => $member->id,
                'assignment_status' => 'manual_assigned',
                'match_confidence' => 0.95,
                'raw_text' => "Seeded transaction for {$member->member_code}",
                'raw_json' => ['seeded' => true],
                'is_archived' => false,
            ]);

            $transactions->push($transaction);
        }

        return [$members, $transactions];
    }

    protected function seedBudgetsAndExpenses(Collection $transactions): void
    {
        $category = ExpenseCategory::updateOrCreate(
            ['code' => 'OPS'],
            ['name' => 'Operations']
        );

        $budget = Budget::updateOrCreate(
            ['name' => 'Operating Budget', 'year' => now()->year],
            ['total_amount' => 250_000]
        );

        $months = collect([now()->month, now()->subMonth()->month, now()->subMonths(2)->month])->map(function (int $month) use ($budget) {
            return BudgetMonth::updateOrCreate(
                ['budget_id' => $budget->id, 'month' => $month],
                [
                    'planned_amount' => 20_000,
                    'actual_amount' => fake()->numberBetween(12_000, 18_000),
                ]
            );
        });

        $transactions->take(6)->each(function (Transaction $transaction) use ($category, $months) {
            $budgetMonth = $months->random();
            $expense = Expense::create([
                'transaction_id' => $transaction->id,
                'description' => 'Operational expense for outreach',
                'amount' => round($transaction->credit * 0.1, 2),
                'expense_date' => $transaction->tran_date,
                'category' => $category->name,
                'notes' => 'Seeded expense record',
                'assign_to_all_members' => false,
                'amount_per_member' => null,
                'budget_month_id' => $budgetMonth->id,
                'expense_category_id' => $category->id,
            ]);

            $expense->members()->sync([$transaction->member_id => ['amount' => $expense->amount]]);
        });
    }

    protected function seedAnnouncementsAndNotifications(): void
    {
        Announcement::updateOrCreate(
            ['title' => 'System Upgrade Complete'],
            [
                'user_id' => $this->adminUser->id,
                'body' => 'We have rolled out the new investment dashboard and wallet services.',
                'published_at' => now()->subDay(),
                'is_pinned' => true,
            ]
        );

        Announcement::updateOrCreate(
            ['title' => 'Monthly Contribution Reminder'],
            [
                'user_id' => $this->treasurerUser->id,
                'body' => 'Please ensure your contributions are up to date before the 5th of next month.',
                'published_at' => now()->subDays(3),
                'is_pinned' => false,
            ]
        );

        foreach ([$this->adminUser, $this->treasurerUser, $this->memberUser] as $user) {
            NotificationPreference::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'email_enabled' => true,
                    'sms_enabled' => $user->id === $this->treasurerUser->id,
                    'push_enabled' => $user->id === $this->adminUser->id,
                    'channels' => ['email', 'in_app'],
                ]
            );

            NotificationLog::create([
                'user_id' => $user->id,
                'type' => 'announcement',
                'channel' => 'email',
                'payload' => ['subject' => 'Welcome to Evimeria'],
                'sent_at' => now()->subHours(random_int(1, 24)),
                'status' => 'sent',
            ]);
        }
    }

    protected function seedMeetings(): void
    {
        $meeting = Meeting::updateOrCreate(
            ['title' => 'Annual General Meeting'],
            [
                'agenda_summary' => 'Financial review, investments and elections',
                'scheduled_for' => now()->addWeeks(2),
                'location' => 'Community Hall',
                'status' => 'scheduled',
            ]
        );

        $motion = Motion::updateOrCreate(
            ['meeting_id' => $meeting->id, 'title' => 'Approve 2026 Budget'],
            [
                'proposed_by' => $this->treasurerUser->id,
                'description' => 'Vote to approve the proposed 2026 budget allocations.',
                'status' => 'open',
            ]
        );

        Vote::updateOrCreate(
            ['motion_id' => $motion->id, 'user_id' => $this->adminUser->id],
            ['choice' => 'yes']
        );
        Vote::updateOrCreate(
            ['motion_id' => $motion->id, 'user_id' => $this->treasurerUser->id],
            ['choice' => 'yes']
        );

        $attendancePath = 'demo/attendance-seed.xlsx';

        MeetingAttendanceUpload::updateOrCreate(
            ['original_filename' => 'attendance-seed.xlsx'],
            [
                'meeting_date' => now()->subMonth(),
                'stored_path' => $attendancePath,
                'mime_type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'file_size' => 1024,
                'uploaded_by' => $this->adminUser->id,
                'notes' => 'Seeded attendance upload',
                'processed_at' => now()->subMonth()->addDay(),
            ]
        );

        $this->ensureAttendanceFileExists($attendancePath);
    }

    protected function seedInvestments(Collection $members): void
    {
        $members->take(5)->each(function (Member $member, int $index) {
            $investment = Investment::create([
                'member_id' => $member->id,
                'name' => "Treasury Bond Series {$index}",
                'description' => '12 month bond with quarterly payouts',
                'principal_amount' => 50_000 + ($index * 10_000),
                'expected_roi_rate' => 12.5,
                'start_date' => now()->subMonths(6),
                'end_date' => now()->addMonths(6),
                'status' => 'active',
                'metadata' => ['seeded' => true],
            ]);

            InvestmentPayout::create([
                'investment_id' => $investment->id,
                'amount' => 3_500,
                'scheduled_for' => now()->addMonths(3),
                'paid_at' => null,
                'status' => 'scheduled',
                'metadata' => ['channel' => 'bank'],
            ]);

            $principal = $investment->principal_amount;
            $accrued = $principal * 0.08;

            $investment->roiCalculations()->create([
                'principal' => $principal,
                'accrued_interest' => $accrued,
                'calculated_on' => now()->subWeek(),
                'inputs' => ['seeded' => true],
            ]);
        });
    }

    protected function seedReportsAndAnalytics(): void
    {
        $reportPath = 'reports/member-contributions.pdf';

        ReportExport::updateOrCreate(
            ['type' => 'member-contributions'],
            [
                'user_id' => $this->adminUser->id,
                'format' => 'pdf',
                'filters' => ['range' => 'last_30_days'],
                'status' => 'completed',
                'file_path' => $reportPath,
            ]
        );

        $this->ensurePublicReportFileExists($reportPath, 'Member Contributions Snapshot');

        AnalyticsSnapshot::updateOrCreate(
            ['key' => 'daily_summary'],
            [
                'payload' => [
                    'total_members' => Member::count(),
                    'active_meetings' => 1,
                    'wallet_balance' => Wallet::sum('balance'),
                    'pending_reports' => ReportExport::where('status', 'pending')->count(),
                ],
            ]
        );
    }

    protected function seedAuditRun(Collection $members): void
    {
        if ($members->isEmpty()) {
            return;
        }

        $year = now()->subYear()->year;
        $scenarios = $this->buildAuditScenarios($members, $year);

        if (empty($scenarios)) {
            return;
        }

        $workbookPath = $this->createDemoAuditWorkbook($scenarios, $year);

        $run = AuditRun::updateOrCreate(
            ['year' => $year],
            [
                'user_id' => $this->adminUser->id,
                'original_filename' => 'evimeria-audit-demo.xlsx',
                'stored_filename' => basename($workbookPath),
                'file_path' => $workbookPath,
            ]
        );

        $run->rows()->delete();

        $counts = [
            'rows' => 0,
            'pass' => 0,
            'fail' => 0,
            'missing_member' => 0,
        ];

        $totals = [
            'expected' => 0,
            'actual' => 0,
        ];

        foreach ($scenarios as $scenario) {
            $rowAttributes = $this->buildAuditRowAttributes($scenario, $year);
            $run->rows()->create($rowAttributes);

            $counts['rows']++;
            $counts[$rowAttributes['status']] = ($counts[$rowAttributes['status']] ?? 0) + 1;

            $totals['expected'] += $rowAttributes['expected_total'];
            $totals['actual'] += $rowAttributes['system_total'];
        }

        $run->summary = [
            'rows' => $counts['rows'],
            'pass' => $counts['pass'] ?? 0,
            'fail' => $counts['fail'] ?? 0,
            'missing_member' => $counts['missing_member'] ?? 0,
        ];

        $run->metadata = [
            'view_totals' => [
                'selected_year' => [
                    'label' => (string) $year,
                    'expected' => round($totals['expected'], 2),
                    'actual' => round($totals['actual'], 2),
                    'difference' => round($totals['actual'] - $totals['expected'], 2),
                ],
                'next_year' => [
                    'label' => (string) ($year + 1),
                    'expected' => 0,
                    'actual' => 0,
                    'difference' => 0,
                ],
                'grand_total' => [
                    'label' => 'Grand Total',
                    'expected' => round($totals['expected'], 2),
                    'actual' => round($totals['actual'], 2),
                    'difference' => round($totals['actual'] - $totals['expected'], 2),
                ],
            ],
            'view_order' => ['selected_year', 'next_year', 'grand_total'],
        ];

        $run->save();
    }

    protected function seedAuditTrail(Collection $members): void
    {
        $targetMember = $members->first();

        AuditLog::create([
            'user_id' => $this->adminUser->id,
            'action' => 'seed_demo_data',
            'auditable_type' => Member::class,
            'auditable_id' => $targetMember?->id,
            'changes' => [
                'message' => 'DemoSeeder populated the workspace with sample records.',
            ],
            'ip_address' => '127.0.0.1',
            'user_agent' => 'DemoSeeder',
        ]);
    }

    protected function buildAuditScenarios(Collection $members, int $year): array
    {
        $members = $members->values();
        if ($members->isEmpty()) {
            return [];
        }

        $scenarios = [];
        $templates = [
            [
                'expected' => [1 => 5000, 2 => 5000, 3 => 5000, 4 => 5000],
                'actual' => [1 => 5000, 2 => 5000, 3 => 5000, 4 => 5000],
                'status' => 'pass',
            ],
            [
                'expected' => [1 => 4000, 2 => 4200, 3 => 4300, 4 => 4500],
                'actual' => [1 => 3000, 2 => 3500, 3 => 4300, 4 => 3000],
                'status' => 'fail',
            ],
            [
                'expected' => [1 => 3500, 2 => 3500, 3 => 3500, 4 => 3500],
                'actual' => [1 => 3800, 2 => 3600, 3 => 3400, 4 => 3600],
                'status' => 'fail',
            ],
        ];

        foreach ($templates as $index => $template) {
            $member = $members->get($index);
            if (!$member) {
                continue;
            }

            $scenarios[] = array_merge($template, [
                'member' => $member,
                'name' => $member->name,
                'phone' => $member->phone,
            ]);
        }

        $scenarios[] = [
            'member' => null,
            'name' => 'Prospect Member',
            'phone' => '0720 000000',
            'expected' => [1 => 4000, 2 => 4000, 3 => 4000],
            'actual' => [],
            'status' => 'missing_member',
        ];

        return $scenarios;
    }

    protected function createDemoAuditWorkbook(array $scenarios, int $year): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $headers = ['Name', 'Phone'];

        for ($month = 1; $month <= 12; $month++) {
            $headers[] = Carbon::create(null, $month, 1)->format('M');
        }

        $sheet->fromArray($headers, null, 'A1');

        $rowIndex = 2;
        foreach ($scenarios as $scenario) {
            $row = [
                $scenario['name'] ?? 'Member ' . $rowIndex,
                $scenario['phone'] ?? '07' . str_pad((string) random_int(10000000, 99999999), 8, '0'),
            ];

            for ($month = 1; $month <= 12; $month++) {
                $row[] = $scenario['expected'][$month] ?? 0;
            }

            $sheet->fromArray($row, null, 'A' . $rowIndex);
            $rowIndex++;
        }

        if (! Storage::exists('audits')) {
            Storage::makeDirectory('audits');
        }

        $relativePath = 'audits/demo-audit-' . $year . '.xlsx';
        $writer = new Xlsx($spreadsheet);
        $writer->save(Storage::path($relativePath));

        return $relativePath;
    }

    protected function buildAuditRowAttributes(array $scenario, int $year): array
    {
        /** @var Member|null $member */
        $member = $scenario['member'] ?? null;

        $expected = $scenario['expected'] ?? [];
        $actual = $scenario['actual'] ?? [];
        $status = $scenario['status'] ?? null;

        $selectedMonths = $this->buildMonthlyComparisonEntries($expected, $actual, $year);
        $expectedTotal = round(array_sum($expected), 2);
        $actualTotal = round(array_sum($actual), 2);

        if ($status === null) {
            $hasMismatch = collect($selectedMonths)->contains(fn ($entry) => $entry['matches'] === false);
            $status = $hasMismatch ? 'fail' : 'pass';
        }

        return [
            'member_id' => $member?->id,
            'name' => $member?->name ?? $scenario['name'] ?? null,
            'phone' => $member?->phone ?? $scenario['phone'] ?? null,
            'status' => $status,
            'expected_total' => $expectedTotal,
            'system_total' => $actualTotal,
            'difference' => round($actualTotal - $expectedTotal, 2),
            'mismatched_months' => collect($selectedMonths)
                ->where('matches', false)
                ->pluck('month')
                ->values()
                ->all(),
            'monthly' => [
                'selected_year' => [
                    'label' => (string) $year,
                    'months' => $selectedMonths,
                ],
                'next_year' => [
                    'label' => (string) ($year + 1),
                    'months' => [],
                ],
                'grand_total' => [
                    'label' => 'Grand Total',
                    'months' => $selectedMonths,
                ],
            ],
        ];
    }

    protected function buildMonthlyComparisonEntries(array $expected, array $actual, int $year): array
    {
        $entries = [];

        for ($month = 1; $month <= 12; $month++) {
            $expectedValue = round($expected[$month] ?? 0, 2);
            $actualValue = round($actual[$month] ?? 0, 2);
            $difference = round($actualValue - $expectedValue, 2);

            $entries[] = [
                'month' => Carbon::create(null, $month, 1)->format('M'),
                'month_number' => $month,
                'year' => $year,
                'month_key' => sprintf('%04d-%02d', $year, $month),
                'expected' => $expectedValue,
                'actual' => $actualValue,
                'difference' => $difference,
                'matches' => abs($difference) < 0.5,
            ];
        }

        return $entries;
    }

    protected function ensureStatementFileExists(string $relativePath): void
    {
        $disk = Storage::disk('statements');
        if ($disk->exists($relativePath)) {
            return;
        }

        $directory = trim(str_replace(basename($relativePath), '', $relativePath), '/');
        if ($directory !== '' && ! $disk->exists($directory)) {
            $disk->makeDirectory($directory);
        }

        $disk->put(
            $relativePath,
            $this->generatePlaceholderPdf(
                'Evimeria Demo Statement',
                'Replace with a real bank statement PDF in production.'
            )
        );
    }

    protected function ensureAttendanceFileExists(string $relativePath): void
    {
        $disk = Storage::disk('attendance');
        if ($disk->exists($relativePath)) {
            return;
        }

        $directory = trim(str_replace(basename($relativePath), '', $relativePath), '/');
        if ($directory !== '' && ! $disk->exists($directory)) {
            $disk->makeDirectory($directory);
        }

        $disk->put($relativePath, 'Demo attendance register placeholder. Replace with the signed sheet or export before launch.');
    }

    protected function ensurePublicReportFileExists(string $relativePath, string $title = 'Evimeria Report'): void
    {
        $disk = Storage::disk('public');
        if ($disk->exists($relativePath)) {
            return;
        }

        $directory = trim(str_replace(basename($relativePath), '', $relativePath), '/');
        if ($directory !== '' && ! $disk->exists($directory)) {
            $disk->makeDirectory($directory);
        }

        $disk->put(
            $relativePath,
            $this->generatePlaceholderPdf(
                $title,
                'Download generated via the demo seed. Upload the real export in production.'
            )
        );
    }

    protected function generatePlaceholderPdf(string $title, string $subtitle): string
    {
        $title = $this->pdfEscapeText($title);
        $subtitle = $this->pdfEscapeText($subtitle);

        return <<<PDF
%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 612 792] >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length 120 >> stream
BT
/F1 24 Tf
72 700 Td
($title) Tj
0 -40 Td
/F1 12 Tf
($subtitle) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000010 00000 n
0000000061 00000 n
0000000114 00000 n
0000000209 00000 n
0000000292 00000 n
trailer << /Size 6 /Root 1 0 R >>
startxref
377
%%EOF
PDF;
    }

    protected function pdfEscapeText(string $text): string
    {
        return str_replace(
            ['\\', '(', ')'],
            ['\\\\', '\\(', '\\)'],
            $text
        );
    }
}

