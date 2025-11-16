<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('member_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name')->nullable();
            $table->string('phone')->nullable();
            $table->enum('status', ['pass', 'fail', 'missing_member'])->default('fail');
            $table->decimal('expected_total', 15, 2)->default(0);
            $table->decimal('system_total', 15, 2)->default(0);
            $table->decimal('difference', 15, 2)->default(0);
            $table->json('mismatched_months')->nullable();
            $table->json('monthly')->nullable();
            $table->decimal('registration_fee', 15, 2)->nullable();
            $table->decimal('membership_fee', 15, 2)->nullable();
            $table->timestamps();

            $table->index(['audit_run_id', 'status']);
            $table->index(['member_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_rows');
    }
};

