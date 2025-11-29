<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Chart of Accounts
        Schema::create('chart_of_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->enum('type', ['asset', 'liability', 'equity', 'revenue', 'expense'])->index();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('parent_id');
        });

        // Add self-referencing foreign key after table creation
        Schema::table('chart_of_accounts', function (Blueprint $table) {
            $table->foreign('parent_id')
                ->references('id')
                ->on('chart_of_accounts')
                ->nullOnDelete();
        });

        // Accounting Periods
        Schema::create('accounting_periods', function (Blueprint $table) {
            $table->id();
            $table->string('period_name');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_closed')->default(false);
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('start_date');
            $table->index('end_date');
            $table->index('is_closed');
        });

        // Journal Entries
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->id();
            $table->string('entry_number')->unique();
            $table->date('entry_date')->index();
            $table->foreignId('period_id')->constrained('accounting_periods')->cascadeOnDelete();
            $table->text('description');
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_posted')->default(false);
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();

            $table->index(['reference_type', 'reference_id']);
            $table->index('is_posted');
        });

        // Journal Entry Lines
        Schema::create('journal_entry_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journal_entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('chart_of_accounts')->cascadeOnDelete();
            $table->decimal('debit', 15, 2)->default(0);
            $table->decimal('credit', 15, 2)->default(0);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // General Ledger
        Schema::create('general_ledger', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('chart_of_accounts')->cascadeOnDelete();
            $table->foreignId('journal_entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('period_id')->constrained('accounting_periods')->cascadeOnDelete();
            $table->date('entry_date')->index();
            $table->decimal('debit', 15, 2)->default(0);
            $table->decimal('credit', 15, 2)->default(0);
            $table->decimal('running_balance', 15, 2)->default(0);
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['reference_type', 'reference_id']);
        });

        // Account Balances (snapshot for periods)
        Schema::create('account_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('chart_of_accounts')->cascadeOnDelete();
            $table->foreignId('period_id')->constrained('accounting_periods')->cascadeOnDelete();
            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->decimal('total_debit', 15, 2)->default(0);
            $table->decimal('total_credit', 15, 2)->default(0);
            $table->decimal('closing_balance', 15, 2)->default(0);
            $table->timestamps();

            $table->unique(['account_id', 'period_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_balances');
        Schema::dropIfExists('general_ledger');
        Schema::dropIfExists('journal_entry_lines');
        Schema::dropIfExists('journal_entries');
        Schema::dropIfExists('accounting_periods');
        Schema::dropIfExists('chart_of_accounts');
    }
};

