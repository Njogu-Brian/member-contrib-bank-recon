<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manual_contributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->onDelete('cascade');
            $table->decimal('amount', 15, 2);
            $table->date('contribution_date');
            $table->enum('payment_method', ['cash', 'mpesa', 'bank_transfer', 'other'])->default('cash');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index('member_id');
            $table->index('contribution_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manual_contributions');
    }
};

