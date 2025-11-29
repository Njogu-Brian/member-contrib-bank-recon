<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->nullable()->constrained()->nullOnDelete();
            $table->string('phone');
            $table->text('message');
            $table->enum('status', ['pending', 'sent', 'failed', 'delivered'])->default('pending');
            $table->timestamp('sent_at')->nullable();
            $table->json('response')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index('member_id');
            $table->index('phone');
            $table->index('status');
            $table->index('sent_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_logs');
    }
};

