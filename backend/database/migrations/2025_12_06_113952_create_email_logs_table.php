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
        Schema::create('email_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->nullable()->constrained()->onDelete('set null');
            $table->string('email', 255);
            $table->string('subject', 255);
            $table->text('message');
            $table->enum('status', ['sent', 'failed', 'pending'])->default('pending');
            $table->text('error')->nullable();
            $table->foreignId('sent_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index('member_id');
            $table->index('status');
            $table->index('sent_by');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_logs');
    }
};
