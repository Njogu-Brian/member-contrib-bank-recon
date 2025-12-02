<?php

namespace App\Http\Controllers;

use App\Jobs\SendContributionReminder;
use App\Jobs\SendMonthlyStatement;
use App\Models\Member;
use App\Models\WhatsAppLog;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(
        private readonly WhatsAppService $whatsappService
    ) {
    }

    /**
     * Send WhatsApp message
     */
    public function sendWhatsApp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'message' => 'required|string|max:1000',
            'member_id' => 'nullable|exists:members,id',
        ]);

        $result = $this->whatsappService->send(
            $validated['phone'],
            $validated['message'],
            $validated['member_id'] ?? null
        );

        return response()->json([
            'message' => $result['success'] ? 'WhatsApp message sent successfully' : 'Failed to send WhatsApp message',
            'result' => $result,
        ], $result['success'] ? 200 : 422);
    }

    /**
     * Send monthly statements to all members
     */
    public function sendMonthlyStatements(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'month' => 'nullable|date_format:Y-m',
            'channel' => 'nullable|in:sms,whatsapp',
            'member_ids' => 'nullable|array',
        ]);

        $channel = $validated['channel'] ?? 'sms';
        $month = $validated['month'] ?? now()->format('Y-m');

        $members = Member::where('is_active', true)
            ->when($validated['member_ids'] ?? null, function ($q, $ids) {
                $q->whereIn('id', $ids);
            })
            ->whereNotNull('phone')
            ->get();

        $sent = 0;
        $failed = 0;

        foreach ($members as $member) {
            try {
                $statementLink = route('api.v1.public.statement', [
                    'token' => $member->getPublicShareToken(),
                ]);

                SendMonthlyStatement::dispatch($member, $statementLink, $channel);
                $sent++;
            } catch (\Exception $e) {
                $failed++;
            }
        }

        return response()->json([
            'message' => 'Monthly statements queued for sending',
            'sent' => $sent,
            'failed' => $failed,
            'total' => $members->count(),
        ]);
    }

    /**
     * Send contribution reminders
     */
    public function sendContributionReminders(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'channel' => 'nullable|in:sms,whatsapp',
            'member_ids' => 'nullable|array',
        ]);

        $channel = $validated['channel'] ?? 'sms';

        $members = Member::where('is_active', true)
            ->when($validated['member_ids'] ?? null, function ($q, $ids) {
                $q->whereIn('id', $ids);
            })
            ->whereNotNull('phone')
            ->get();

        $sent = 0;
        $failed = 0;

        foreach ($members as $member) {
            try {
                $expectedAmount = $member->expected_contributions - $member->total_contributions;
                
                if ($expectedAmount > 0) {
                    SendContributionReminder::dispatch($member, $expectedAmount, $channel);
                    $sent++;
                }
            } catch (\Exception $e) {
                $failed++;
            }
        }

        return response()->json([
            'message' => 'Contribution reminders queued for sending',
            'sent' => $sent,
            'failed' => $failed,
            'total' => $members->count(),
        ]);
    }

    /**
     * Get WhatsApp logs
     */
    public function getWhatsAppLogs(Request $request): JsonResponse
    {
        $query = WhatsAppLog::with('member')
            ->orderBy('created_at', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('member_id')) {
            $query->where('member_id', $request->member_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $logs = $query->paginate($request->get('per_page', 50));

        return response()->json($logs);
    }
}

