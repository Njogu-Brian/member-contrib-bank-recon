<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $settings = [
            ['key' => 'invoice_reminder_enabled', 'value' => 'true'],
            ['key' => 'invoice_reminder_frequency', 'value' => 'daily'], // daily, weekly, bi_weekly, monthly
            ['key' => 'invoice_reminder_time', 'value' => '09:00'],
            ['key' => 'invoice_reminder_overdue_message', 'value' => 'OVERDUE INVOICE: Invoice #{{invoice_number}} for KES {{invoice_amount}} is {{days_overdue}} days overdue. Total outstanding: KES {{total_outstanding}}. Please make your contribution as soon as possible. - {{app_name}}'],
            ['key' => 'invoice_reminder_due_soon_message', 'value' => 'REMINDER: Invoice #{{invoice_number}} for KES {{invoice_amount}} is due in {{days_until_due}} days ({{due_date}}). Total pending: KES {{total_pending}}. Please make your contribution on time. - {{app_name}}'],
            ['key' => 'invoice_reminder_days_before_due', 'value' => '2'],
        ];

        foreach ($settings as $setting) {
            DB::table('settings')->updateOrInsert(
                ['key' => $setting['key']],
                array_merge($setting, ['created_at' => now(), 'updated_at' => now()])
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('settings')->whereIn('key', [
            'invoice_reminder_enabled',
            'invoice_reminder_frequency',
            'invoice_reminder_time',
            'invoice_reminder_overdue_message',
            'invoice_reminder_due_soon_message',
            'invoice_reminder_days_before_due',
        ])->delete();
    }
};
