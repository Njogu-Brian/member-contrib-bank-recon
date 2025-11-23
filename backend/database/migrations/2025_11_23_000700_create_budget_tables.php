<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->year('year');
            $table->decimal('total_amount', 14, 2);
            $table->timestamps();
        });

        Schema::create('budget_months', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('month');
            $table->decimal('planned_amount', 14, 2);
            $table->decimal('actual_amount', 14, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->timestamps();
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->foreignId('budget_month_id')
                ->nullable()
                ->after('transaction_id')
                ->constrained()
                ->nullOnDelete();
            $table->foreignId('expense_category_id')
                ->nullable()
                ->after('budget_month_id')
                ->constrained()
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('expense_category_id');
            $table->dropConstrainedForeignId('budget_month_id');
        });

        Schema::dropIfExists('expense_categories');
        Schema::dropIfExists('budget_months');
        Schema::dropIfExists('budgets');
    }
};

