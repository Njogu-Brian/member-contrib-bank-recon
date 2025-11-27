<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use App\Models\Member;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->string('public_share_token', 64)->unique()->nullable()->after('is_active');
            $table->index('public_share_token');
        });

        // Generate tokens for existing members
        Member::whereNull('public_share_token')->chunk(100, function ($members) {
            foreach ($members as $member) {
                $member->update(['public_share_token' => $this->generateUniqueToken()]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropIndex(['public_share_token']);
            $table->dropColumn('public_share_token');
        });
    }

    /**
     * Generate a unique token
     */
    private function generateUniqueToken(): string
    {
        do {
            $token = Str::random(32);
        } while (Member::where('public_share_token', $token)->exists());

        return $token;
    }
};
