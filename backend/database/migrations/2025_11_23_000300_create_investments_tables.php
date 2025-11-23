<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('principal_amount', 14, 2);
            $table->decimal('expected_roi_rate', 6, 2)->default(0);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->string('status')->default('active');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('investment_payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 14, 2);
            $table->date('scheduled_for');
            $table->date('paid_at')->nullable();
            $table->string('status')->default('scheduled');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('roi_calculations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_id')->constrained()->cascadeOnDelete();
            $table->decimal('principal', 14, 2);
            $table->decimal('accrued_interest', 14, 2);
            $table->date('calculated_on');
            $table->json('inputs')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roi_calculations');
        Schema::dropIfExists('investment_payouts');
        Schema::dropIfExists('investments');
    }
};

