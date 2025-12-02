<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->string('approval_status')->default('pending')->after('notes');
            $table->foreignId('requested_by')->nullable()->constrained('users')->after('approval_status');
            $table->foreignId('approved_by')->nullable()->constrained('users')->after('requested_by');
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->text('rejection_reason')->nullable()->after('approved_at');
            $table->foreignId('rejected_by')->nullable()->constrained('users')->after('rejection_reason');
            $table->timestamp('rejected_at')->nullable()->after('rejected_by');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropForeign(['requested_by']);
            $table->dropForeign(['approved_by']);
            $table->dropForeign(['rejected_by']);
            $table->dropColumn([
                'approval_status',
                'requested_by',
                'approved_by',
                'approved_at',
                'rejection_reason',
                'rejected_by',
                'rejected_at',
            ]);
        });
    }
};
