<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MemberTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->token = $this->user->createToken('test-token')->plainTextToken;
    }

    public function test_can_list_members(): void
    {
        Member::factory()->count(5)->create();

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson('/api/members');

        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_can_create_member(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/api/members', [
                'name' => 'John Doe',
                'phone' => '0712345678',
                'email' => 'john@example.com',
            ]);

        $response->assertStatus(201)
            ->assertJson(['name' => 'John Doe']);
    }

    public function test_can_update_member(): void
    {
        $member = Member::factory()->create();

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->putJson("/api/members/{$member->id}", [
                'name' => 'Updated Name',
            ]);

        $response->assertStatus(200)
            ->assertJson(['name' => 'Updated Name']);
    }
}

