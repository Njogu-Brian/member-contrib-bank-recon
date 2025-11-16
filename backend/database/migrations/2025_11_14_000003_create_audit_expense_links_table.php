<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_expense_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('audit_row_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('expense_id')->constrained()->cascadeOnDelete();
            $table->string('type')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_expense_links');
    }
};

