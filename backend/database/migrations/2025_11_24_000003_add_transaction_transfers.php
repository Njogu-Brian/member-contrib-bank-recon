<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE transactions
            MODIFY assignment_status ENUM(
                'unassigned',
                'auto_assigned',
                'manual_assigned',
                'draft',
                'flagged',
                'duplicate',
                'transferred'
            ) DEFAULT 'unassigned'
        ");

        Schema::create('transaction_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_member_id')->nullable()->constrained('members')->nullOnDelete();
            $table->foreignId('initiated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('mode', ['single', 'split']);
            $table->decimal('total_amount', 15, 2);
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::table('transaction_splits', function (Blueprint $table) {
            $table->foreignId('transfer_id')
                ->nullable()
                ->after('notes')
                ->constrained('transaction_transfers')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('transaction_splits', function (Blueprint $table) {
            $table->dropConstrainedForeignId('transfer_id');
        });

        Schema::dropIfExists('transaction_transfers');

        DB::statement("
            ALTER TABLE transactions
            MODIFY assignment_status ENUM(
                'unassigned',
                'auto_assigned',
                'manual_assigned',
                'draft',
                'flagged',
                'duplicate'
            ) DEFAULT 'unassigned'
        ");
    }
};

