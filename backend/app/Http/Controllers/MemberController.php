<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Services\StatementBalanceCalculator;
use Carbon\Carbon;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class MemberController extends Controller
{
    public function index(Request $request)
    {
        $query = Member::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('member_code', 'like', "%{$search}%")
                  ->orWhere('member_number', 'like', "%{$search}%");
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return response()->json($query->paginate($request->get('per_page', 20)));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'secondary_phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'id_number' => 'nullable|string|max:50|unique:members,id_number',
            'gender' => 'nullable|string|in:male,female,other',
            'next_of_kin_name' => 'nullable|string|max:255',
            'next_of_kin_phone' => 'nullable|string|max:255',
            'next_of_kin_relationship' => 'nullable|string|max:255',
            'member_code' => 'nullable|string|max:50|unique:members',
            'member_number' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $member = Member::create($validated);

        return response()->json($member, 201);
    }

    public function show(Member $member)
    {
        $member->load(['transactions' => function($query) {
            $query->orderBy('tran_date', 'desc');
        }, 'manualContributions', 'expenses']);
        
        // Calculate contribution statistics
        $member->total_contributions = $member->total_contributions;
        $member->expected_contributions = $member->expected_contributions;
        $member->contribution_status = $member->contribution_status;
        
        return response()->json($member);
    }

    public function statement(Member $member, Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'month' => 'nullable|date_format:Y-m',
            'per_page' => 'nullable|integer|min:1|max:500',
            'page' => 'nullable|integer|min:1',
        ]);

        $data = $this->buildStatementData($member, $validated);
        $collection = $data['collection'];

        $perPage = max(1, (int) $request->get('per_page', 25));
        $page = max(1, (int) $request->get('page', 1));
        $total = $collection->count();

        $paginatedStatement = new LengthAwarePaginator(
            $collection->slice(($page - 1) * $perPage, $perPage)->values(),
            $total,
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        // Calculate first transaction date if not set
        $firstTransactionDate = $member->date_of_registration;
        if (!$firstTransactionDate && $data['collection']->isNotEmpty()) {
            $firstTransaction = $data['collection']
                ->filter(fn($entry) => in_array($entry['type'], ['contribution', 'shared_contribution', 'manual_contribution']))
                ->sortBy('date')
                ->first();
            $firstTransactionDate = $firstTransaction['date'] ?? null;
        }

        $memberData = $member->toArray();
        $memberData['date_of_registration'] = $firstTransactionDate;

        return response()->json([
            'member' => $memberData,
            'statement' => $paginatedStatement->items(),
            'summary' => $data['summary'],
            'pagination' => [
                'current_page' => $paginatedStatement->currentPage(),
                'per_page' => $paginatedStatement->perPage(),
                'total' => $paginatedStatement->total(),
                'last_page' => $paginatedStatement->lastPage(),
            ],
            'monthly_totals' => $data['monthly_totals'],
        ]);
    }

    public function exportStatement(Member $member, Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'month' => 'nullable|date_format:Y-m',
            'format' => 'nullable|in:pdf,excel',
        ]);

        $format = $validated['format'] ?? 'pdf';
        $data = $this->buildStatementData($member, $validated);
        $entries = $data['collection'];

        if ($format === 'excel') {
            return $this->exportStatementExcel($member, $entries, $data);
        }

        return $this->exportStatementPdf($member, $entries, $data);
    }

    public function exportInvestmentReport(Member $member, Request $request)
    {
        $validated = $request->validate([
            'format' => 'nullable|in:pdf,excel',
        ]);

        $format = $validated['format'] ?? 'pdf';
        $investments = $member->investments()->orderBy('start_date', 'desc')->get();

        if ($format === 'excel') {
            return $this->exportInvestmentExcel($member, $investments);
        }

        return $this->exportInvestmentPdf($member, $investments);
    }

    public function exportBulkStatements(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'month' => 'nullable|date_format:Y-m',
            'format' => 'required|in:pdf,excel',
            'member_ids' => 'nullable|string',
        ]);

        $filters = Arr::only($validated, ['start_date', 'end_date', 'month']);

        $memberQuery = Member::query()->orderBy('name');

        if (!empty($validated['member_ids'])) {
            $ids = collect(explode(',', $validated['member_ids']))
                ->map(fn ($value) => (int) trim($value))
                ->filter();
            if ($ids->isNotEmpty()) {
                $memberQuery->whereIn('id', $ids);
            }
        }

        $members = $memberQuery->get();

        if ($members->isEmpty()) {
            return response()->json(['message' => 'No members found for export'], 404);
        }

        $payload = $members->map(function (Member $member) use ($filters) {
            $data = $this->buildStatementData($member, $filters);
            return [
                'member' => $member,
                'data' => $data,
            ];
        })->filter(fn ($row) => $row['data']['collection']->isNotEmpty());

        if ($payload->isEmpty()) {
            return response()->json(['message' => 'No statement entries found for the selected filters'], 404);
        }

        if ($validated['format'] === 'excel') {
            return $this->exportBulkStatementsExcel($payload, $filters);
        }

        return $this->exportBulkStatementsPdf($payload, $filters);
    }

    protected function buildStatementData(Member $member, array $filters = []): array
    {
        $startDate = $filters['start_date'] ?? null;
        $endDate = $filters['end_date'] ?? null;
        $monthFilter = $filters['month'] ?? null;

        if ($monthFilter) {
            $month = Carbon::createFromFormat('Y-m', $monthFilter);
            $startDate = $month->copy()->startOfMonth()->toDateString();
            $endDate = $month->copy()->endOfMonth()->toDateString();
        }

        $transactions = $member->transactions()
            ->with(['member', 'splits', 'bankStatement'])
            ->when($startDate, fn ($q) => $q->where('tran_date', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->where('tran_date', '<=', $endDate))
            ->whereNotIn('assignment_status', ['unassigned', 'duplicate'])
            ->where('is_archived', false)
            ->orderBy('tran_date', 'asc')
            ->get();

        $manualContributions = $member->manualContributions()
            ->when($startDate, fn ($q) => $q->where('contribution_date', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->where('contribution_date', '<=', $endDate))
            ->orderBy('contribution_date', 'asc')
            ->get();

        $expenses = $member->expenses()
            ->where('approval_status', 'approved')
            ->when($startDate, fn ($q) => $q->where('expense_date', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->where('expense_date', '<=', $endDate))
            ->orderBy('expense_date', 'asc')
            ->get();

        $splits = $member->transactionSplits()
            ->with(['transaction' => function ($query) {
                $query->select('id', 'bank_statement_id', 'tran_date', 'particulars', 'transaction_code')
                      ->with('bankStatement:id,filename')
                      ->where('is_archived', false);
            }])
            ->whereHas('transaction', function ($query) use ($startDate, $endDate) {
                $query->when($startDate, fn ($q) => $q->where('tran_date', '>=', $startDate))
                      ->when($endDate, fn ($q) => $q->where('tran_date', '<=', $endDate))
                      ->where('is_archived', false);
            })
            ->get();

        // Get invoices and aggregate by month
        $invoices = $member->invoices()
            ->when($startDate, fn ($q) => $q->where('issue_date', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->where('issue_date', '<=', $endDate))
            ->orderBy('issue_date', 'asc')
            ->get();

        // Group invoices by month (using week start date to determine month)
        $monthlyInvoices = $invoices->groupBy(function ($invoice) {
            // Get the week start date and extract the month
            $weekParts = explode('-W', $invoice->period);
            if (count($weekParts) === 2) {
                $year = $weekParts[0];
                $week = $weekParts[1];
                $weekStart = Carbon::now()->setISODate($year, $week)->startOfWeek();
                return $weekStart->format('Y-m');
            }
            // Fallback to issue_date month
            return Carbon::parse($invoice->issue_date)->format('Y-m');
        })->map(function ($monthInvoices, $monthKey) use ($member) {
            $total = $monthInvoices->sum('amount');
            $firstInvoice = $monthInvoices->first();
            $monthDate = Carbon::createFromFormat('Y-m', $monthKey)->endOfMonth();
            
            return [
                'date' => $monthDate->toDateString(),
                'type' => 'invoice',
                'description' => 'Weekly contribution invoices for ' . $monthDate->format('F Y') . ' (' . $monthInvoices->count() . ' weeks)',
                'credit' => 0,
                'debit' => $total,
                'reference' => 'Invoice #' . $firstInvoice->invoice_number . ' + ' . ($monthInvoices->count() - 1) . ' more',
                'transaction_id' => null,
                'member_id' => $member->id,
                'member_name' => $member->name,
                'is_split' => false,
                'statement_id' => null,
                'statement_name' => null,
                'invoice_ids' => $monthInvoices->pluck('id')->toArray(),
                'invoice_count' => $monthInvoices->count(),
            ];
        });

        $statementCollection = collect()
            ->merge($transactions->map(function ($t) use ($member) {
                $distributed = $t->splits->sum('amount');
                $ownerAmount = max(0, $t->credit - $distributed);
                if ($ownerAmount <= 0) {
                    return null;
                }

                return [
                    'date' => $t->tran_date,
                    'type' => $t->splits->isNotEmpty() ? 'shared_contribution' : 'contribution',
                    'description' => $t->particulars,
                    'credit' => $ownerAmount,
                    'debit' => 0,
                    'reference' => 'Transaction #' . $t->id,
                    'transaction_id' => $t->id,
                    'member_id' => $member->id,
                    'member_name' => $member->name,
                    'is_split' => $t->splits->isNotEmpty(),
                    'statement_id' => $t->bank_statement_id,
                    'statement_name' => optional($t->bankStatement)->filename,
                ];
            })->filter())
            ->merge($manualContributions->map(fn ($mc) => [
                'date' => $mc->contribution_date,
                'type' => 'manual_contribution',
                'description' => 'Manual Contribution - ' . $mc->payment_method,
                'credit' => $mc->amount,
                'debit' => 0,
                'reference' => 'Manual #' . $mc->id,
                'transaction_id' => null,
                'member_id' => $member->id,
                'member_name' => $member->name,
                'is_split' => false,
                'statement_id' => null,
                'statement_name' => null,
            ]))
            ->merge($expenses->map(fn ($e) => [
                'date' => $e->expense_date,
                'type' => 'expense',
                'description' => $e->description . ' (' . $e->category . ')',
                'credit' => 0,
                'debit' => $e->pivot->amount,
                'reference' => 'Expense #' . $e->id,
                'transaction_id' => null,
                'member_id' => $member->id,
                'member_name' => $member->name,
                'is_split' => false,
                'statement_id' => null,
                'statement_name' => null,
            ]))
            ->merge($splits->map(function ($split) use ($member) {
                if (!$split->transaction) {
                    return null;
                }
                $transaction = $split->transaction;
                return [
                    'date' => $transaction->tran_date,
                    'type' => 'shared_contribution',
                    'description' => 'Shared from ' . ($transaction->particulars ?? 'Transaction #' . $transaction->id),
                    'amount' => $split->amount,
                    'reference' => 'Transaction #' . $transaction->id,
                    'transaction_id' => $transaction->id,
                    'member_id' => $member->id,
                    'member_name' => $member->name,
                    'is_split' => true,
                    'statement_id' => $transaction->bank_statement_id,
                    'statement_name' => optional($transaction->bankStatement)->filename,
                ];
            })->filter())
            ->merge($monthlyInvoices->values())
            ->sortByDesc('date')
            ->values();

        $monthlyTotals = $statementCollection
            ->groupBy(fn ($entry) => Carbon::parse($entry['date'])->format('Y-m'))
            ->sortKeysDesc()
            ->map(function ($group, $label) {
                // Calculate amount for each entry (handles both amount and credit/debit properties)
                $getAmount = fn($entry) => $entry['amount'] ?? ($entry['credit'] - $entry['debit']);
                
                $contributions = $group->sum(fn($entry) => max(0, $getAmount($entry)));
                $expensesSum = $group->sum(fn($entry) => min(0, $getAmount($entry)));
                $net = $group->sum(fn($entry) => $getAmount($entry));

                return [
                    'month_key' => $label,
                    'label' => Carbon::createFromFormat('Y-m', $label)->format('M Y'),
                    'contributions' => round($contributions, 2),
                    'expenses' => round(abs($expensesSum), 2),
                    'net' => round($net, 2),
                ];
            })
            ->values();

        // Calculate total invoices and pending invoices
        $totalInvoices = $member->invoices()->sum('amount');
        $pendingInvoices = $member->invoices()->whereIn('status', ['pending', 'overdue'])->sum('amount');
        
        $summary = [
            'total_contributions' => $member->total_contributions,
            'expected_contributions' => $member->expected_contributions,
            'contribution_status' => $member->contribution_status,
            'contribution_status_label' => $member->contribution_status_label,
            'contribution_status_color' => $member->contribution_status_color,
            'total_expenses' => round($expenses->sum(fn ($expense) => $expense->pivot->amount ?? 0), 2),
            'total_invoices' => round($totalInvoices, 2),
            'pending_invoices' => round($pendingInvoices, 2),
        ];

        return [
            'collection' => $statementCollection,
            'monthly_totals' => $monthlyTotals,
            'summary' => $summary,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'month' => $monthFilter,
            ],
            'range_label' => $this->formatRangeLabel($startDate, $endDate, $monthFilter),
        ];
    }

    protected function formatRangeLabel(?string $startDate, ?string $endDate, ?string $monthFilter): string
    {
        if ($monthFilter) {
            return Carbon::createFromFormat('Y-m', $monthFilter)->format('F Y');
        }

        if ($startDate && $endDate) {
            return Carbon::parse($startDate)->format('d M Y') . ' - ' . Carbon::parse($endDate)->format('d M Y');
        }

        if ($startDate) {
            return 'From ' . Carbon::parse($startDate)->format('d M Y');
        }

        if ($endDate) {
            return 'Until ' . Carbon::parse($endDate)->format('d M Y');
        }

        return 'All Time';
    }

    protected function exportStatementPdf(Member $member, Collection $entries, array $data)
    {
        // Calculate first transaction date if not set
        if (!$member->date_of_registration && $data['collection']->isNotEmpty()) {
            $firstTransaction = $data['collection']
                ->filter(fn($entry) => in_array($entry['type'], ['contribution', 'shared_contribution', 'manual_contribution']))
                ->sortBy('date')
                ->first();
            if ($firstTransaction) {
                $member->date_of_registration = $firstTransaction['date'];
            }
        }

        // Get logo path and app name
        $logoPath = null;
        $appName = 'Evimeria Initiative';
        $appTagline = '1000 For A 1000';
        
        try {
            $settingLogoPath = \App\Models\Setting::get('logo_path');
            if ($settingLogoPath && \Illuminate\Support\Facades\Storage::disk('public')->exists($settingLogoPath)) {
                $logoPath = \Illuminate\Support\Facades\Storage::disk('public')->path($settingLogoPath);
            }
            
            $appName = \App\Models\Setting::get('app_name', 'Evimeria Initiative');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Error getting settings for PDF: ' . $e->getMessage());
        }

        $filename = $this->buildExportFilename($member->name, $data['filters']['month'] ?? null, 'pdf');
        return $this->renderPdf('exports.member_statement', [
            'member' => $member,
            'entries' => $entries,
            'summary' => $data['summary'],
            'monthlyTotals' => $data['monthly_totals'],
            'rangeLabel' => $data['range_label'],
            'generatedAt' => now(),
            'logoPath' => $logoPath,
            'appName' => $appName,
            'appTagline' => $appTagline,
        ], $filename);
    }

    protected function exportStatementExcel(Member $member, Collection $entries, array $data)
    {
        // Calculate first transaction date if not set
        if (!$member->date_of_registration && $data['collection']->isNotEmpty()) {
            $firstTransaction = $data['collection']
                ->filter(fn($entry) => in_array($entry['type'], ['contribution', 'shared_contribution', 'manual_contribution']))
                ->sortBy('date')
                ->first();
            if ($firstTransaction) {
                $member->date_of_registration = $firstTransaction['date'];
            }
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        $sheet->setCellValue('A1', 'Member Statement');
        $sheet->mergeCells('A1:F1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);

        $sheet->setCellValue('A2', 'Member: ' . $member->name);
        $sheet->mergeCells('A2:F2');
        $sheet->setCellValue('A3', 'Period: ' . $data['range_label']);
        $sheet->mergeCells('A3:F3');
        $registrationDate = $member->date_of_registration ? Carbon::parse($member->date_of_registration)->format('d-M-Y') : '-';
        $sheet->setCellValue('A4', 'Registration Date: ' . $registrationDate);
        $sheet->mergeCells('A4:F4');

        $headers = ['Date', 'Type', 'Description', 'Reference', 'Amount (KES)'];
        $sheet->fromArray($headers, null, 'A6');
        $sheet->getStyle('A6:E6')->getFont()->setBold(true);

        $row = 7;
        foreach ($entries as $entry) {
            // Handle both 'amount' property and 'credit'/'debit' properties
            $amount = isset($entry['amount']) 
                ? (float) $entry['amount'] 
                : (float) (($entry['credit'] ?? 0) - ($entry['debit'] ?? 0));
            
            $sheet->setCellValue('A' . $row, Carbon::parse($entry['date'])->format('d-M-Y'));
            $sheet->setCellValue('B' . $row, ucwords(str_replace('_', ' ', $entry['type'])));
            $sheet->setCellValue('C' . $row, $entry['description']);
            $sheet->setCellValue('D' . $row, $entry['reference'] ?? '-');
            $sheet->setCellValue('E' . $row, $amount);
            $row++;
        }

        foreach (range('A', 'E') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        $filename = $this->buildExportFilename($member->name, $data['filters']['month'] ?? null, 'xlsx');
        $tempFile = tempnam(sys_get_temp_dir(), 'stmt_excel_');
        (new Xlsx($spreadsheet))->save($tempFile);

        return response()->download($tempFile, $filename)->deleteFileAfterSend(true);
    }

    protected function exportBulkStatementsExcel(Collection $payload, array $filters)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        $sheet->setCellValue('A1', 'All Member Statements');
        $sheet->mergeCells('A1:G1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);

        $headers = ['Member Name', 'Phone Number', 'Date', 'Type', 'Description', 'Reference', 'Amount (KES)'];
        $sheet->fromArray($headers, null, 'A3');
        $sheet->getStyle('A3:G3')->getFont()->setBold(true);

        $row = 4;
        foreach ($payload as $item) {
            /** @var Member $member */
            $member = $item['member'];
            $entries = $item['data']['collection'];

            foreach ($entries as $entry) {
                $sheet->setCellValue('A' . $row, $member->name);
                $sheet->setCellValue('B' . $row, $member->phone ?? '-');
                $sheet->setCellValue('C' . $row, Carbon::parse($entry['date'])->format('d-M-Y'));
                $sheet->setCellValue('D' . $row, ucwords(str_replace('_', ' ', $entry['type'])));
                $sheet->setCellValue('E' . $row, $entry['description']);
                $sheet->setCellValue('F' . $row, $entry['reference'] ?? '-');
                $sheet->setCellValue('G' . $row, (float) $entry['amount']);
                $row++;
            }
        }

        foreach (range('A', 'G') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        $filename = 'member-statements-' . ($filters['month'] ?? now()->format('Ymd_His')) . '.xlsx';
        $tempFile = tempnam(sys_get_temp_dir(), 'bulk_stmt_excel_');
        (new Xlsx($spreadsheet))->save($tempFile);

        return response()->download($tempFile, $filename)->deleteFileAfterSend(true);
    }

    protected function exportBulkStatementsPdf(Collection $payload, array $filters)
    {
        $filename = 'member-statements-' . ($filters['month'] ?? now()->format('Ymd_His')) . '.pdf';
        return $this->renderPdf('exports.bulk_member_statements', [
            'items' => $payload,
            'generatedAt' => now(),
            'rangeLabel' => $this->formatRangeLabel($filters['start_date'] ?? null, $filters['end_date'] ?? null, $filters['month'] ?? null),
        ], $filename);
    }

    protected function renderPdf(string $view, array $data, string $filename, string $paper = 'a4', string $orientation = 'portrait')
    {
        $html = view($view, $data)->render();

        $options = new Options();
        $options->set('isRemoteEnabled', true);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper($paper, $orientation);
        $dompdf->render();

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    protected function buildExportFilename(?string $memberName, ?string $monthFilter, string $extension): string
    {
        $slug = Str::slug($memberName ?: 'member');
        $suffix = $monthFilter ? $monthFilter : now()->format('Ymd_His');

        return "{$slug}-statement-{$suffix}.{$extension}";
    }

    public function update(Request $request, Member $member)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'secondary_phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'gender' => 'nullable|string|in:male,female,other',
            'next_of_kin_name' => 'nullable|string|max:255',
            'next_of_kin_phone' => 'nullable|string|max:255',
            'next_of_kin_relationship' => 'nullable|string|max:255',
            'member_code' => 'nullable|string|max:50|unique:members,member_code,' . $member->id,
            'member_number' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $member->update($validated);

        return response()->json($member);
    }

    public function destroy(Member $member)
    {
        $member->delete();

        return response()->json(['message' => 'Member deleted successfully']);
    }

    public function bulkUpload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
        ]);

        $file = $request->file('file');
        $handle = fopen($file->getRealPath(), 'r');
        
        $header = fgetcsv($handle);
        $header = array_map('strtolower', array_map('trim', $header));

        $required = ['name'];
        $errors = [];
        $success = 0;

        $rowNum = 1;
        while (($row = fgetcsv($handle)) !== false) {
            $rowNum++;
            $data = array_combine($header, $row);

            $validator = Validator::make($data, [
                'name' => 'required|string',
                'phone' => 'nullable|string',
                'email' => 'nullable|email',
                'member_code' => 'nullable|string|unique:members',
                'member_number' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                $errors[] = "Row {$rowNum}: " . implode(', ', $validator->errors()->all());
                continue;
            }

            try {
                Member::create([
                    'name' => $data['name'],
                    'phone' => $data['phone'] ?? null,
                    'email' => $data['email'] ?? null,
                    'member_code' => $data['member_code'] ?? null,
                    'member_number' => $data['member_number'] ?? null,
                    'is_active' => true,
                ]);
                $success++;
            } catch (\Exception $e) {
                $errors[] = "Row {$rowNum}: " . $e->getMessage();
            }
        }

        fclose($handle);

        return response()->json([
            'success' => $success,
            'errors' => $errors,
            'message' => "Imported {$success} members" . (count($errors) > 0 ? " with " . count($errors) . " errors" : ""),
        ]);
    }

    protected function exportInvestmentPdf(Member $member, $investments)
    {
        $filename = $this->buildExportFilename($member->name . '-investments', null, 'pdf');
        return $this->renderPdf('exports.member_investment_report', [
            'member' => $member,
            'investments' => $investments,
            'generatedAt' => now(),
        ], $filename);
    }

    protected function exportInvestmentExcel(Member $member, $investments)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        $sheet->setCellValue('A1', 'Investment Report');
        $sheet->mergeCells('A1:E1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);

        $sheet->setCellValue('A2', 'Member: ' . $member->name);
        $sheet->mergeCells('A2:E2');
        $sheet->setCellValue('A3', 'Generated: ' . now()->format('Y-m-d H:i:s'));
        $sheet->mergeCells('A3:E3');

        $headers = ['Date', 'Principal Amount', 'Interest Rate', 'Status', 'Notes'];
        $sheet->fromArray($headers, null, 'A5');
        $sheet->getStyle('A5:E5')->getFont()->setBold(true);

        $row = 6;
        $totalAmount = 0;
        foreach ($investments as $investment) {
            $sheet->setCellValue('A' . $row, $investment->start_date ? Carbon::parse($investment->start_date)->format('d-M-Y') : 'N/A');
            $sheet->setCellValue('B' . $row, (float) ($investment->principal_amount ?? 0));
            $sheet->setCellValue('C' . $row, (float) ($investment->expected_roi_rate ?? 0));
            $sheet->setCellValue('D' . $row, ucfirst($investment->status ?? 'active'));
            $sheet->setCellValue('E' . $row, $investment->description ?? '-');
            $totalAmount += (float) ($investment->principal_amount ?? 0);
            $row++;
        }

        // Add total row
        $sheet->setCellValue('A' . $row, 'Total');
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);
        $sheet->setCellValue('B' . $row, $totalAmount);
        $sheet->getStyle('B' . $row)->getFont()->setBold(true);

        foreach (range('A', 'E') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        $filename = $this->buildExportFilename($member->name . '-investments', null, 'xlsx');
        $tempFile = tempnam(sys_get_temp_dir(), 'inv_excel_');
        (new Xlsx($spreadsheet))->save($tempFile);

        return response()->download($tempFile, $filename)->deleteFileAfterSend(true);
    }
}

