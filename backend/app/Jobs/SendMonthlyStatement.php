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

class SendMonthlyStatement implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Member $member,
        public string $statementLink,
        public string $channel = 'sms'
    ) {
    }

    public function handle(SmsService $smsService, WhatsAppService $whatsappService): void
    {
        $message = "Hello {$this->member->name}, your monthly statement is ready. View it here: {$this->statementLink}";

        if ($this->channel === 'whatsapp' && $whatsappService->isEnabled()) {
            $whatsappService->send($this->member->phone, $message, $this->member->id);
        } elseif ($smsService->isEnabled()) {
            $smsService->send($this->member->phone, $message);
        }
    }
}

