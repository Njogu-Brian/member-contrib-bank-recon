<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bank_statement_id')->constrained()->onDelete('cascade');
            $table->date('tran_date');
            $table->date('value_date')->nullable();
            $table->text('particulars');
            $table->string('transaction_type')->nullable();
            $table->decimal('credit', 15, 2)->default(0);
            $table->decimal('debit', 15, 2)->default(0);
            $table->decimal('balance', 15, 2)->nullable();
            $table->string('transaction_code')->nullable();
            $table->json('phones')->nullable();
            $table->string('row_hash')->unique();
            $table->foreignId('member_id')->nullable()->constrained()->onDelete('set null');
            $table->enum('assignment_status', ['unassigned', 'auto_assigned', 'manual_assigned', 'draft', 'flagged'])->default('unassigned');
            $table->decimal('match_confidence', 3, 2)->nullable();
            $table->json('draft_member_ids')->nullable();
            $table->text('raw_text')->nullable();
            $table->json('raw_json')->nullable();
            $table->timestamps();
            
            $table->index('tran_date');
            $table->index('transaction_code');
            $table->index('member_id');
            $table->index('assignment_status');
            $table->index('row_hash');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};

