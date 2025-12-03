<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\NotificationLog;
use App\Models\Setting;
use App\Services\SmsService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendInvoiceReminders extends Command
{
    protected $signature = 'invoices:send-reminders {--force : Send even if already sent recently}';
    protected $description = 'Send SMS reminders for overdue and pending invoices (customizable via settings)';

    public function handle()
    {
        // Check if reminders are enabled
        $enabled = Setting::get('invoice_reminder_enabled', 'true') === 'true';
        if (!$enabled && !$this->option('force')) {
            $this->info('Invoice reminders are disabled in settings');
            return 0;
        }

        $frequency = Setting::get('invoice_reminder_frequency', 'daily');
        $daysBefore = (int) Setting::get('invoice_reminder_days_before_due', 2);
        $appName = Setting::get('app_name', 'Evimeria Initiative');

        // Check if we should run based on frequency
        if (!$this->option('force') && !$this->shouldRunToday($frequency)) {
            $this->info("Skipping reminders - frequency is set to {$frequency}");
            return 0;
        }

        // Get overdue invoices
        $overdueInvoices = Invoice::with('member')
            ->whereIn('status', ['pending', 'overdue'])
            ->where('due_date', '<', now())
            ->get();

        // Get invoices due soon
        $dueSoonInvoices = Invoice::with('member')
            ->where('status', 'pending')
            ->whereBetween('due_date', [now(), now()->addDays($daysBefore)])
            ->get();

        $sentCount = 0;
        $smsService = app(SmsService::class);

        // Send overdue reminders
        foreach ($overdueInvoices as $invoice) {
            if (!$this->shouldSendReminder($invoice, 'overdue', $frequency)) {
                continue;
            }

            $message = $this->buildMessage($invoice, 'overdue', $appName);
            try {
                if ($invoice->member->phone) {
                    $smsService->sendSms($invoice->member->phone, $message);
                    $this->logNotification($invoice, 'overdue_reminder', $message);
                    $sentCount++;
                    $this->info("Sent overdue reminder to {$invoice->member->name}");
                }
            } catch (\Exception $e) {
                Log::error('Failed to send overdue invoice reminder', [
                    'invoice_id' => $invoice->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Send due soon reminders
        foreach ($dueSoonInvoices as $invoice) {
            if (!$this->shouldSendReminder($invoice, 'due_soon', $frequency)) {
                continue;
            }

            $message = $this->buildMessage($invoice, 'due_soon', $appName);
            try {
                if ($invoice->member->phone) {
                    $smsService->sendSms($invoice->member->phone, $message);
                    $this->logNotification($invoice, 'due_soon_reminder', $message);
                    $sentCount++;
                    $this->info("Sent due soon reminder to {$invoice->member->name}");
                }
            } catch (\Exception $e) {
                Log::error('Failed to send due soon invoice reminder', [
                    'invoice_id' => $invoice->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->info("Sent {$sentCount} invoice reminders");
        return 0;
    }

    protected function shouldRunToday(string $frequency): bool
    {
        $dayOfWeek = now()->dayOfWeek; // 0=Sunday, 1=Monday, etc.
        $dayOfMonth = now()->day;

        switch ($frequency) {
            case 'daily':
                return true;
            case 'weekly':
                return $dayOfWeek === 1; // Monday
            case 'bi_weekly':
                $weekOfYear = now()->weekOfYear;
                return $dayOfWeek === 1 && ($weekOfYear % 2 === 0);
            case 'monthly':
                return $dayOfMonth === 1; // First day of month
            default:
                return true;
        }
    }

    protected function shouldSendReminder(Invoice $invoice, string $type, string $frequency): bool
    {
        if ($this->option('force')) {
            return true;
        }

        // Calculate days to check based on frequency
        $daysToCheck = match($frequency) {
            'daily' => 1,
            'weekly' => 7,
            'bi_weekly' => 14,
            'monthly' => 30,
            default => 7,
        };

        // Check if reminder was sent recently
        $recentReminder = NotificationLog::where('member_id', $invoice->member_id)
            ->where('type', $type)
            ->where('reference_type', 'invoice')
            ->where('reference_id', $invoice->id)
            ->where('created_at', '>', now()->subDays($daysToCheck))
            ->exists();

        return !$recentReminder;
    }

    protected function buildMessage(Invoice $invoice, string $type, string $appName): string
    {
        // Get custom message template from settings
        $templateKey = $type === 'overdue' 
            ? 'invoice_reminder_overdue_message' 
            : 'invoice_reminder_due_soon_message';
        
        $template = Setting::get($templateKey);
        
        if (!$template) {
            // Fallback to default messages
            return $type === 'overdue' 
                ? $this->buildOverdueMessageDefault($invoice, $appName)
                : $this->buildDueSoonMessageDefault($invoice, $appName);
        }

        // Calculate totals for this member
        $totalOutstanding = Invoice::where('member_id', $invoice->member_id)
            ->whereIn('status', ['pending', 'overdue'])
            ->sum('amount');
        
        $totalPending = Invoice::where('member_id', $invoice->member_id)
            ->where('status', 'pending')
            ->sum('amount');

        // Replace placeholders
        $placeholders = [
            '{{member_name}}' => $invoice->member->name,
            '{{invoice_number}}' => $invoice->invoice_number,
            '{{invoice_amount}}' => number_format($invoice->amount, 2),
            '{{days_overdue}}' => now()->diffInDays($invoice->due_date),
            '{{days_until_due}}' => now()->diffInDays($invoice->due_date),
            '{{due_date}}' => $invoice->due_date->format('M d, Y'),
            '{{total_outstanding}}' => number_format($totalOutstanding, 2),
            '{{total_pending}}' => number_format($totalPending, 2),
            '{{app_name}}' => $appName,
        ];

        return str_replace(array_keys($placeholders), array_values($placeholders), $template);
    }

    protected function buildOverdueMessageDefault(Invoice $invoice, string $appName): string
    {
        $daysOverdue = now()->diffInDays($invoice->due_date);
        return "OVERDUE INVOICE: Invoice #{$invoice->invoice_number} for KES " . number_format($invoice->amount, 2) . 
               " is {$daysOverdue} days overdue. Please make your contribution as soon as possible. - {$appName}";
    }

    protected function buildDueSoonMessageDefault(Invoice $invoice, string $appName): string
    {
        $daysUntilDue = now()->diffInDays($invoice->due_date);
        return "REMINDER: Invoice #{$invoice->invoice_number} for KES " . number_format($invoice->amount, 2) . 
               " is due in {$daysUntilDue} days. Please make your contribution before " . $invoice->due_date->format('M d, Y') . 
               ". - {$appName}";
    }

    protected function logNotification(Invoice $invoice, string $type, string $message): void
    {
        NotificationLog::create([
            'member_id' => $invoice->member_id,
            'type' => $type,
            'channel' => 'sms',
            'message' => $message,
            'status' => 'sent',
            'reference_type' => 'invoice',
            'reference_id' => $invoice->id,
            'sent_at' => now(),
        ]);
    }
}
