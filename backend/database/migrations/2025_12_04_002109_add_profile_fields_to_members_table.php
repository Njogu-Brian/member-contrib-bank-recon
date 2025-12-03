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
        Schema::table('members', function (Blueprint $table) {
            // Add church field (other fields already exist: email, id_number, secondary_phone)
            $table->string('church')->nullable()->after('id_number');
            $table->timestamp('profile_completed_at')->nullable()->after('kyc_approved_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn(['church', 'profile_completed_at']);
        });
    }
};
