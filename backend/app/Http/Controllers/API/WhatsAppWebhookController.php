<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\WhatsAppLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class WhatsAppWebhookController extends Controller
{
    /**
     * Verify webhook (for WhatsApp Business API)
     */
    public function verify(Request $request): JsonResponse
    {
        $mode = $request->query('hub_mode');
        $token = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        $verifyToken = config('services.whatsapp.webhook_verify_token', env('WHATSAPP_WEBHOOK_VERIFY_TOKEN'));

        if ($mode === 'subscribe' && $token === $verifyToken) {
            Log::info('WhatsApp webhook verified', [
                'challenge' => $challenge,
            ]);
            return response($challenge, 200)->header('Content-Type', 'text/plain');
        }

        Log::warning('WhatsApp webhook verification failed', [
            'mode' => $mode,
            'token_provided' => $token ? 'yes' : 'no',
            'token_match' => $token === $verifyToken,
        ]);

        return response()->json(['error' => 'Forbidden'], 403);
    }

    /**
     * Handle WhatsApp webhook callbacks (message status, incoming messages)
     */
    public function callback(Request $request): JsonResponse
    {
        try {
            $payload = $request->all();
            
            Log::info('WhatsApp webhook received', [
                'payload' => $payload,
            ]);

            // Handle different webhook types
            if (isset($payload['entry'])) {
                foreach ($payload['entry'] as $entry) {
                    if (isset($entry['changes'])) {
                        foreach ($entry['changes'] as $change) {
                            $value = $change['value'] ?? [];
                            
                            // Handle message status updates
                            if (isset($value['statuses'])) {
                                $this->handleStatusUpdates($value['statuses']);
                            }
                            
                            // Handle incoming messages
                            if (isset($value['messages'])) {
                                $this->handleIncomingMessages($value['messages']);
                            }
                        }
                    }
                }
            }

            return response()->json(['success' => true], 200);
        } catch (\Exception $e) {
            Log::error('WhatsApp webhook error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    /**
     * Handle message status updates
     */
    protected function handleStatusUpdates(array $statuses): void
    {
        foreach ($statuses as $status) {
            $messageId = $status['id'] ?? null;
            $statusValue = $status['status'] ?? null;
            $timestamp = $status['timestamp'] ?? null;

            if (!$messageId) {
                continue;
            }

            // Find log entry by message ID or phone number
            $log = WhatsAppLog::where('message_id', $messageId)
                ->orWhere(function ($query) use ($status) {
                    $phone = $status['recipient_id'] ?? null;
                    if ($phone) {
                        $query->where('phone', $phone)
                              ->whereNull('message_id')
                              ->orderBy('created_at', 'desc')
                              ->limit(1);
                    }
                })
                ->first();

            if ($log) {
                $updateData = [
                    'status' => $this->mapStatus($statusValue),
                ];

                if ($statusValue === 'sent' || $statusValue === 'delivered' || $statusValue === 'read') {
                    $updateData['sent_at'] = $timestamp ? now()->setTimestamp($timestamp) : now();
                }

                if (isset($status['errors'])) {
                    $updateData['error_message'] = json_encode($status['errors']);
                    $updateData['status'] = 'failed';
                }

                $log->update($updateData);

                Log::info('WhatsApp message status updated', [
                    'log_id' => $log->id,
                    'status' => $statusValue,
                ]);
            }
        }
    }

    /**
     * Handle incoming messages
     */
    protected function handleIncomingMessages(array $messages): void
    {
        foreach ($messages as $message) {
            $from = $message['from'] ?? null;
            $text = $message['text']['body'] ?? null;
            $messageId = $message['id'] ?? null;
            $timestamp = $message['timestamp'] ?? null;

            if (!$from || !$text) {
                continue;
            }

            // Log incoming message
            WhatsAppLog::create([
                'member_id' => null, // Will be matched later if needed
                'phone' => $from,
                'message' => $text,
                'message_id' => $messageId,
                'status' => 'received',
                'sent_at' => $timestamp ? now()->setTimestamp($timestamp) : now(),
                'direction' => 'inbound',
            ]);

            Log::info('WhatsApp incoming message received', [
                'from' => $from,
                'message_id' => $messageId,
            ]);
        }
    }

    /**
     * Map WhatsApp status to internal status
     */
    protected function mapStatus(string $whatsappStatus): string
    {
        return match ($whatsappStatus) {
            'sent' => 'sent',
            'delivered' => 'delivered',
            'read' => 'read',
            'failed' => 'failed',
            default => 'pending',
        };
    }
}

