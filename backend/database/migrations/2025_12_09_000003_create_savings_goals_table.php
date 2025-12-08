<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('savings_goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('target_amount', 12, 2);
            $table->decimal('current_amount', 12, 2)->default(0);
            $table->date('target_date')->nullable();
            $table->date('start_date')->default(now());
            $table->enum('status', ['active', 'completed', 'cancelled', 'paused'])->default('active');
            $table->decimal('monthly_contribution', 12, 2)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('member_id');
            $table->index('status');
            $table->index('target_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('savings_goals');
    }
};

