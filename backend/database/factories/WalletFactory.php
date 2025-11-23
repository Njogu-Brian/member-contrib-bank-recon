<?php

namespace Database\Factories;

use App\Models\Member;
use App\Models\Wallet;
use Illuminate\Database\Eloquent\Factories\Factory;

class WalletFactory extends Factory
{
    protected $model = Wallet::class;

    public function definition(): array
    {
        return [
            'member_id' => Member::factory(),
            'balance' => 0,
            'locked_balance' => 0,
        ];
    }
}

