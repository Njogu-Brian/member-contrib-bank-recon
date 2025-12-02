<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('scheduled_reports', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable(); // Optional name for the scheduled report
            $table->string('report_type'); // summary, contributions, deposits, expenses, members, accounting
            $table->json('report_params')->nullable(); // Report-specific filters/parameters
            $table->string('frequency'); // daily, weekly, monthly, quarterly, yearly
            $table->json('recipients')->nullable(); // Array of email addresses or user IDs
            $table->json('format')->nullable(); // ['pdf', 'excel', 'csv']
            $table->timestamp('last_run_at')->nullable();
            $table->timestamp('next_run_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('report_type');
            $table->index('frequency');
            $table->index('is_active');
            $table->index('next_run_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scheduled_reports');
    }
};

