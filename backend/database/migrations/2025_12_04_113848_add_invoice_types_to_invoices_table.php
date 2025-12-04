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
        Schema::table('invoices', function (Blueprint $table) {
            $table->enum('invoice_type', [
                'weekly_contribution',
                'registration_fee',
                'annual_subscription',
                'software_acquisition',
                'custom'
            ])->default('weekly_contribution')->after('period');
            
            $table->integer('invoice_year')->nullable()->after('invoice_type')
                ->comment('Year for annual subscriptions (e.g., 2026)');
            
            // Add indexes for better query performance
            $table->index(['member_id', 'invoice_type']);
            $table->index(['invoice_type', 'status']);
            $table->index(['invoice_type', 'invoice_year']);
        });
        
        // Update existing invoices to be weekly_contribution type
        DB::table('invoices')->update(['invoice_type' => 'weekly_contribution']);
        
        // Note: MySQL/MariaDB doesn't support partial indexes with WHERE clauses
        // We'll handle duplicate prevention in the application layer with try-catch
        // and unique validation in the commands
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex(['member_id', 'invoice_type']);
            $table->dropIndex(['invoice_type', 'status']);
            $table->dropIndex(['invoice_type', 'invoice_year']);
            $table->dropColumn(['invoice_type', 'invoice_year']);
        });
    }
};
