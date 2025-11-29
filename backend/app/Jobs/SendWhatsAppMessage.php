<?php

namespace App\Jobs;

use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendWhatsAppMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $phone,
        public string $message,
        public ?int $memberId = null
    ) {
    }

    public function handle(WhatsAppService $whatsappService): void
    {
        $whatsappService->send($this->phone, $this->message, $this->memberId);
    }
}

