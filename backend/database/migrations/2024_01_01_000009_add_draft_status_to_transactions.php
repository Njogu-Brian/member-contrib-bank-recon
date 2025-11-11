<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Update enum to include 'draft'
        DB::statement("ALTER TABLE transactions MODIFY COLUMN assignment_status ENUM('unassigned', 'auto_assigned', 'manual_assigned', 'flagged', 'draft') DEFAULT 'unassigned'");
    }

    public function down(): void
    {
        // Remove 'draft' from enum
        DB::statement("ALTER TABLE transactions MODIFY COLUMN assignment_status ENUM('unassigned', 'auto_assigned', 'manual_assigned', 'flagged') DEFAULT 'unassigned'");
    }
};

