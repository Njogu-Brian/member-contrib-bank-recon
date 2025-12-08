<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kyc_documents', function (Blueprint $table) {
            // Add validation fields
            $table->boolean('is_clear')->nullable()->after('rejection_reason');
            $table->boolean('has_face')->nullable()->after('is_clear');
            $table->boolean('is_kenyan_id')->nullable()->after('has_face');
            $table->boolean('is_readable')->nullable()->after('is_kenyan_id');
            $table->json('validation_results')->nullable()->after('is_readable');
            $table->text('validation_errors')->nullable()->after('validation_results');
            
            // Add document type constraint (ensure we support: front_id, back_id, selfie)
            // This is handled at application level, but we can add an index
            $table->index(['member_id', 'document_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('kyc_documents', function (Blueprint $table) {
            $table->dropIndex(['member_id', 'document_type', 'status']);
            $table->dropColumn([
                'is_clear',
                'has_face',
                'is_kenyan_id',
                'is_readable',
                'validation_results',
                'validation_errors',
            ]);
        });
    }
};

