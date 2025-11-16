<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->boolean('assign_to_all_members')->default(false)->after('category');
            $table->decimal('amount_per_member', 15, 2)->nullable()->after('assign_to_all_members');
        });
        
        Schema::create('expense_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expense_id')->constrained()->onDelete('cascade');
            $table->foreignId('member_id')->constrained()->onDelete('cascade');
            $table->decimal('amount', 15, 2);
            $table->timestamps();
            
            $table->unique(['expense_id', 'member_id']);
            $table->index('expense_id');
            $table->index('member_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_members');
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn(['assign_to_all_members', 'amount_per_member']);
        });
    }
};

