<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\EmailLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class EmailController extends Controller
{
    /**
     * Send bulk email to selected members or custom emails
     */
    public function sendBulk(Request $request)
    {
        $request->validate([
            'member_ids' => 'required_without:custom_emails|array',
            'member_ids.*' => 'exists:members,id',
            'custom_emails' => 'required_without:member_ids|array',
            'custom_emails.*' => 'email',
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
            'include_contribution_status' => 'boolean',
            'include_statement_link' => 'boolean',
        ]);

        $recipients = [];
        $members = collect();

        // Process member IDs
        if ($request->has('member_ids') && !empty($request->member_ids)) {
            $members = Member::whereIn('id', $request->member_ids)
                ->where('is_active', true)
                ->get();

            foreach ($members as $member) {
                if (!$member->email) {
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
                    'email' => $member->email,
                    'subject' => $request->subject,
                    'message' => $request->message,
                    'member_id' => $member->id,
                    'member_name' => $member->name,
                    'member_data' => $memberData,
                ];
            }
        }

        // Process custom email addresses
        if ($request->has('custom_emails') && !empty($request->custom_emails)) {
            foreach ($request->custom_emails as $email) {
                $recipients[] = [
                    'email' => $email,
                    'subject' => $request->subject,
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

        // Get base URL for statement links
        $baseUrl = null;
        if ($request->boolean('include_statement_link')) {
            $url = env('FRONTEND_URL', config('app.url', 'http://localhost:5173'));
            if (!preg_match('/^https?:\/\//', $url)) {
                $url = 'https://' . ltrim($url, '/');
            }
            $baseUrl = rtrim($url, '/');
        }

        $success = 0;
        $failed = 0;
        $details = [];

        foreach ($recipients as $recipient) {
            try {
                $processedMessage = $this->processMessage($recipient, $request->message, $baseUrl);
                $processedSubject = $this->processMessage($recipient, $request->subject, $baseUrl);

                Mail::raw($processedMessage, function ($mail) use ($recipient, $processedSubject) {
                    $mail->to($recipient['email'])
                         ->subject($processedSubject);
                });

                $success++;
                $details[] = [
                    'email' => $recipient['email'],
                    'success' => true,
                    'processed_message' => $processedMessage,
                ];

                // Log email
                EmailLog::create([
                    'member_id' => $recipient['member_id'],
                    'email' => $recipient['email'],
                    'subject' => $processedSubject,
                    'message' => $processedMessage,
                    'status' => 'sent',
                    'sent_by' => $request->user()->id,
                    'sent_at' => now(),
                ]);
            } catch (\Exception $e) {
                $failed++;
                $details[] = [
                    'email' => $recipient['email'],
                    'success' => false,
                    'error' => $e->getMessage(),
                ];

                // Log failed email
                EmailLog::create([
                    'member_id' => $recipient['member_id'],
                    'email' => $recipient['email'],
                    'subject' => $request->subject,
                    'message' => $request->message,
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                    'sent_by' => $request->user()->id,
                ]);

                Log::error('Failed to send bulk email', [
                    'email' => $recipient['email'],
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Email sent to {$success} of " . count($recipients) . " recipients",
            'results' => [
                'total' => count($recipients),
                'success' => $success,
                'failed' => $failed,
                'details' => $details,
            ],
        ]);
    }

    /**
     * Process message with placeholders
     */
    protected function processMessage(array $recipient, string $message, ?string $baseUrl = null): string
    {
        $memberData = $recipient['member_data'] ?? null;
        
        if (!$memberData) {
            return $message;
        }

        $replacements = [
            '{name}' => $memberData['name'] ?? '',
            '{phone}' => $memberData['phone'] ?? '',
            '{email}' => $memberData['email'] ?? '',
            '{member_code}' => $memberData['member_code'] ?? '',
            '{member_number}' => $memberData['member_number'] ?? '',
            '{total_contributions}' => number_format($memberData['total_contributions'] ?? 0, 2),
            '{contribution_status}' => $memberData['contribution_status'] ?? 'Unknown',
            '{contribution_difference}' => number_format(
                ($memberData['total_contributions'] ?? 0) - ($memberData['total_invoices'] ?? 0),
                2
            ),
            '{total_invoices}' => number_format($memberData['total_invoices'] ?? 0, 2),
            '{pending_invoices}' => number_format($memberData['pending_invoices'] ?? 0, 2),
            '{overdue_invoices}' => number_format($memberData['overdue_invoices'] ?? 0, 2),
            '{paid_invoices}' => number_format($memberData['paid_invoices'] ?? 0, 2),
            '{pending_invoice_count}' => $memberData['pending_invoice_count'] ?? 0,
            '{oldest_invoice_number}' => $memberData['oldest_invoice_number'] ?? '',
            '{oldest_invoice_due_date}' => $memberData['oldest_invoice_due_date'] ?? '',
        ];

        if ($baseUrl && $memberData['id']) {
            $member = Member::find($memberData['id']);
            if ($member && $member->public_share_token) {
                $replacements['{statement_link}'] = $baseUrl . '/s/' . $member->public_share_token;
            } else {
                $replacements['{statement_link}'] = 'Statement link not available';
            }
        } else {
            $replacements['{statement_link}'] = '';
        }

        $processed = $message;
        foreach ($replacements as $placeholder => $value) {
            $processed = str_replace($placeholder, $value, $processed);
        }

        return $processed;
    }

    /**
     * Get email logs
     */
    public function logs(Request $request)
    {
        $query = EmailLog::with(['member', 'sentBy'])
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
                $q->where('email', 'like', "%{$search}%")
                  ->orWhere('subject', 'like', "%{$search}%")
                  ->orWhere('message', 'like', "%{$search}%")
                  ->orWhere('error', 'like', "%{$search}%")
                  ->orWhereHas('member', function ($memberQuery) use ($search) {
                      $memberQuery->where('name', 'like', "%{$search}%")
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
     * Get email statistics
     */
    public function statistics(Request $request)
    {
        $query = EmailLog::query();

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

