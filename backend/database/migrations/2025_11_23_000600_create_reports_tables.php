<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_exports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->string('format'); // pdf, csv, xlsx
            $table->json('filters')->nullable();
            $table->string('status')->default('pending');
            $table->string('file_path')->nullable();
            $table->timestamps();
        });

        Schema::create('analytics_snapshots', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('payload');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_snapshots');
        Schema::dropIfExists('report_exports');
    }
};

