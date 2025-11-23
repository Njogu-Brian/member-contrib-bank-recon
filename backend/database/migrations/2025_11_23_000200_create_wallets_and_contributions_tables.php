<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            $table->decimal('balance', 12, 2)->default(0);
            $table->decimal('locked_balance', 12, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('contributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('source')->default('manual');
            $table->string('reference')->nullable();
            $table->date('contributed_at')->nullable();
            $table->string('status')->default('pending');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contribution_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('member_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('channel', ['mpesa', 'bank']);
            $table->string('provider_reference')->nullable();
            $table->decimal('amount', 12, 2);
            $table->string('currency')->default('KES');
            $table->string('status')->default('initiated');
            $table->json('payload')->nullable();
            $table->timestamps();
        });

        Schema::create('payment_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained()->cascadeOnDelete();
            $table->string('file_name');
            $table->string('disk')->default('public');
            $table->string('path');
            $table->string('qr_code_path')->nullable();
            $table->timestamps();
        });

        Schema::create('payment_penalties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contribution_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('reason')->nullable();
            $table->date('due_date')->nullable();
            $table->date('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_penalties');
        Schema::dropIfExists('payment_receipts');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('contributions');
        Schema::dropIfExists('wallets');
    }
};

