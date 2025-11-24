<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropUnique('transactions_row_hash_unique');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->unique(['bank_statement_id', 'row_hash'], 'transactions_statement_row_hash_unique');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropUnique('transactions_statement_row_hash_unique');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->unique('row_hash');
        });
    }
};

