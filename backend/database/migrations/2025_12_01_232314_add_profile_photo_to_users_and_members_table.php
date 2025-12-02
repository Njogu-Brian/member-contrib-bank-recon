<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('profile_photo_path')->nullable()->after('email_verified_at');
        });

        Schema::table('members', function (Blueprint $table) {
            $table->string('profile_photo_path')->nullable()->after('email');
        });

        Schema::table('kyc_documents', function (Blueprint $table) {
            if (!Schema::hasColumn('kyc_documents', 'document_type')) {
                $table->string('document_type')->after('user_id');
            }
            // Ensure we can store different KYC document types
            if (!Schema::hasColumn('kyc_documents', 'kra_pin_path')) {
                $table->string('kra_pin_path')->nullable()->after('path');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('profile_photo_path');
        });

        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn('profile_photo_path');
        });

        Schema::table('kyc_documents', function (Blueprint $table) {
            $table->dropColumn('kra_pin_path');
        });
    }
};
