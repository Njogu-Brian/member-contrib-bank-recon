<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->enum('kyc_status', ['pending', 'approved', 'rejected'])->default('pending')->after('is_active');
            $table->timestamp('kyc_approved_at')->nullable()->after('kyc_status');
            $table->foreignId('kyc_approved_by')->nullable()->after('kyc_approved_at')->constrained('users')->nullOnDelete();
            $table->text('kyc_rejection_reason')->nullable()->after('kyc_approved_by');
        });
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropForeign(['kyc_approved_by']);
            $table->dropColumn([
                'kyc_status',
                'kyc_approved_at',
                'kyc_approved_by',
                'kyc_rejection_reason',
            ]);
        });
    }
};

