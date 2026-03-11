<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            // Drop foreign key, modify column, re-add foreign key
            DB::statement('ALTER TABLE kyc_documents DROP FOREIGN KEY kyc_documents_user_id_foreign');
            DB::statement('ALTER TABLE kyc_documents MODIFY user_id BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE kyc_documents ADD CONSTRAINT kyc_documents_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE kyc_documents DROP FOREIGN KEY kyc_documents_user_id_foreign');
            DB::statement('ALTER TABLE kyc_documents MODIFY user_id BIGINT UNSIGNED NOT NULL');
            DB::statement('ALTER TABLE kyc_documents ADD CONSTRAINT kyc_documents_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
        }
    }
};
