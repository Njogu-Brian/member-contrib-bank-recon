<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->enum('reconciliation_status', ['pending', 'reconciled', 'unmatched', 'duplicate'])->default('pending')->after('status');
            $table->timestamp('reconciled_at')->nullable()->after('reconciliation_status');
            $table->foreignId('reconciled_by')->nullable()->after('reconciled_at')->constrained('users')->nullOnDelete();
            $table->string('mpesa_transaction_id')->nullable()->after('provider_reference');
            $table->string('mpesa_receipt_number')->nullable()->after('mpesa_transaction_id');
            $table->index('reconciliation_status');
            $table->index('mpesa_transaction_id');
            $table->index('mpesa_receipt_number');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['reconciled_by']);
            $table->dropIndex(['reconciliation_status']);
            $table->dropIndex(['mpesa_transaction_id']);
            $table->dropIndex(['mpesa_receipt_number']);
            $table->dropColumn([
                'reconciliation_status',
                'reconciled_at',
                'reconciled_by',
                'mpesa_transaction_id',
                'mpesa_receipt_number',
            ]);
        });
    }
};

