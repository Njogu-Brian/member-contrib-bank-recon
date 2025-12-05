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
        Schema::create('invoice_types', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique()->comment('Unique code identifier (e.g., weekly_contribution)');
            $table->string('name')->comment('Display name (e.g., Weekly Contribution)');
            $table->text('description')->nullable();
            $table->string('charge_type')->comment('once, yearly, monthly, weekly, after_joining, custom');
            $table->integer('charge_interval_days')->nullable()->comment('For recurring types, days between charges');
            $table->decimal('default_amount', 10, 2)->default(0);
            $table->integer('due_days')->default(30)->comment('Days until due date from issue date');
            $table->boolean('is_active')->default(true);
            $table->json('metadata')->nullable()->comment('Additional configuration (e.g., charge_date for once type)');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            
            $table->index(['is_active', 'charge_type']);
            $table->index('code');
        });

        // Insert default invoice types
        $defaultTypes = [
            [
                'code' => 'weekly_contribution',
                'name' => 'Weekly Contribution',
                'description' => 'Regular weekly contribution from members',
                'charge_type' => 'weekly',
                'charge_interval_days' => 7,
                'default_amount' => 0,
                'due_days' => 7,
                'is_active' => true,
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'registration_fee',
                'name' => 'Registration Fee',
                'description' => 'One-time registration fee charged when member joins',
                'charge_type' => 'after_joining',
                'charge_interval_days' => null,
                'default_amount' => 1000,
                'due_days' => 30,
                'is_active' => true,
                'sort_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'annual_subscription',
                'name' => 'Annual Subscription',
                'description' => 'Yearly subscription fee',
                'charge_type' => 'yearly',
                'charge_interval_days' => 365,
                'default_amount' => 0,
                'due_days' => 30,
                'is_active' => true,
                'sort_order' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'software_acquisition',
                'name' => 'Software Acquisition',
                'description' => 'One-time software development and acquisition cost',
                'charge_type' => 'once',
                'charge_interval_days' => null,
                'default_amount' => 2000,
                'due_days' => 30,
                'is_active' => true,
                'sort_order' => 4,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'custom',
                'name' => 'Custom Invoice',
                'description' => 'Custom invoice type for special cases',
                'charge_type' => 'custom',
                'charge_interval_days' => null,
                'default_amount' => 0,
                'due_days' => 30,
                'is_active' => true,
                'sort_order' => 99,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('invoice_types')->insert($defaultTypes);

        // Update invoices table to reference invoice_types
        Schema::table('invoices', function (Blueprint $table) {
            $table->unsignedBigInteger('invoice_type_id')->nullable()->after('invoice_type');
            $table->foreign('invoice_type_id')->references('id')->on('invoice_types')->onDelete('set null');
            $table->index('invoice_type_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['invoice_type_id']);
            $table->dropIndex(['invoice_type_id']);
            $table->dropColumn('invoice_type_id');
        });

        Schema::dropIfExists('invoice_types');
    }
};

