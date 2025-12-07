<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Log;
use Dompdf\Dompdf;
use Dompdf\Options;
use Carbon\Carbon;

class PublicMemberStatementController extends Controller
{
    /**
     * Display public member statement view (no authentication required)
     * Accessible via: /public/statement/{token}
     */
    public function show(Request $request, string $token)
    {
        // Rate limiting: max 10 requests per minute per IP
        $key = 'public-statement:' . $request->ip() . ':' . $token;
        if (RateLimiter::tooManyAttempts($key, 10)) {
            return response()->json([
                'error' => 'Too many requests',
                'message' => 'Please wait a moment before trying again.',
            ], 429);
        }
        RateLimiter::hit($key, 60); // 1 minute window

        $member = Member::where('public_share_token', $token)
            ->where('is_active', true)
            ->first();

        if (!$member) {
            Log::warning('Invalid public statement token attempted', [
                'token' => substr($token, 0, 8) . '...',
                'ip' => $request->ip(),
            ]);
            return response()->json([
                'error' => 'Invalid or expired link',
                'message' => 'This statement link is invalid or has expired.',
            ], 404);
        }

        // Check if token has expired (if expiration is set)
        if ($member->public_share_token_expires_at && now()->greaterThan($member->public_share_token_expires_at)) {
            Log::warning('Expired public statement token accessed', [
                'member_id' => $member->id,
                'token' => substr($token, 0, 8) . '...',
                'ip' => $request->ip(),
            ]);
            return response()->json([
                'error' => 'Expired link',
                'message' => 'This statement link has expired. Please request a new one.',
            ], 410); // 410 Gone
        }

        // Check if profile is complete (including pending changes) - if not, require update first
        if (!$member->isProfileCompleteWithPending()) {
            return response()->json([
                'error' => 'Profile Incomplete',
                'message' => 'Please complete your profile before viewing your statement.',
                'requires_profile_update' => true,
                'missing_fields' => $member->getMissingProfileFields(),
            ], 403); // 403 Forbidden
        }

        // Update access tracking
        $member->increment('public_share_access_count');
        $member->update(['public_share_last_accessed_at' => now()]);

        // Build statement data (same logic as MemberController::statement)
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

        // Get contact phone from settings
        $contactPhone = \App\Models\Setting::get('contact_phone', null);

        return response()->json([
            'member' => [
                'id' => $member->id,
                'name' => $member->name,
                'member_code' => $member->member_code,
                'member_number' => $member->member_number,
                'phone' => $member->phone,
                'email' => $member->email,
                // Don't expose sensitive data in public view
            ],
            'statement' => $paginatedStatement->items(),
            'summary' => $data['summary'],
            'pagination' => [
                'current_page' => $paginatedStatement->currentPage(),
                'per_page' => $paginatedStatement->perPage(),
                'total' => $paginatedStatement->total(),
                'last_page' => $paginatedStatement->lastPage(),
            ],
            'monthly_totals' => $data['monthly_totals'],
            'print_date' => now()->toIso8601String(),
            'contact_phone' => $contactPhone,
        ]);
    }

    /**
     * Export public statement as PDF
     */
    public function exportPdf(Request $request, string $token)
    {
        // Rate limiting: max 5 PDF exports per hour per IP
        $key = 'public-statement-pdf:' . $request->ip() . ':' . $token;
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json([
                'error' => 'Too many requests',
                'message' => 'Please wait before downloading another PDF.',
            ], 429);
        }
        RateLimiter::hit($key, 3600); // 1 hour window

        $member = Member::where('public_share_token', $token)
            ->where('is_active', true)
            ->first();

        if (!$member) {
            return response()->json([
                'error' => 'Invalid or expired link',
                'message' => 'This statement link is invalid or has expired.',
            ], 404);
        }

        // Check if token has expired (if expiration is set)
        if ($member->public_share_token_expires_at && now()->greaterThan($member->public_share_token_expires_at)) {
            return response()->json([
                'error' => 'Expired link',
                'message' => 'This statement link has expired. Please request a new one.',
            ], 410); // 410 Gone
        }

        // Check if profile is complete (including pending changes) - if not, require update first
        if (!$member->isProfileCompleteWithPending()) {
            return response()->json([
                'error' => 'Profile Incomplete',
                'message' => 'Please complete your profile before downloading your statement.',
                'requires_profile_update' => true,
                'missing_fields' => $member->getMissingProfileFields(),
            ], 403); // 403 Forbidden
        }

        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'month' => 'nullable|date_format:Y-m',
        ]);

        $data = $this->buildStatementData($member, $validated);
        $entries = $data['collection'];

        // Get logo path and app settings for PDF
        $logoPath = null;
        $appName = 'Evimeria Initiative';
        $appTagline = '1000 For A 1000';
        
        try {
            $settingLogoPath = Setting::get('logo_path');
            if ($settingLogoPath && \Illuminate\Support\Facades\Storage::disk('public')->exists($settingLogoPath)) {
                $logoPath = \Illuminate\Support\Facades\Storage::disk('public')->path($settingLogoPath);
            }
            
            $appName = Setting::get('app_name', 'Evimeria Initiative');
            $appTagline = Setting::get('app_tagline', '1000 For A 1000');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Error getting settings for PDF: ' . $e->getMessage());
        }

        // Get contact phone for footer
        $contactPhone = Setting::get('contact_phone', null);

        $filename = $this->buildExportFilename($member->name, $validated['month'] ?? null, 'pdf');
        
        return $this->renderPdf('exports.public_member_statement', [
            'member' => $member,
            'entries' => $entries,
            'summary' => $data['summary'],
            'monthlyTotals' => $data['monthly_totals'],
            'rangeLabel' => $this->formatRangeLabel(
                $validated['start_date'] ?? null,
                $validated['end_date'] ?? null,
                $validated['month'] ?? null
            ),
            'generatedAt' => now(),
            'printDate' => now(),
            'logoPath' => $logoPath,
            'appName' => $appName,
            'appTagline' => $appTagline,
            'contactPhone' => $contactPhone,
        ], $filename);
    }

    /**
     * Build statement data (simplified version for public view)
     */
    protected function buildStatementData(Member $member, array $filters = []): array
    {
        $startDate = $filters['start_date'] ?? null;
        $endDate = $filters['end_date'] ?? null;
        $monthFilter = $filters['month'] ?? null;

        if ($monthFilter) {
            $month = \Carbon\Carbon::createFromFormat('Y-m', $monthFilter);
            $startDate = $month->copy()->startOfMonth()->toDateString();
            $endDate = $month->copy()->endOfMonth()->toDateString();
        }

        $transactions = $member->transactions()
            ->with(['splits', 'bankStatement'])
            ->whereNotIn('assignment_status', ['unassigned', 'duplicate'])
            ->where('is_archived', false)
            ->when($startDate, fn ($q) => $q->where('tran_date', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->where('tran_date', '<=', $endDate))
            ->orderBy('tran_date', 'desc')
            ->get();

        $manualContributions = $member->manualContributions()
            ->when($startDate, fn ($q) => $q->where('contribution_date', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->where('contribution_date', '<=', $endDate))
            ->orderBy('contribution_date', 'desc')
            ->get();

        $splits = $member->transactionSplits()
            ->with(['transaction' => function ($query) {
                $query->select('id', 'bank_statement_id', 'tran_date', 'particulars', 'transaction_code')
                      ->with('bankStatement:id,filename');
            }])
            ->whereHas('transaction', function ($query) use ($startDate, $endDate) {
                $query->whereNotIn('assignment_status', ['unassigned', 'duplicate'])
                      ->where('is_archived', false)
                      ->when($startDate, fn ($q) => $q->where('tran_date', '>=', $startDate))
                      ->when($endDate, fn ($q) => $q->where('tran_date', '<=', $endDate));
            })
            ->get();

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
                    'amount' => $ownerAmount,
                    'reference' => $t->transaction_code ?? ('Transaction #' . $t->id),
                    'source' => $t->transaction_type ?? 'Bank',
                ];
            })->filter())
            ->merge($manualContributions->map(fn ($mc) => [
                'date' => $mc->contribution_date,
                'type' => 'manual_contribution',
                'description' => 'Manual Contribution' . ($mc->notes ? ' - ' . $mc->notes : ''),
                'amount' => $mc->amount,
                'reference' => $mc->reference ?? ('Manual #' . $mc->id),
                'source' => 'Manual Entry',
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
                    'reference' => $transaction->transaction_code ?? ('Transaction #' . $transaction->id),
                    'source' => 'Shared Transaction',
                ];
            })->filter())
            ->sortByDesc('date')
            ->values();

        $monthlyTotals = $statementCollection
            ->groupBy(fn ($entry) => \Carbon\Carbon::parse($entry['date'])->format('Y-m'))
            ->sortKeysDesc()
            ->map(function ($group, $label) {
                $contributions = $group->where('amount', '>=', 0)->sum('amount');
                return [
                    'month_key' => $label,
                    'label' => \Carbon\Carbon::createFromFormat('Y-m', $label)->format('M Y'),
                    'contributions' => round($contributions, 2),
                    'net' => round($group->sum('amount'), 2),
                ];
            })
            ->values();

        $summary = [
            'total_contributions' => (float) $member->total_contributions,
            'expected_contributions' => (float) $member->expected_contributions,
            'difference' => (float) $member->total_contributions - (float) $member->expected_contributions,
            'contribution_status' => $member->contribution_status_label,
            'period_total' => $statementCollection->sum('amount'),
        ];

        return [
            'collection' => $statementCollection,
            'summary' => $summary,
            'monthly_totals' => $monthlyTotals,
        ];
    }

    /**
     * Format range label for display
     */
    protected function formatRangeLabel(?string $startDate, ?string $endDate, ?string $month): string
    {
        if ($month) {
            $date = Carbon::createFromFormat('Y-m', $month);
            return $date->format('F Y');
        }
        if ($startDate && $endDate) {
            $start = Carbon::parse($startDate);
            $end = Carbon::parse($endDate);
            if ($start->format('Y-m') === $end->format('Y-m')) {
                return $start->format('F Y');
            }
            return $start->format('M d, Y') . ' - ' . $end->format('M d, Y');
        }
        return 'All Time';
    }

    /**
     * Build export filename
     */
    protected function buildExportFilename(string $memberName, ?string $month, string $ext): string
    {
        $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $memberName);
        $datePart = $month ? Carbon::createFromFormat('Y-m', $month)->format('Y-m') : now()->format('Y-m');
        return "statement_{$safeName}_{$datePart}.{$ext}";
    }

    /**
     * Render PDF
     */
    protected function renderPdf(string $view, array $data, string $filename, string $paper = 'a4', string $orientation = 'portrait')
    {
        $html = view($view, $data)->render();

        $options = new Options();
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper($paper, $orientation);
        $dompdf->render();

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }
}
