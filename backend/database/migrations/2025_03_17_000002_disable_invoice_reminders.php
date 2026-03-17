<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings')->updateOrInsert(
            ['key' => 'invoice_reminder_enabled'],
            ['value' => 'false', 'updated_at' => now()]
        );
    }

    public function down(): void
    {
        DB::table('settings')->updateOrInsert(
            ['key' => 'invoice_reminder_enabled'],
            ['value' => 'true', 'updated_at' => now()]
        );
    }
};
