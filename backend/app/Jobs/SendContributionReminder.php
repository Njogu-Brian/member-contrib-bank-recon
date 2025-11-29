<?php

namespace App\Jobs;

use App\Models\Member;
use App\Services\SmsService;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendContributionReminder implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Member $member,
        public float $expectedAmount,
        public string $channel = 'sms'
    ) {
    }

    public function handle(SmsService $smsService, WhatsAppService $whatsappService): void
    {
        $message = "Hello {$this->member->name}, this is a reminder that your expected contribution is KES " . number_format($this->expectedAmount, 2) . ". Please make your contribution.";

        if ($this->channel === 'whatsapp' && $whatsappService->isEnabled()) {
            $whatsappService->send($this->member->phone, $message, $this->member->id);
        } elseif ($smsService->isEnabled()) {
            $smsService->send($this->member->phone, $message);
        }
    }
}

