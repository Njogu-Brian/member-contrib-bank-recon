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
            'name' => $this->faker->name(),
            'phone' => $this->faker->phoneNumber(),
            'email' => $this->faker->safeEmail(),
            'member_code' => strtoupper($this->faker->bothify('MBR###')),
            'member_number' => $this->faker->unique()->numerify('####'),
            'notes' => $this->faker->sentence(),
            'is_active' => true,
        ];
    }
}

