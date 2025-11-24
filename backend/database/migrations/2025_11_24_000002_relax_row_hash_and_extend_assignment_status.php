<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->index('bank_statement_id', 'transactions_bank_statement_id_index');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropUnique('transactions_statement_row_hash_unique');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->index(['bank_statement_id', 'row_hash'], 'transactions_statement_row_hash_index');
        });

        DB::statement("
            ALTER TABLE transactions
            MODIFY assignment_status ENUM(
                'unassigned',
                'auto_assigned',
                'manual_assigned',
                'draft',
                'flagged',
                'duplicate'
            ) DEFAULT 'unassigned'
        ");
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex('transactions_statement_row_hash_index');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex('transactions_bank_statement_id_index');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->unique(['bank_statement_id', 'row_hash'], 'transactions_statement_row_hash_unique');
        });

        DB::statement("
            ALTER TABLE transactions
            MODIFY assignment_status ENUM(
                'unassigned',
                'auto_assigned',
                'manual_assigned',
                'draft',
                'flagged'
            ) DEFAULT 'unassigned'
        ");
    }
};

