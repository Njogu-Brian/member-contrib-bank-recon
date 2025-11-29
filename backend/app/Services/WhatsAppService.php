<?php

namespace App\Services;

use App\Models\Member;
use App\Models\WhatsAppLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    protected $enabled;
    protected $apiUrl;
    protected $apiKey;
    protected $phoneNumberId;

    public function __construct()
    {
        $this->enabled = env('WHATSAPP_ENABLED', false);
        $this->apiUrl = env('WHATSAPP_API_URL', '');
        $this->apiKey = env('WHATSAPP_API_KEY', '');
        $this->phoneNumberId = env('WHATSAPP_PHONE_NUMBER_ID', '');
    }

    /**
     * Send WhatsApp message
     */
    public function send(string $phone, string $message, ?int $memberId = null): array
    {
        if (!$this->enabled || !$this->apiUrl || !$this->apiKey) {
            Log::warning('WhatsApp service is disabled or not configured');
            return [
                'success' => false,
                'error' => 'WhatsApp service is disabled or not configured',
                'status' => 'disabled',
            ];
        }

        // Normalize phone number
        $phone = $this->normalizePhone($phone);
        if (!$phone) {
            return [
                'success' => false,
                'error' => 'Invalid phone number format',
                'status' => 'error',
            ];
        }

        // Create log entry
        $log = WhatsAppLog::create([
            'member_id' => $memberId,
            'phone' => $phone,
            'message' => $message,
            'status' => 'pending',
        ]);

        try {
            // Send via WhatsApp API (placeholder - adjust based on your provider)
            $response = Http::timeout(30)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Content-Type' => 'application/json',
                ])
                ->post("{$this->apiUrl}/messages", [
                    'phone_number_id' => $this->phoneNumberId,
                    'to' => $phone,
                    'message' => $message,
                ]);

            if ($response->successful()) {
                $log->update([
                    'status' => 'sent',
                    'sent_at' => now(),
                    'response' => $response->json(),
                ]);

                return [
                    'success' => true,
                    'status' => 'sent',
                    'log_id' => $log->id,
                ];
            } else {
                $log->update([
                    'status' => 'failed',
                    'error_message' => $response->body(),
                    'response' => $response->json(),
                ]);

                return [
                    'success' => false,
                    'status' => 'failed',
                    'error' => 'WhatsApp API error: ' . $response->status(),
                    'log_id' => $log->id,
                ];
            }
        } catch (\Exception $e) {
            $log->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            Log::error('WhatsApp send error', [
                'phone' => $phone,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'status' => 'error',
                'error' => $e->getMessage(),
                'log_id' => $log->id,
            ];
        }
    }

    /**
     * Normalize phone number to international format
     */
    protected function normalizePhone(string $phone): ?string
    {
        $phone = preg_replace('/\D/', '', $phone);

        if (strlen($phone) === 9 && strpos($phone, '0') === 0) {
            return '254' . substr($phone, 1);
        } elseif (strlen($phone) === 12 && strpos($phone, '254') === 0) {
            return $phone;
        }

        return null;
    }

    /**
     * Check if WhatsApp service is enabled
     */
    public function isEnabled(): bool
    {
        return $this->enabled && !empty($this->apiUrl) && !empty($this->apiKey);
    }
}

