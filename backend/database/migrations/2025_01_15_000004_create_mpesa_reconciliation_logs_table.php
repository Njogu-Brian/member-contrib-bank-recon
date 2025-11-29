<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mpesa_reconciliation_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('status', ['pending', 'matched', 'unmatched', 'duplicate', 'error'])->default('pending');
            $table->timestamp('reconciled_at')->nullable();
            $table->foreignId('reconciled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('payment_id');
            $table->index('transaction_id');
            $table->index('status');
            $table->index('reconciled_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mpesa_reconciliation_logs');
    }
};

