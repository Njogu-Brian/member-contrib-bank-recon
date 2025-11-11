<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaction_matches_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained()->onDelete('cascade');
            $table->foreignId('member_id')->nullable()->constrained()->onDelete('set null');
            $table->decimal('confidence', 3, 2);
            $table->json('match_tokens')->nullable();
            $table->string('match_reason')->nullable();
            $table->enum('source', ['ai', 'manual', 'auto'])->default('ai');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->timestamps();

            $table->index(['transaction_id', 'confidence']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_matches_log');
    }
};

