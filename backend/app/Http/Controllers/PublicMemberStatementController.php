<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\Setting;
use App\Services\MemberStatementService;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

class PublicMemberStatementController extends Controller
{
    public function __construct(
        protected MemberStatementService $statementService
    ) {
    }

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

        $member = $this->resolveActiveMember($token);
        if ($member instanceof \Illuminate\Http\JsonResponse) {
            return $member;
        }

        // Check if profile is complete (including pending changes) - if not, require update first
        if (!$member->isProfileCompleteWithPending()) {
            return response()->json([
                'error' => 'Profile Incomplete',
                'message' => 'Please complete your profile before viewing your statement.',
                'requires_profile_update' => true,
                'missing_fields' => $member->getMissingProfileFields(),
            ], 403);
        }

        // Update access tracking
        $member->increment('public_share_access_count');
        $member->update(['public_share_last_accessed_at' => now()]);

        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'month' => 'nullable|date_format:Y-m',
            'per_page' => 'nullable|integer|min:1|max:500',
            'page' => 'nullable|integer|min:1',
        ]);

        $data = $this->statementService->buildStatementData($member, $validated);
        $collection = $data['collection_with_balance'];

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

        $contactPhone = Setting::get('contact_phone', null);
        $mpesaPaybill = Setting::get('mpesa_paybill', '4165387');

        return response()->json([
            'member' => [
                'id' => $member->id,
                'name' => $member->name,
                'member_code' => $member->member_code,
                'member_number' => $member->member_number,
                'phone' => $member->phone,
                'email' => $member->email,
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
            'mpesa_paybill' => $mpesaPaybill,
        ]);
    }

    /**
     * Export public statement as PDF with all transactions and running balances.
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

        $member = $this->resolveActiveMember($token);
        if ($member instanceof \Illuminate\Http\JsonResponse) {
            return $member;
        }

        if (!$member->isProfileCompleteWithPending()) {
            return response()->json([
                'error' => 'Profile Incomplete',
                'message' => 'Please complete your profile before downloading your statement.',
                'requires_profile_update' => true,
                'missing_fields' => $member->getMissingProfileFields(),
            ], 403);
        }

        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'month' => 'nullable|date_format:Y-m',
        ]);

        $data = $this->statementService->buildStatementData($member, $validated);
        $entries = $data['collection_with_balance'];

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
            Log::warning('Error getting settings for PDF: ' . $e->getMessage());
        }

        $contactPhone = Setting::get('contact_phone', null);
        $filename = $this->statementService->buildExportFilename($member->name, $validated['month'] ?? null, 'pdf');

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
            'contactPhone' => $contactPhone,
        ], $filename);
    }

    /**
     * Resolve an active member by public share token, or return a JSON error response.
     */
    protected function resolveActiveMember(string $token): Member|\Illuminate\Http\JsonResponse
    {
        $member = Member::where('public_share_token', $token)
            ->where('is_active', true)
            ->first();

        if (!$member) {
            Log::warning('Invalid public statement token attempted', [
                'token' => substr($token, 0, 8) . '...',
                'ip' => request()->ip(),
            ]);
            return response()->json([
                'error' => 'Invalid or expired link',
                'message' => 'This statement link is invalid or has expired.',
            ], 404);
        }

        if ($member->public_share_token_expires_at && now()->greaterThan($member->public_share_token_expires_at)) {
            Log::warning('Expired public statement token accessed', [
                'member_id' => $member->id,
                'token' => substr($token, 0, 8) . '...',
                'ip' => request()->ip(),
            ]);
            return response()->json([
                'error' => 'Expired link',
                'message' => 'This statement link has expired. Please request a new one.',
            ], 410);
        }

        return $member;
    }

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
