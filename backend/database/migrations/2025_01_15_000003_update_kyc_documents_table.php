<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kyc_documents', function (Blueprint $table) {
            // Add member_id if documents can be linked to members
            $table->foreignId('member_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            
            // Add approval workflow fields
            $table->foreignId('approved_by')->nullable()->after('status')->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->text('rejection_reason')->nullable()->after('approved_at');
            
            // Ensure status is enum with proper values
            if (Schema::hasColumn('kyc_documents', 'status')) {
                $table->string('status')->default('pending')->change();
            } else {
                $table->string('status')->default('pending');
            }
        });
    }

    public function down(): void
    {
        Schema::table('kyc_documents', function (Blueprint $table) {
            $table->dropForeign(['member_id']);
            $table->dropForeign(['approved_by']);
            $table->dropColumn([
                'member_id',
                'approved_by',
                'approved_at',
                'rejection_reason',
            ]);
        });
    }
};

