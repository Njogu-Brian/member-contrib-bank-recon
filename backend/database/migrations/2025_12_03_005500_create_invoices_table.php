<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            $table->string('invoice_number')->unique();
            $table->decimal('amount', 10, 2);
            $table->date('due_date');
            $table->date('issue_date');
            $table->string('status')->default('pending'); // pending, paid, overdue, cancelled
            $table->date('paid_at')->nullable();
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
            $table->string('period')->nullable(); // e.g., "2025-W01" for weekly
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            
            $table->index(['member_id', 'status']);
            $table->index('due_date');
            $table->index('period');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};

