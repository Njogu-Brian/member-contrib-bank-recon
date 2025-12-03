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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->onDelete('cascade');
            $table->string('invoice_number')->unique();
            $table->decimal('amount', 10, 2);
            $table->date('issue_date');
            $table->date('due_date');
            $table->enum('status', ['pending', 'paid', 'overdue', 'cancelled'])->default('pending');
            $table->date('paid_at')->nullable();
            $table->foreignId('payment_id')->nullable()->constrained()->onDelete('set null');
            $table->string('period')->nullable(); // e.g., "2025-W01", "2025-01" for month
            $table->string('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            
            $table->index(['member_id', 'period']);
            $table->index(['status', 'due_date']);
            $table->index('issue_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
