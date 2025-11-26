<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;

class SmsService
{
    protected $baseUrl;
    protected $userId;
    protected $password;
    protected $senderId;
    protected $enabled;

    public function __construct()
    {
        // Check settings first, fall back to config
        $this->userId = \App\Models\Setting::get('sms_userid', config('services.sms.userid', 'evimeria'));
        $this->password = \App\Models\Setting::get('sms_password', config('services.sms.password', ''));
        $this->senderId = \App\Models\Setting::get('sms_senderid', config('services.sms.senderid', 'EVIMERIA'));
        $smsEnabled = \App\Models\Setting::get('sms_enabled', '0');
        $this->enabled = ($smsEnabled === '1' || $smsEnabled === 'true') || config('services.sms.enabled', false);
        $this->baseUrl = config('services.sms.base_url', 'https://smsportal.hostpinnacle.co.ke/SMSApi/send');
    }

    /**
     * Send a single SMS
     *
     * @param string $mobile Phone number in format 254XXXXXXXXX
     * @param string $message Message content
     * @param string|null $senderId Optional sender ID override
     * @return array Response with status and details
     */
    public function send(string $mobile, string $message, ?string $senderId = null): array
    {
        if (!$this->enabled) {
            Log::warning('SMS service is disabled', ['mobile' => $mobile]);
            return [
                'success' => false,
                'error' => 'SMS service is disabled',
                'status' => 'disabled',
            ];
        }

        if (empty($this->password)) {
            Log::error('SMS password not configured');
            return [
                'success' => false,
                'error' => 'SMS credentials not configured',
                'status' => 'error',
            ];
        }

        // Normalize phone number
        $mobile = $this->normalizePhone($mobile);
        if (!$mobile) {
            return [
                'success' => false,
                'error' => 'Invalid phone number format',
                'status' => 'error',
            ];
        }

        $senderId = $senderId ?? $this->senderId;
        $encodedMessage = urlencode($message);

        $url = sprintf(
            '%s?userid=%s&password=%s&mobile=%s&msg=%s&senderid=%s&msgType=text&duplicatecheck=true&output=json&sendMethod=quick',
            $this->baseUrl,
            urlencode($this->userId),
            urlencode($this->password),
            $mobile,
            $encodedMessage,
            urlencode($senderId)
        );

        try {
            $response = Http::timeout(30)
                ->withHeaders(['cache-control' => 'no-cache'])
                ->get($url);

            if ($response->successful()) {
                $responseData = $response->json();
                
                // Check response format - adjust based on actual API response
                $success = isset($responseData['status']) && 
                          (strtolower($responseData['status']) === 'success' || 
                           strtolower($responseData['status']) === 'sent' ||
                           (isset($responseData['error']) && $responseData['error'] === '0'));

                return [
                    'success' => $success,
                    'status' => $success ? 'sent' : 'failed',
                    'response' => $responseData,
                    'mobile' => $mobile,
                    'message' => $message,
                ];
            }

            return [
                'success' => false,
                'status' => 'error',
                'error' => 'HTTP error: ' . $response->status(),
                'response' => $response->body(),
                'mobile' => $mobile,
            ];
        } catch (\Exception $e) {
            Log::error('SMS send error', [
                'mobile' => $mobile,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'status' => 'error',
                'error' => $e->getMessage(),
                'mobile' => $mobile,
            ];
        }
    }

    /**
     * Replace placeholders in message with member data
     *
     * @param string $message Message template with placeholders
     * @param array $data Member data array
     * @param string|null $baseUrl Base URL for statement links
     * @return string Processed message
     */
    public function replacePlaceholders(string $message, array $data, ?string $baseUrl = null): string
    {
        $replacements = [
            '{name}' => $data['name'] ?? '',
            '{member_name}' => $data['name'] ?? '',
            '{phone}' => $data['phone'] ?? '',
            '{email}' => $data['email'] ?? '',
            '{member_code}' => $data['member_code'] ?? '',
            '{member_number}' => $data['member_number'] ?? '',
            '{total_contributions}' => isset($data['total_contributions']) 
                ? number_format($data['total_contributions'], 2) 
                : '0.00',
            '{expected_contributions}' => isset($data['expected_contributions']) 
                ? number_format($data['expected_contributions'], 2) 
                : '0.00',
            '{contribution_status}' => $data['contribution_status'] ?? 'Unknown',
            '{contribution_difference}' => isset($data['total_contributions'], $data['expected_contributions'])
                ? number_format($data['total_contributions'] - $data['expected_contributions'], 2)
                : '0.00',
            '{statement_link}' => $baseUrl && isset($data['id'])
                ? rtrim($baseUrl, '/') . '/members/' . $data['id']
                : '',
        ];

        $processed = $message;
        foreach ($replacements as $placeholder => $value) {
            $processed = str_replace($placeholder, $value, $processed);
        }

        return $processed;
    }

    /**
     * Send bulk SMS to multiple recipients
     *
     * @param array $recipients Array of ['mobile' => '254...', 'message' => '...'] or ['mobile' => '254...'] with shared message
     * @param string|null $sharedMessage Shared message if not provided per recipient
     * @param string|null $baseUrl Base URL for statement links
     * @return array Results with success/failure counts
     */
    public function sendBulk(array $recipients, ?string $sharedMessage = null, ?string $baseUrl = null): array
    {
        $results = [
            'total' => count($recipients),
            'success' => 0,
            'failed' => 0,
            'details' => [],
        ];

        foreach ($recipients as $index => $recipient) {
            $mobile = is_array($recipient) ? ($recipient['mobile'] ?? $recipient['phone'] ?? null) : $recipient;
            $messageTemplate = is_array($recipient) ? ($recipient['message'] ?? $sharedMessage) : $sharedMessage;

            if (!$mobile || !$messageTemplate) {
                $results['failed']++;
                $results['details'][] = [
                    'mobile' => $mobile,
                    'success' => false,
                    'error' => 'Missing mobile or message',
                ];
                continue;
            }

            // Replace placeholders if member data is provided
            $message = $messageTemplate;
            if (is_array($recipient) && isset($recipient['member_data'])) {
                $message = $this->replacePlaceholders($messageTemplate, $recipient['member_data'], $baseUrl);
            }

            $result = $this->send($mobile, $message);
            
            if ($result['success']) {
                $results['success']++;
            } else {
                $results['failed']++;
            }

            $results['details'][] = array_merge($result, ['original_message' => $messageTemplate, 'processed_message' => $message]);

            // Small delay to avoid rate limiting
            if ($index < count($recipients) - 1) {
                usleep(100000); // 0.1 second delay
            }
        }

        return $results;
    }

    /**
     * Normalize phone number to 254XXXXXXXXX format
     *
     * @param string $phone
     * @return string|null
     */
    protected function normalizePhone(string $phone): ?string
    {
        // Remove all non-digit characters
        $phone = preg_replace('/\D/', '', $phone);

        // Handle different formats
        if (strlen($phone) === 9 && strpos($phone, '0') === 0) {
            // 0712345678 -> 254712345678
            return '254' . substr($phone, 1);
        } elseif (strlen($phone) === 10 && strpos($phone, '0') === 0) {
            // 07123456789 -> 2547123456789
            return '254' . substr($phone, 1);
        } elseif (strlen($phone) === 12 && strpos($phone, '254') === 0) {
            // Already in correct format
            return $phone;
        } elseif (strlen($phone) === 13 && strpos($phone, '254') === 0) {
            // 2547123456789 -> 2547123456789 (valid)
            return $phone;
        }

        // Invalid format
        return null;
    }

    /**
     * Check if SMS service is enabled and configured
     *
     * @return bool
     */
    public function isEnabled(): bool
    {
        // Check settings dynamically (may have changed)
        $smsEnabled = \App\Models\Setting::get('sms_enabled', '0');
        $settingsEnabled = ($smsEnabled === '1' || $smsEnabled === 'true');
        
        return ($this->enabled || $settingsEnabled) && !empty($this->password);
    }
}

