<?php

namespace Database\Factories;

use App\Models\Member;
use Illuminate\Database\Eloquent\Factories\Factory;

class MemberFactory extends Factory
{
    protected $model = Member::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'phone' => '07'.fake()->numerify('#######'),
            'email' => fake()->unique()->safeEmail(),
            'member_code' => fake()->unique()->bothify('MPS####'),
            'notes' => fake()->optional()->sentence(),
            'is_active' => true,
        ];
    }
}

