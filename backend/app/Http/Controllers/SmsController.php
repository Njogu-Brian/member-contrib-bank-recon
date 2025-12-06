<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\SmsLog;
use App\Services\SmsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SmsController extends Controller
{
    protected $smsService;

    public function __construct(SmsService $smsService)
    {
        $this->smsService = $smsService;
    }

    /**
     * Send bulk SMS to selected members or custom numbers
     */
    public function sendBulk(Request $request)
    {
        $request->validate([
            'member_ids' => 'required_without:custom_numbers|array',
            'member_ids.*' => 'exists:members,id',
            'custom_numbers' => 'required_without:member_ids|array',
            'custom_numbers.*' => 'string|regex:/^(\+?254|0)[0-9]{9}$/',
            'message' => 'required|string|max:1000',
            'sender_id' => 'nullable|string|max:11',
            'include_contribution_status' => 'boolean',
            'include_statement_link' => 'boolean',
        ]);

        if (!$this->smsService->isEnabled()) {
            return response()->json([
                'success' => false,
                'message' => 'SMS service is not enabled or configured',
            ], 422);
        }

        $recipients = [];
        $members = collect();

        // Process member IDs
        if ($request->has('member_ids') && !empty($request->member_ids)) {
            $members = Member::whereIn('id', $request->member_ids)
                ->where('is_active', true)
                ->get();

            foreach ($members as $member) {
                if (!$member->phone) {
                    continue;
                }

                // Get invoice data for this member
                $totalInvoices = $member->invoices()->sum('amount');
                $pendingInvoices = $member->invoices()->whereIn('status', ['pending', 'overdue'])->sum('amount');
                $overdueInvoices = $member->invoices()->where('status', 'overdue')->sum('amount');
                $paidInvoices = $member->invoices()->where('status', 'paid')->sum('amount');
                $invoiceCount = $member->invoices()->count();
                $pendingInvoiceCount = $member->invoices()->whereIn('status', ['pending', 'overdue'])->count();
                $oldestInvoice = $member->invoices()->whereIn('status', ['pending', 'overdue'])->orderBy('due_date', 'asc')->first();

                $memberData = [
                    'id' => $member->id,
                    'name' => $member->name,
                    'phone' => $member->phone,
                    'email' => $member->email,
                    'member_code' => $member->member_code,
                    'member_number' => $member->member_number,
                    'total_contributions' => (float) ($member->total_contributions ?? 0),
                    'contribution_status' => $member->contribution_status_label ?? 'Unknown',
                    'total_invoices' => (float) $totalInvoices,
                    'pending_invoices' => (float) $pendingInvoices,
                    'overdue_invoices' => (float) $overdueInvoices,
                    'paid_invoices' => (float) $paidInvoices,
                    'invoice_count' => $invoiceCount,
                    'pending_invoice_count' => $pendingInvoiceCount,
                    'oldest_invoice_number' => $oldestInvoice->invoice_number ?? '',
                    'oldest_invoice_due_date' => $oldestInvoice ? $oldestInvoice->due_date->format('M d, Y') : '',
                ];

                $recipients[] = [
                    'mobile' => $member->phone,
                    'message' => $request->message,
                    'member_id' => $member->id,
                    'member_name' => $member->name,
                    'member_data' => $memberData,
                ];
            }
        }

        // Process custom phone numbers
        if ($request->has('custom_numbers') && !empty($request->custom_numbers)) {
            foreach ($request->custom_numbers as $phone) {
                $recipients[] = [
                    'mobile' => $phone,
                    'message' => $request->message,
                    'member_id' => null,
                    'member_name' => null,
                    'member_data' => null,
                ];
            }
        }

        if (empty($recipients)) {
            return response()->json([
                'success' => false,
                'message' => 'No valid recipients found',
            ], 422);
        }

        // Get base URL for statement links - ensure it has protocol for SMS clickability
        $baseUrl = null;
        if ($request->boolean('include_statement_link')) {
            $url = env('FRONTEND_URL', config('app.url', 'http://localhost:5173'));
            // Ensure URL has protocol (http:// or https://) for SMS clickability
            if (!preg_match('/^https?:\/\//', $url)) {
                $url = 'https://' . ltrim($url, '/');
            }
            $baseUrl = rtrim($url, '/');
        }

        $results = $this->smsService->sendBulk($recipients, $request->message, $baseUrl);

        // Log SMS sends - always log both success and failures
        foreach ($results['details'] as $index => $detail) {
            if (isset($detail['mobile'])) {
                $recipient = $recipients[$index] ?? null;
                $member = $recipient && $recipient['member_id'] 
                    ? $members->firstWhere('id', $recipient['member_id'])
                    : null;

                // Determine status - use 'failed' for any non-success, not 'skipped'
                $status = $detail['success'] ? 'sent' : 'failed';
                
                // Ensure error message exists for failed attempts
                $errorMessage = null;
                if (!$detail['success']) {
                    $errorMessage = $detail['error'] ?? 'SMS sending failed';
                    // If status was 'skipped', change to 'failed'
                    if (isset($detail['status']) && $detail['status'] === 'skipped') {
                        $status = 'failed';
                    }
                }

                SmsLog::create([
                    'member_id' => $member?->id,
                    'phone' => $detail['mobile'],
                    'message' => $detail['processed_message'] ?? $request->message,
                    'status' => $status,
                    'response' => $detail['response'] ?? null,
                    'error' => $errorMessage,
                    'sent_by' => $request->user()->id,
                    'sent_at' => $detail['success'] ? now() : null,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => "SMS sent to {$results['success']} of {$results['total']} recipients",
            'results' => $results,
        ]);
    }

    /**
     * Send SMS to a single member
     */
    public function sendSingle(Request $request, Member $member)
    {
        $request->validate([
            'message' => 'required|string|max:1000',
            'sender_id' => 'nullable|string|max:11',
        ]);

        if (!$this->smsService->isEnabled()) {
            return response()->json([
                'success' => false,
                'message' => 'SMS service is not enabled or configured',
            ], 422);
        }

        if (!$member->phone) {
            return response()->json([
                'success' => false,
                'message' => 'Member does not have a phone number',
            ], 422);
        }

        $result = $this->smsService->send($member->phone, $request->message, $request->sender_id);

        // Log SMS
        SmsLog::create([
            'member_id' => $member->id,
            'phone' => $member->phone,
            'message' => $request->message,
            'status' => $result['success'] ? 'sent' : 'failed',
            'response' => $result['response'] ?? null,
            'error' => $result['error'] ?? null,
            'sent_by' => $request->user()->id,
        ]);

        return response()->json([
            'success' => $result['success'],
            'message' => $result['success'] ? 'SMS sent successfully' : 'Failed to send SMS',
            'result' => $result,
        ]);
    }

    /**
     * Get SMS logs
     */
    public function logs(Request $request)
    {
        $query = SmsLog::with(['member', 'sentBy'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('member_id')) {
            $query->where('member_id', $request->member_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->date_to);
        }

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('phone', 'like', "%{$search}%")
                  ->orWhere('message', 'like', "%{$search}%")
                  ->orWhere('error', 'like', "%{$search}%")
                  ->orWhereHas('member', function ($memberQuery) use ($search) {
                      $memberQuery->where('name', 'like', "%{$search}%")
                                  ->orWhere('phone', 'like', "%{$search}%")
                                  ->orWhere('email', 'like', "%{$search}%");
                  })
                  ->orWhereHas('sentBy', function ($userQuery) use ($search) {
                      $userQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $logs = $query->paginate($request->get('per_page', 25));

        return response()->json($logs);
    }

    /**
     * Get SMS statistics
     */
    public function statistics(Request $request)
    {
        $query = SmsLog::query();

        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->date_to);
        }

        $stats = [
            'total' => $query->count(),
            'sent' => (clone $query)->where('status', 'sent')->count(),
            'failed' => (clone $query)->where('status', 'failed')->count(),
            'today' => (clone $query)->whereDate('created_at', today())->count(),
            'this_week' => (clone $query)->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
            'this_month' => (clone $query)->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])->count(),
        ];

        return response()->json($stats);
    }
}

