<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bank_statements', function (Blueprint $table) {
            $table->id();
            $table->string('filename');
            $table->string('file_path');
            $table->string('file_hash')->unique();
            $table->date('statement_date')->nullable();
            $table->string('account_number')->nullable();
            $table->enum('status', ['uploaded', 'processing', 'completed', 'failed'])->default('uploaded');
            $table->text('error_message')->nullable();
            $table->json('raw_metadata')->nullable();
            $table->timestamps();
            
            $table->index('status');
            $table->index('statement_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_statements');
    }
};

