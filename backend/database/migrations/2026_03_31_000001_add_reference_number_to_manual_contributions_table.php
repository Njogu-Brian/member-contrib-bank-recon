<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('manual_contributions', function (Blueprint $table) {
            $table->string('reference_number')->nullable()->after('contribution_date');
            $table->index('reference_number');
        });
    }

    public function down(): void
    {
        Schema::table('manual_contributions', function (Blueprint $table) {
            $table->dropIndex(['reference_number']);
            $table->dropColumn('reference_number');
        });
    }
};

