<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->boolean('is_archived')->default(false)->after('assignment_status')->index();
            $table->timestamp('archived_at')->nullable()->after('is_archived');
            $table->text('archive_reason')->nullable()->after('archived_at');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['archive_reason', 'archived_at', 'is_archived']);
        });
    }
};


