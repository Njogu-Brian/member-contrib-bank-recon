<?php

namespace App\Mail;

use App\Models\ScheduledReport;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class ScheduledReportMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public ScheduledReport $scheduledReport,
        public array $reportData,
        public array $exports = []
    ) {
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: ucfirst($this->scheduledReport->report_type) . ' Report - ' . now()->format('Y-m-d'),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.scheduled_report',
            with: [
                'reportType' => ucfirst(str_replace('_', ' ', $this->scheduledReport->report_type)),
                'frequency' => ucfirst($this->scheduledReport->frequency),
                'reportData' => $this->reportData,
                'exports' => $this->exports,
                'generatedAt' => now(),
            ],
        );
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        $attachments = [];

        foreach ($this->exports as $format => $filePath) {
            if (Storage::disk('public')->exists($filePath)) {
                $attachments[] = Attachment::fromStorageDisk('public', $filePath)
                    ->as($this->scheduledReport->report_type . '-' . now()->format('Y-m-d') . '.' . $this->getExtension($format));
            }
        }

        return $attachments;
    }

    protected function getExtension(string $format): string
    {
        return match ($format) {
            'pdf' => 'pdf',
            'excel' => 'xlsx',
            'csv' => 'csv',
            default => 'txt',
        };
    }
}

