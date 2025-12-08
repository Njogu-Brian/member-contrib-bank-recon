<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whatsapp_logs', function (Blueprint $table) {
            $table->string('message_id')->nullable()->after('phone');
            $table->enum('direction', ['inbound', 'outbound'])->default('outbound')->after('status');
            $table->enum('status', ['pending', 'sent', 'delivered', 'read', 'failed'])->default('pending')->change();
            
            $table->index('message_id');
            $table->index('direction');
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp_logs', function (Blueprint $table) {
            $table->dropIndex(['message_id']);
            $table->dropIndex(['direction']);
            $table->dropColumn(['message_id', 'direction']);
            $table->enum('status', ['pending', 'sent', 'failed', 'delivered'])->default('pending')->change();
        });
    }
};

