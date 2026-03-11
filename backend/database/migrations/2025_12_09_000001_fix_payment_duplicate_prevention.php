<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // Add idempotency_key column for duplicate prevention
            if (!Schema::hasColumn('payments', 'idempotency_key')) {
                $table->string('idempotency_key')->nullable()->after('mpesa_receipt_number');
            }
        });

        // Remove duplicate mpesa_transaction_ids before adding unique constraint
        // Keep the first payment for each transaction_id
        DB::statement('
            DELETE p1 FROM payments p1
            INNER JOIN payments p2 
            WHERE p1.id > p2.id 
            AND p1.mpesa_transaction_id = p2.mpesa_transaction_id 
            AND p1.mpesa_transaction_id IS NOT NULL
            AND p1.mpesa_transaction_id != ""
        ');

        // Add unique index on mpesa_transaction_id to prevent duplicates at database level
        if (Schema::hasColumn('payments', 'mpesa_transaction_id')) {
            $indexExists = DB::select("
                SELECT 1 FROM information_schema.statistics 
                WHERE table_schema = DATABASE() 
                AND table_name = 'payments' 
                AND index_name = 'payments_mpesa_transaction_id_unique'
            ");
            if (empty($indexExists)) {
                Schema::table('payments', function (Blueprint $table) {
                    $table->unique('mpesa_transaction_id', 'payments_mpesa_transaction_id_unique');
                });
            }
        }
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropUnique('payments_mpesa_transaction_id_unique');
            $table->dropColumn('idempotency_key');
        });
    }
};

