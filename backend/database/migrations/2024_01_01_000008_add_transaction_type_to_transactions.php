<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('transaction_type')->nullable()->after('particulars');
            $table->string('extracted_member_number')->nullable()->after('transaction_code');
            $table->json('draft_member_ids')->nullable()->after('member_id');
        });

        Schema::table('members', function (Blueprint $table) {
            $table->string('member_number')->nullable()->after('member_code');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['transaction_type', 'extracted_member_number', 'draft_member_ids']);
        });

        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn('member_number');
        });
    }
};

