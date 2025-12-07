<?php

namespace App\Http\Controllers;

use App\Models\AuditExpenseLink;
use App\Models\AuditRow;
use App\Models\AuditRun;
use App\Models\BankStatement;
use App\Models\Expense;
use App\Models\Member;
use App\Models\PendingProfileChange;
use App\Models\Transaction;
use App\Models\TransactionSplit;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\HttpFoundation\File\UploadedFile;

class AuditController extends Controller
{
    protected array $monthMap = [
        1 => ['jan', 'january'],
        2 => ['feb', 'february'],
        3 => ['mar', 'march'],
        4 => ['apr', 'april'],
        5 => ['may'],
        6 => ['jun', 'june'],
        7 => ['jul', 'july'],
        8 => ['aug', 'august'],
        9 => ['sep', 'sept', 'september'],
        10 => ['oct', 'october'],
        11 => ['nov', 'november'],
        12 => ['dec', 'december'],
    ];

    protected array $registrationAliases = ['registration', 'reg fee', 'registration fee'];
    protected array $membershipAliases = ['membership', 'renewal', 'membership fee', 'renewal fee'];

    public function index(Request $request)
    {
        $query = AuditRun::query()
            ->withCount([
                'rows as total_rows',
                'rows as failing_rows' => fn ($q) => $q->where('status', 'fail'),
            ])
            ->orderByDesc('created_at');

        if ($request->filled('year')) {
            $query->where('year', $request->integer('year'));
        }

        $runs = $query->get()->map(function (AuditRun $run) {
            return [
                'id' => $run->id,
                'year' => $run->year,
                'original_filename' => $run->original_filename,
                'created_at' => $run->created_at->toDateTimeString(),
                'summary' => $run->summary,
                'total_rows' => $run->total_rows,
                'failing_rows' => $run->failing_rows,
            ];
        });

        return response()->json(['runs' => $runs]);
    }

    public function show(Request $request, AuditRun $auditRun)
    {
        $auditRun->load(['rows.member']);

        $statusFilter = $request->get('status');
        $rows = $auditRun->rows->when($statusFilter, fn ($collection) => $collection->where('status', $statusFilter));

        return response()->json($this->formatRunResponse($auditRun, $rows));
    }

    public function upload(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv',
            'year' => 'nullable|integer|min:2000|max:2100',
        ]);

        $user = $request->user();
        $year = (int) ($validated['year'] ?? now()->year);
        $file = $request->file('file');

        $storedName = time() . '_' . $file->getClientOriginalName();
        $path = $file->storeAs('audits', $storedName);

        $run = new AuditRun([
            'user_id' => $user?->id,
            'year' => $year,
            'original_filename' => $file->getClientOriginalName(),
            'stored_filename' => $storedName,
            'file_path' => $path,
        ]);

        return $this->processAudit($run, Storage::path($path), $user, $file);
    }

    public function reanalyze(Request $request, AuditRun $auditRun)
    {
        $user = $request->user();
        $absolutePath = Storage::path($auditRun->file_path);

        if (!is_file($absolutePath)) {
            abort(404, 'Stored audit source file is missing');
        }

        return $this->processAudit($auditRun, $absolutePath, $user);
    }

    public function memberResults(Request $request, Member $member)
    {
        $limit = $request->integer('limit', 10);

        $rows = AuditRow::with('run')
            ->where('member_id', $member->id)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        return response()->json([
            'member' => [
                'id' => $member->id,
                'name' => $member->name,
            ],
            'audits' => $rows->map(function (AuditRow $row) {
                $views = $row->monthly ?? [];

                $summaries = collect($views)->map(function ($view) {
                    $months = $view['months'] ?? [];
                    $expected = array_sum(array_column($months, 'expected'));
                    $actual = array_sum(array_column($months, 'actual'));

                    return [
                        'label' => $view['label'] ?? null,
                        'expected' => round($expected, 2),
                        'actual' => round($actual, 2),
                        'difference' => round($actual - $expected, 2),
                        'months' => $months,
                    ];
                });

                return [
                    'run_id' => $row->run_id,
                    'year' => $row->run->year ?? null,
                    'uploaded_at' => optional($row->run?->created_at)->toDateTimeString(),
                    'status' => $row->status,
                    'expected_total' => $row->expected_total,
                    'system_total' => $row->system_total,
                    'difference' => $row->difference,
                    'mismatched_months' => $row->mismatched_months ?? [],
                    'views' => $summaries->values(),
                ];
            }),
        ]);
    }

    public function destroy(AuditRun $auditRun)
    {
        DB::transaction(function () use ($auditRun) {
            $auditRun->rows()->delete();

            $auditRun->expenses()->each(function (AuditExpenseLink $link) {
                optional($link->expense)->delete();
                $link->delete();
            });

            if ($auditRun->file_path) {
                Storage::delete($auditRun->file_path);
            }

            $auditRun->delete();
        });

        return response()->json(['message' => 'Audit deleted']);
    }

    /**
     * Get audit information for members with pending profile changes
     */
    public function pendingProfileChangesAudit(Request $request)
    {
        try {
            $perPage = max(1, min(100, (int) $request->get('per_page', 25)));
            $page = max(1, (int) $request->get('page', 1));

            // Get pending profile changes with member and audit information
            $query = PendingProfileChange::with([
                'member' => function ($q) {
                    $q->select('id', 'name', 'phone', 'email', 'member_code');
                },
                'reviewedBy' => function ($q) {
                    $q->select('id', 'name', 'email');
                }
            ])
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc');

            if ($request->filled('member_id')) {
                $query->where('member_id', $request->member_id);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->whereHas('member', function ($memberQuery) use ($search) {
                        $memberQuery->where('name', 'like', "%{$search}%")
                          ->orWhere('phone', 'like', "%{$search}%")
                          ->orWhere('email', 'like', "%{$search}%")
                          ->orWhere('member_code', 'like', "%{$search}%");
                    })
                    ->orWhere('field_name', 'like', "%{$search}%");
                });
            }

            $changes = $query->paginate($perPage);

            // Get audit rows for members with pending changes
            $memberIds = $changes->pluck('member_id')->unique()->filter()->values();
            $auditRows = collect();
            if ($memberIds->isNotEmpty()) {
                try {
                    $auditRows = AuditRow::with('run')
                        ->whereIn('member_id', $memberIds->toArray())
                        ->orderByDesc('created_at')
                        ->get()
                        ->groupBy('member_id');
                } catch (\Exception $e) {
                    Log::warning('Error fetching audit rows for pending profile changes: ' . $e->getMessage());
                    $auditRows = collect();
                }
            }

            // Transform items
            $items = $changes->items();
            $transformedItems = array_map(function ($change) use ($auditRows) {
                $member = $change->member ?? null;
                $memberId = $change->member_id ?? null;
                $memberAudits = collect();
                
                if ($memberId && $auditRows->has($memberId)) {
                    try {
                        $memberAudits = $auditRows->get($memberId, collect())->take(5)->map(function ($row) {
                            try {
                                return [
                                    'run_id' => $row->run_id ?? null,
                                    'year' => ($row->run && isset($row->run->year)) ? $row->run->year : null,
                                    'status' => $row->status ?? null,
                                    'expected_total' => $row->expected_total ?? 0,
                                    'system_total' => $row->system_total ?? 0,
                                    'difference' => $row->difference ?? 0,
                                    'created_at' => $row->created_at ? $row->created_at->toDateTimeString() : null,
                                ];
                            } catch (\Exception $e) {
                                Log::debug('Error processing single audit row: ' . $e->getMessage());
                                return null;
                            }
                        })->filter()->values();
                    } catch (\Exception $e) {
                        Log::warning('Error processing audit rows for member: ' . $e->getMessage(), [
                            'member_id' => $memberId,
                            'trace' => $e->getTraceAsString()
                        ]);
                        $memberAudits = collect();
                    }
                }

                return [
                    'id' => $change->id ?? null,
                    'member_id' => $change->member_id ?? null,
                    'field_name' => $change->field_name ?? '',
                    'old_value' => $change->old_value ?? null,
                    'new_value' => $change->new_value ?? '',
                    'status' => $change->status ?? 'pending',
                    'created_at' => $change->created_at ? $change->created_at->toDateTimeString() : null,
                    'member' => $member ? [
                        'id' => $member->id ?? null,
                        'name' => $member->name ?? '',
                        'phone' => $member->phone ?? '',
                        'email' => $member->email ?? '',
                        'member_code' => $member->member_code ?? '',
                    ] : null,
                    'audits' => $memberAudits,
                ];
            }, $items);

            return response()->json([
                'data' => $transformedItems,
                'current_page' => $changes->currentPage(),
                'last_page' => $changes->lastPage(),
                'per_page' => $changes->perPage(),
                'total' => $changes->total(),
                'from' => $changes->firstItem(),
                'to' => $changes->lastItem(),
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching pending profile changes audit: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json([
                'message' => 'Error fetching pending profile changes audit',
                'error' => config('app.debug') ? $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine() : 'An error occurred',
            ], 500);
        }
    }

    protected function processAudit(AuditRun $run, string $path, $user = null, ?UploadedFile $uploadedFile = null)
    {
        $spreadsheet = IOFactory::load($path);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, true);

        $header = $this->locateHeader($rows);
        $nameColumn = $header['columns']['name'] ?? null;
        $phoneColumn = $header['columns']['phone'] ?? ($header['columns']['mobile'] ?? null);

        if (!$nameColumn) {
            throw ValidationException::withMessages([
                'file' => 'Could not find a "Name" column in the uploaded sheet.',
            ]);
        }

        $monthColumns = $this->mapMonthColumns($header['columns']);
        if (empty($monthColumns)) {
            throw ValidationException::withMessages([
                'file' => 'Could not find any month columns (Jan-Dec) in the uploaded sheet.',
            ]);
        }

        $feeColumns = $this->mapFeeColumns($header['columns']);

        $runResults = $this->evaluateRows($rows, $header, $monthColumns, $feeColumns, $run->year);

        DB::transaction(function () use ($run, $runResults, $uploadedFile) {
            if ($run->exists) {
                $run->rows()->delete();
                $run->expenses()->each(function (AuditExpenseLink $link) {
                    optional($link->expense)->delete();
                });
                $run->expenses()->delete();
            } else {
                $run->save();
            }

            if ($uploadedFile) {
                $run->original_filename = $uploadedFile->getClientOriginalName();
                $run->stored_filename = basename($run->file_path);
            }

            $run->summary = $runResults['summary'];
            $run->metadata = $runResults['metadata'];
            $run->save();

            foreach ($runResults['rows'] as $rowData) {
                $auditRow = $run->rows()->create($rowData['attributes']);

                foreach ($rowData['expenses'] as $expensePayload) {
                    $expense = Expense::create($expensePayload['data']);
                    if (!empty($expensePayload['member_id'])) {
                        $expense->members()->attach($expensePayload['member_id'], [
                            'amount' => $expensePayload['data']['amount'],
                        ]);
                    }

                    AuditExpenseLink::create([
                        'audit_run_id' => $run->id,
                        'audit_row_id' => $auditRow->id,
                        'expense_id' => $expense->id,
                        'type' => $expensePayload['type'],
                    ]);
                }
            }
        });

        $run->load('rows.member');

        return response()->json($this->formatRunResponse($run, $run->rows));
    }

    protected function locateHeader(array $rows): array
    {
        foreach ($rows as $index => $row) {
            $normalized = [];
            foreach ($row as $column => $value) {
                $key = strtolower(trim((string) $value));
                if ($key !== '') {
                    $normalized[$key] = $column;
                }
            }

            if (isset($normalized['name'])) {
                return [
                    'index' => $index,
                    'columns' => $normalized,
                ];
            }
        }

        throw ValidationException::withMessages([
            'file' => 'Unable to detect header row in the uploaded sheet.',
        ]);
    }

    protected function mapMonthColumns(array $headerColumns): array
    {
        $mapped = [];

        foreach ($this->monthMap as $monthNumber => $aliases) {
            foreach ($aliases as $alias) {
                if (array_key_exists($alias, $headerColumns)) {
                    $mapped[$monthNumber] = $headerColumns[$alias];
                    break;
                }
            }
        }

        return $mapped;
    }

    protected function mapFeeColumns(array $headerColumns): array
    {
        $fees = [
            'registration' => null,
            'membership' => null,
        ];

        foreach ($headerColumns as $key => $column) {
            foreach ($this->registrationAliases as $alias) {
                if (str_contains($key, $alias)) {
                    $fees['registration'] = $column;
                }
            }
            foreach ($this->membershipAliases as $alias) {
                if (str_contains($key, $alias)) {
                    $fees['membership'] = $column;
                }
            }
        }

        return array_filter($fees);
    }

    protected function extractMonthlyData(array $row, array $monthColumns): array
    {
        $data = [];

        foreach ($monthColumns as $month => $column) {
            $raw = $row[$column] ?? 0;
            $data[$month] = $this->parseNumber($raw);
        }

        return $data;
    }

    protected function extractFeeValues(array $row, array $feeColumns): array
    {
        $fees = [
            'registration' => 0,
            'membership' => 0,
        ];

        foreach ($feeColumns as $type => $columnKey) {
            $fees[$type] = $this->parseNumber($row[$columnKey] ?? 0);
        }

        return $fees;
    }

    protected function parseNumber($value): float
    {
        if (is_numeric($value)) {
            return (float) $value;
        }

        $clean = preg_replace('/[^\d\-.]/', '', (string) $value);

        return $clean === '' ? 0.0 : (float) $clean;
    }

    protected function locateMember(string $name, string $phone): ?Member
    {
        $normalizedPhone = $this->normalizePhone($phone);

        if ($normalizedPhone) {
            $member = Member::query()
                ->whereRaw("REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), '(', '') LIKE ?", ['%' . $normalizedPhone])
                ->first();

            if ($member) {
                return $member;
            }
        }

        if ($name) {
            return Member::whereRaw('LOWER(name) = ?', [strtolower($name)])->first();
        }

        return null;
    }

    protected function normalizePhone(?string $phone): ?string
    {
        if (!$phone) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone);
        if (!$digits) {
            return null;
        }

        // Use last 9 digits for comparison to account for country codes
        return substr($digits, -9);
    }

    protected function fetchActuals(int $memberId): array
    {
        $buckets = [];

        $transactions = Transaction::query()
            ->where('member_id', $memberId)
            ->where('assignment_status', '!=', 'unassigned')
            ->where('is_archived', false)
            ->withSum('splits as distributed_amount', 'amount')
            ->get(['id', 'tran_date', 'credit']);

        foreach ($transactions as $transaction) {
            $credit = (float) ($transaction->credit ?? 0);
            $distributed = (float) ($transaction->distributed_amount ?? 0);
            $ownerShare = $credit - $distributed;
            $this->addAmountToBucket($buckets, $transaction->tran_date, $ownerShare);
        }

        $splitShares = TransactionSplit::query()
            ->with(['transaction' => function ($query) {
                $query->select('id', 'tran_date', 'assignment_status', 'is_archived');
            }])
            ->where('member_id', $memberId)
            ->whereHas('transaction', function ($query) {
                $query->where('assignment_status', '!=', 'unassigned')
                      ->where('is_archived', false);
            })
            ->get();

        foreach ($splitShares as $split) {
            $this->addAmountToBucket(
                $buckets,
                optional($split->transaction)->tran_date,
                (float) $split->amount
            );
        }

        ksort($buckets);

        $byYear = [];
        $overall = [];

        foreach ($buckets as $year => $months) {
            ksort($months);
            $byYear[$year] = [];
            foreach ($months as $month => $amount) {
                $rounded = round($amount, 2);
                $byYear[$year][$month] = $rounded;
                $overall[$month] = round(($overall[$month] ?? 0) + $rounded, 2);
            }
        }

        return [
            'by_year' => $byYear,
            'overall' => $overall,
        ];
    }

    protected function addAmountToBucket(array &$bucket, $date, float $amount): void
    {
        if ($amount <= 0 || !$date) {
            return;
        }

        $carbon = Carbon::parse($date);
        $year = (int) $carbon->format('Y');
        $month = (int) $carbon->format('n');

        if (!isset($bucket[$year])) {
            $bucket[$year] = [];
        }

        $bucket[$year][$month] = ($bucket[$year][$month] ?? 0) + $amount;
    }

    protected function compareMonths(array $expected, array $actual, ?int $year = null): array
    {
        $results = [];

        foreach ($this->monthMap as $monthNumber => $aliases) {
            $monthName = ucfirst($aliases[0]);
            $expectedValue = round($expected[$monthNumber] ?? 0, 2);
            $actualValue = round($actual[$monthNumber] ?? 0, 2);
            $difference = round($actualValue - $expectedValue, 2);
            $matches = abs($difference) < 0.5;

            $results[] = [
                'month' => $monthName,
                'month_number' => $monthNumber,
                'year' => $year,
                'month_key' => $year ? sprintf('%04d-%02d', $year, $monthNumber) : null,
                'expected' => $expectedValue,
                'actual' => $actualValue,
                'difference' => $difference,
                'matches' => $matches,
            ];
        }

        return $results;
    }

    protected function evaluateRows(array $rows, array $header, array $monthColumns, array $feeColumns, int $year): array
    {
        $results = [];
        $summary = [
            'rows' => 0,
            'pass' => 0,
            'fail' => 0,
            'missing_member' => 0,
        ];

        $viewTotals = [
            'selected_year' => ['label' => (string) $year, 'expected' => 0, 'actual' => 0],
            'next_year' => ['label' => (string) ($year + 1), 'expected' => 0, 'actual' => 0],
            'grand_total' => ['label' => 'Grand Total', 'expected' => 0, 'actual' => 0],
        ];

        $nameColumn = $header['columns']['name'];
        $phoneColumn = $header['columns']['phone'] ?? ($header['columns']['mobile'] ?? null);

        foreach ($rows as $index => $row) {
            if ($index <= $header['index']) {
                continue;
            }

            $name = trim((string) ($row[$nameColumn] ?? ''));
            $phone = trim((string) ($phoneColumn ? ($row[$phoneColumn] ?? '') : ''));

            if ($name === '' && $phone === '') {
                continue;
            }

            $summary['rows']++;

            $expectedByMonth = $this->extractMonthlyData($row, $monthColumns);
            $expectedTotal = array_sum($expectedByMonth);
            $feeValues = $this->extractFeeValues($row, $feeColumns);

            $member = $this->locateMember($name, $phone);
            if (!$member) {
                $results[] = $this->buildRowPayload('missing_member', $expectedTotal, 0, $expectedByMonth, [], [
                    'name' => $name,
                    'phone' => $phone,
                ], $year);
                $summary['missing_member']++;
                continue;
            }

            $actuals = $this->fetchActuals($member->id);
            $selectedMonths = $this->compareMonths($expectedByMonth, $actuals['by_year'][$year] ?? [], $year);
            $nextMonths = $this->compareMonths(array_fill(1, 12, 0), $actuals['by_year'][$year + 1] ?? [], $year + 1);
            $overallMonths = $this->compareMonths($expectedByMonth, $actuals['overall'], null);

            $systemTotal = array_sum(array_column($selectedMonths, 'actual'));
            $difference = round($systemTotal - $expectedTotal, 2);
            $mismatched = array_values(array_column(array_filter($selectedMonths, fn ($m) => !$m['matches']), 'month'));
            $status = empty($mismatched) && abs($difference) < 0.5 ? 'pass' : 'fail';

            $monthlyViews = [
                'selected_year' => [
                    'label' => (string) $year,
                    'months' => $selectedMonths,
                ],
                'next_year' => [
                    'label' => (string) ($year + 1),
                    'months' => $nextMonths,
                ],
                'grand_total' => [
                    'label' => 'Grand Total',
                    'months' => $overallMonths,
                ],
            ];

            $rowAttributes = [
                'member_id' => $member->id,
                'name' => $member->name,
                'phone' => $member->phone,
                'status' => $status,
                'expected_total' => round($expectedTotal, 2),
                'system_total' => round($systemTotal, 2),
                'difference' => $difference,
                'mismatched_months' => $mismatched,
                'monthly' => $monthlyViews,
                'registration_fee' => $feeValues['registration'] ?? null,
                'membership_fee' => $feeValues['membership'] ?? null,
            ];

            $results[] = [
                'attributes' => $rowAttributes,
                'expenses' => $this->prepareExpenses($member, $feeValues, $year),
            ];

            $summary[$status]++;
            $viewTotals['selected_year']['expected'] += $expectedTotal;
            $viewTotals['selected_year']['actual'] += $systemTotal;
            $viewTotals['next_year']['actual'] += array_sum(array_column($nextMonths, 'actual'));
            $viewTotals['grand_total']['expected'] += $expectedTotal;
            $viewTotals['grand_total']['actual'] += array_sum(array_column($overallMonths, 'actual'));
        }

        foreach ($viewTotals as &$viewTotal) {
            $viewTotal['difference'] = round($viewTotal['actual'] - $viewTotal['expected'], 2);
        }

        return [
            'rows' => $results,
            'summary' => $summary,
            'metadata' => [
                'view_totals' => $viewTotals,
                'view_order' => array_keys($viewTotals),
            ],
        ];
    }

    protected function buildRowPayload(string $status, float $expectedTotal, float $systemTotal, array $expectedByMonth, array $actualByMonth, array $meta, int $year): array
    {
        return [
            'attributes' => [
                'name' => $meta['name'] ?? null,
                'phone' => $meta['phone'] ?? null,
                'status' => $status,
                'expected_total' => round($expectedTotal, 2),
                'system_total' => round($systemTotal, 2),
                'difference' => round($systemTotal - $expectedTotal, 2),
                'mismatched_months' => array_values($this->listMonthNames(array_keys(array_filter($expectedByMonth)))),
                'monthly' => [
                    'selected_year' => [
                        'label' => (string) $year,
                    'months' => $this->compareMonths($expectedByMonth, $actualByMonth, $year),
                    ],
                    'next_year' => [
                        'label' => (string) ($year + 1),
                    'months' => $this->compareMonths(array_fill(1, 12, 0), [], $year + 1),
                    ],
                    'grand_total' => [
                        'label' => 'Grand Total',
                    'months' => $this->compareMonths($expectedByMonth, $actualByMonth, null),
                    ],
                ],
            ],
            'expenses' => [],
        ];
    }

    protected function prepareExpenses(?Member $member, array $fees, int $year): array
    {
        $expenses = [];
        $baseDate = Carbon::create($year, 1, 1);

        if (!empty($fees['registration'])) {
            $expenses[] = [
                'type' => 'registration',
                'member_id' => $member?->id,
                'data' => [
                    'description' => 'Registration fee - ' . ($member?->name ?? 'Member'),
                    'amount' => $fees['registration'],
                    'expense_date' => $baseDate->copy(),
                    'category' => 'registration',
                    'notes' => 'Generated from audit upload',
                ],
            ];
        }

        if (!empty($fees['membership'])) {
            $expenses[] = [
                'type' => 'membership',
                'member_id' => $member?->id,
                'data' => [
                    'description' => 'Membership renewal - ' . ($member?->name ?? 'Member'),
                    'amount' => $fees['membership'],
                    'expense_date' => $baseDate->copy()->addMonths(6),
                    'category' => 'membership',
                    'notes' => 'Generated from audit upload',
                ],
            ];
        }

        return $expenses;
    }

    protected function listMonthNames(array $monthNumbers): array
    {
        return array_map(function ($monthNumber) {
            return ucfirst($this->monthMap[$monthNumber][0] ?? $monthNumber);
        }, $monthNumbers);
    }

    protected function formatRunResponse(AuditRun $run, $rows)
    {
        return [
            'run' => [
                'id' => $run->id,
                'year' => $run->year,
                'original_filename' => $run->original_filename,
                'created_at' => $run->created_at->toDateTimeString(),
                'summary' => $run->summary,
                'views' => $run->metadata['view_totals'] ?? [],
                'view_order' => $run->metadata['view_order'] ?? array_keys($run->metadata['view_totals'] ?? []),
            ],
            'rows' => $rows->map(function (AuditRow $row) {
                return [
                    'id' => $row->id,
                    'member_id' => $row->member_id,
                    'member_name' => $row->member->name ?? $row->name,
                    'phone' => $row->phone,
                    'status' => $row->status,
                    'expected_total' => $row->expected_total,
                    'system_total' => $row->system_total,
                    'difference' => $row->difference,
                    'mismatched_months' => $row->mismatched_months ?? [],
                    'monthly' => $row->monthly,
                    'registration_fee' => $row->registration_fee,
                    'membership_fee' => $row->membership_fee,
                ];
            })->values(),
        ];
    }

    /**
     * Audit statements by re-parsing them with the new parser and comparing with existing transactions
     */
    public function auditStatements(Request $request)
    {
        $statementId = $request->get('statement_id');
        
        $statements = $statementId 
            ? BankStatement::where('id', $statementId)->get()
            : BankStatement::where('status', 'completed')->get();
        
        if ($statements->isEmpty()) {
            return response()->json([
                'message' => 'No statements found to audit',
                'results' => [],
            ]);
        }
        
        $results = [];
        
        foreach ($statements as $statement) {
            try {
                $auditResult = $this->auditStatement($statement);
                $results[] = $auditResult;
            } catch (\Exception $e) {
                Log::error("Error auditing statement {$statement->id}: " . $e->getMessage());
                $results[] = [
                    'statement_id' => $statement->id,
                    'filename' => $statement->filename,
                    'status' => 'error',
                    'error' => $e->getMessage(),
                    'anomalies' => [],
                ];
            }
        }
        
        return response()->json([
            'message' => 'Statement audit completed',
            'total_statements' => count($results),
            'results' => $results,
        ]);
    }
    
    /**
     * Audit a single statement by re-parsing and comparing
     */
    protected function auditStatement(BankStatement $statement): array
    {
        $filePath = Storage::disk('statements')->path($statement->file_path);
        
        if (!file_exists($filePath)) {
            return [
                'statement_id' => $statement->id,
                'filename' => $statement->filename,
                'status' => 'error',
                'error' => 'Statement file not found',
                'anomalies' => [],
            ];
        }
        
        // Re-parse the statement using the Python parser
        $parserOutput = $this->reparseStatement($filePath);
        
        // Get existing transactions for this statement
        $existingTransactions = $statement->transactions()
            ->where('is_archived', false)
            ->get()
            ->keyBy(function ($txn) {
                // Create a unique key: date|particulars|credit
                $date = $txn->value_date ?? $txn->tran_date;
                $dateStr = $date ? $date->format('Y-m-d') : '';
                $particulars = trim($txn->particulars ?? '');
                $credit = number_format((float)($txn->credit ?? 0), 2, '.', '');
                return $dateStr . '|' . $particulars . '|' . $credit;
            });
        
        // Compare parsed transactions with existing
        $anomalies = [];
        $parsedCount = count($parserOutput);
        $existingCount = $existingTransactions->count();
        
        // Check for missing transactions (in parser but not in DB)
        $parsedKeys = [];
        foreach ($parserOutput as $parsed) {
            $date = $parsed['tran_date'] ?? $parsed['value_date'] ?? null;
            $dateStr = $date ? (is_string($date) ? $date : date('Y-m-d', strtotime($date))) : '';
            $particulars = trim($parsed['particulars'] ?? '');
            $credit = number_format((float)($parsed['credit'] ?? 0), 2, '.', '');
            $key = $dateStr . '|' . $particulars . '|' . $credit;
            $parsedKeys[] = $key;
            
            if (!$existingTransactions->has($key)) {
                $anomalies[] = [
                    'type' => 'missing_in_db',
                    'transaction' => [
                        'date' => $dateStr,
                        'particulars' => substr($particulars, 0, 100),
                        'credit' => $credit,
                    ],
                    'message' => 'Transaction found in parser but not in database',
                ];
            }
        }
        
        // Check for extra transactions (in DB but not in parser)
        foreach ($existingTransactions as $key => $txn) {
            if (!in_array($key, $parsedKeys)) {
                $anomalies[] = [
                    'type' => 'extra_in_db',
                    'transaction' => [
                        'id' => $txn->id,
                        'date' => ($txn->value_date ?? $txn->tran_date)?->format('Y-m-d'),
                        'particulars' => substr($txn->particulars, 0, 100),
                        'credit' => number_format((float)($txn->credit ?? 0), 2, '.', ''),
                    ],
                    'message' => 'Transaction in database but not found by parser',
                ];
            }
        }
        
        // Calculate totals
        $parsedTotal = array_sum(array_column($parserOutput, 'credit'));
        $existingTotal = $existingTransactions->sum('credit');
        $totalDiff = abs($parsedTotal - $existingTotal);
        
        $status = 'pass';
        if (count($anomalies) > 0 || $totalDiff > 0.5) {
            $status = 'fail';
        } elseif ($parsedCount !== $existingCount) {
            $status = 'warning';
        }
        
        return [
            'statement_id' => $statement->id,
            'filename' => $statement->filename,
            'status' => $status,
            'parsed_count' => $parsedCount,
            'existing_count' => $existingCount,
            'parsed_total' => round($parsedTotal, 2),
            'existing_total' => round($existingTotal, 2),
            'total_difference' => round($totalDiff, 2),
            'anomalies' => $anomalies,
            'anomaly_count' => count($anomalies),
        ];
    }
    
    /**
     * Re-parse a statement using the Python parser
     */
    protected function reparseStatement(string $filePath): array
    {
        // base_path() returns the backend directory, so we need to go up one level
        $projectRoot = dirname(base_path());
        $parserScript = $projectRoot . DIRECTORY_SEPARATOR . 'ocr-parser' . DIRECTORY_SEPARATOR . 'parse_pdf.py';
        $outputFile = storage_path('app/temp_audit_' . uniqid() . '.json');
        
        // Check if parser script exists
        if (!file_exists($parserScript)) {
            throw new \Exception("Parser script not found at: {$parserScript}");
        }
        
        // Run Python parser
        // Use proc_open for better control over arguments, especially for Windows paths with spaces
        $descriptorspec = [
            0 => ['pipe', 'r'],  // stdin
            1 => ['pipe', 'w'],  // stdout
            2 => ['pipe', 'w'],  // stderr
        ];
        
        $process = proc_open(
            [
                'python',
                $parserScript,
                $filePath,
                '--output',
                $outputFile,
            ],
            $descriptorspec,
            $pipes
        );
        
        if (!is_resource($process)) {
            throw new \Exception('Failed to start Python parser process');
        }
        
        // Close stdin
        fclose($pipes[0]);
        
        // Read stdout and stderr
        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        
        // Get exit code
        $returnCode = proc_close($process);
        
        if ($returnCode !== 0 || !file_exists($outputFile)) {
            $errorMessage = trim($stderr ?: $stdout ?: 'Unknown error');
            throw new \Exception('Failed to parse statement: ' . $errorMessage);
        }
        
        $parsedData = json_decode(file_get_contents($outputFile), true);
        
        // Clean up temp file
        @unlink($outputFile);
        
        if (!is_array($parsedData)) {
            throw new \Exception('Invalid parser output');
        }
        
        return $parsedData;
    }
}
