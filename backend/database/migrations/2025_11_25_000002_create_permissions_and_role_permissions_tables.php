<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('module'); // dashboard, members, staff, contributions, etc.
            $table->string('action'); // view, create, update, delete, export, approve
            $table->text('description')->nullable();
            $table->timestamps();
            
            $table->index(['module', 'action']);
        });

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            
            $table->unique(['role_id', 'permission_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'member_id')) {
                $table->foreignId('member_id')->nullable()->constrained()->nullOnDelete();
            }
            if (!Schema::hasColumn('users', 'phone')) {
                $table->string('phone')->nullable();
            }
            if (!Schema::hasColumn('users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable();
            }
            if (!Schema::hasColumn('users', 'password_reset_at')) {
                $table->timestamp('password_reset_at')->nullable();
            }
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action'); // created, updated, deleted, viewed, etc.
            $table->string('model_type')->nullable(); // App\Models\Member, etc.
            $table->unsignedBigInteger('model_id')->nullable();
            $table->json('changes')->nullable(); // before/after values
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
            
            $table->index(['user_id', 'created_at']);
            $table->index(['model_type', 'model_id']);
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
        
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'member_id')) {
                $table->dropForeign(['member_id']);
                $table->dropColumn('member_id');
            }
            if (Schema::hasColumn('users', 'phone')) {
                $table->dropColumn('phone');
            }
            if (Schema::hasColumn('users', 'last_login_at')) {
                $table->dropColumn('last_login_at');
            }
            if (Schema::hasColumn('users', 'password_reset_at')) {
                $table->dropColumn('password_reset_at');
            }
        });
    }
};

