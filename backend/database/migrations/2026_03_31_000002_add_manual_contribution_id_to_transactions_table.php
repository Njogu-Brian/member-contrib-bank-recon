<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('manual_contribution_id')
                ->nullable()
                ->after('bank_statement_id')
                ->constrained('manual_contributions')
                ->nullOnDelete();

            $table->index('manual_contribution_id');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['manual_contribution_id']);
            $table->dropIndex(['manual_contribution_id']);
            $table->dropColumn('manual_contribution_id');
        });
    }
};

