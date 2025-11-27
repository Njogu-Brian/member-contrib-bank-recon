<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            // Add token expiration tracking
            $table->timestamp('public_share_token_expires_at')->nullable()->after('public_share_token');
            // Track last access for security monitoring
            $table->timestamp('public_share_last_accessed_at')->nullable()->after('public_share_token_expires_at');
            // Track access count for rate limiting
            $table->unsignedInteger('public_share_access_count')->default(0)->after('public_share_last_accessed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn([
                'public_share_token_expires_at',
                'public_share_last_accessed_at',
                'public_share_access_count',
            ]);
        });
    }
};

