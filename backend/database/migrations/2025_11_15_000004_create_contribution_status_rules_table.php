<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('contribution_status_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->string('type')->default('percentage');
            $table->decimal('min_ratio', 8, 4)->nullable();
            $table->decimal('max_ratio', 8, 4)->nullable();
            $table->decimal('min_amount', 15, 2)->nullable();
            $table->decimal('max_amount', 15, 2)->nullable();
            $table->string('color', 20)->nullable();
            $table->boolean('is_default')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        DB::table('contribution_status_rules')->insert([
            [
                'name' => 'Ahead',
                'slug' => 'ahead',
                'description' => 'Members whose investments exceed their goal',
                'type' => 'percentage',
                'min_ratio' => 1.01,
                'max_ratio' => null,
                'min_amount' => null,
                'max_amount' => null,
                'color' => '#0ea5e9',
                'is_default' => false,
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'On Track',
                'slug' => 'on_track',
                'description' => 'Members investing at least 80% of their goal',
                'type' => 'percentage',
                'min_ratio' => 0.8,
                'max_ratio' => 1.01,
                'min_amount' => null,
                'max_amount' => null,
                'color' => '#10b981',
                'is_default' => false,
                'sort_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Behind',
                'slug' => 'behind',
                'description' => 'Members investing between 50% and 80% of their goal',
                'type' => 'percentage',
                'min_ratio' => 0.5,
                'max_ratio' => 0.8,
                'min_amount' => null,
                'max_amount' => null,
                'color' => '#f59e0b',
                'is_default' => false,
                'sort_order' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Deficit',
                'slug' => 'deficit',
                'description' => 'Members investing less than 50% of their goal',
                'type' => 'percentage',
                'min_ratio' => null,
                'max_ratio' => 0.5,
                'min_amount' => null,
                'max_amount' => null,
                'color' => '#ef4444',
                'is_default' => true,
                'sort_order' => 4,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contribution_status_rules');
    }
};


