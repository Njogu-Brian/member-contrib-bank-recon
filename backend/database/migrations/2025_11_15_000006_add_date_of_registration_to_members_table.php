<?php

use App\Models\Member;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->date('date_of_registration')->nullable()->after('member_number');
        });

        Member::query()->select('id')->orderBy('id')->chunkById(100, function ($members) {
            foreach ($members as $member) {
                $date = $this->calculateFirstInvestmentDate($member->id);
                if ($date) {
                    DB::table('members')
                        ->where('id', $member->id)
                        ->update(['date_of_registration' => $date]);
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn('date_of_registration');
        });
    }

    protected function calculateFirstInvestmentDate(int $memberId): ?string
    {
        $dates = [];

        $transactionDate = DB::table('transactions')
            ->where('member_id', $memberId)
            ->where('assignment_status', '!=', 'unassigned')
            ->where('is_archived', false)
            ->min('tran_date');
        if ($transactionDate) {
            $dates[] = $transactionDate;
        }

        $manualDate = DB::table('manual_contributions')
            ->where('member_id', $memberId)
            ->min('contribution_date');
        if ($manualDate) {
            $dates[] = $manualDate;
        }

        $splitDate = DB::table('transaction_splits')
            ->join('transactions', 'transaction_splits.transaction_id', '=', 'transactions.id')
            ->where('transaction_splits.member_id', $memberId)
            ->where('transactions.is_archived', false)
            ->min('transactions.tran_date');
        if ($splitDate) {
            $dates[] = $splitDate;
        }

        if (empty($dates)) {
            return null;
        }

        sort($dates);
        return $dates[0];
    }
};


