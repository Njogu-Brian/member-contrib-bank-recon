<?php

namespace Database\Factories;

use App\Models\BankStatement;
use Illuminate\Database\Eloquent\Factories\Factory;

class BankStatementFactory extends Factory
{
    protected $model = BankStatement::class;

    public function definition(): array
    {
        return [
            'filename' => fake()->word().'.pdf',
            'file_path' => 'statements/'.fake()->uuid().'.pdf',
            'file_hash' => fake()->sha256(),
            'statement_date' => fake()->date(),
            'account_number' => fake()->numerify('#########'),
            'status' => 'uploaded',
        ];
    }
}

