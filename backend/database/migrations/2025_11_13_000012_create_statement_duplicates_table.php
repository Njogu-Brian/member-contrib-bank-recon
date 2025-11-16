<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('statement_duplicates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bank_statement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('page_number')->nullable();
            $table->string('transaction_code')->nullable();
            $table->date('tran_date')->nullable();
            $table->decimal('credit', 15, 2)->nullable();
            $table->decimal('debit', 15, 2)->nullable();
            $table->string('duplicate_reason', 50);
            $table->text('particulars_snapshot')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['bank_statement_id', 'transaction_code']);
            $table->index(['bank_statement_id', 'tran_date', 'credit']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('statement_duplicates');
    }
};

