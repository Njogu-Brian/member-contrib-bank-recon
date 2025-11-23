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
        Schema::table('contribution_status_rules', function (Blueprint $table) {
            if (! Schema::hasColumn('contribution_status_rules', 'type')) {
                $table->string('type')->default('percentage')->after('description');
            }

            if (! Schema::hasColumn('contribution_status_rules', 'min_amount')) {
                $table->decimal('min_amount', 15, 2)->nullable()->after('max_ratio');
            }

            if (! Schema::hasColumn('contribution_status_rules', 'max_amount')) {
                $table->decimal('max_amount', 15, 2)->nullable()->after('min_amount');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contribution_status_rules', function (Blueprint $table) {
            $table->dropColumn(['type', 'min_amount', 'max_amount']);
        });
    }
};


