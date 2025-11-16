<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaction_match_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained()->onDelete('cascade');
            $table->foreignId('member_id')->constrained()->onDelete('cascade');
            $table->decimal('confidence', 3, 2);
            $table->string('match_reason');
            $table->enum('source', ['auto', 'manual']);
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->timestamps();
            
            $table->index('transaction_id');
            $table->index('member_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_match_logs');
    }
};

