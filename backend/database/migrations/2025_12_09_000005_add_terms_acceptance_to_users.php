<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('terms_accepted')->default(false)->after('is_active');
            $table->timestamp('terms_accepted_at')->nullable()->after('terms_accepted');
            $table->string('terms_version')->nullable()->after('terms_accepted_at');
            $table->ipAddress('terms_accepted_ip')->nullable()->after('terms_version');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['terms_accepted', 'terms_accepted_at', 'terms_version', 'terms_accepted_ip']);
        });
    }
};

