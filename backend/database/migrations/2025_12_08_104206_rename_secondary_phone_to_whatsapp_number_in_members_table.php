<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // MariaDB/MySQL uses ALTER TABLE ... CHANGE instead of renameColumn
        DB::statement('ALTER TABLE `members` CHANGE `secondary_phone` `whatsapp_number` VARCHAR(20) NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverse: change whatsapp_number back to secondary_phone
        DB::statement('ALTER TABLE `members` CHANGE `whatsapp_number` `secondary_phone` VARCHAR(20) NULL');
    }
};
