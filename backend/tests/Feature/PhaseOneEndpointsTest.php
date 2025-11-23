<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhaseOneEndpointsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::create(['name' => 'Admin', 'slug' => 'admin']);
        Role::create(['name' => 'Treasurer', 'slug' => 'treasurer']);
        Role::create(['name' => 'Member', 'slug' => 'member']);
    }

    protected function actingAsAdmin(): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('slug', 'admin')->value('id'));

        $this->actingAs($user);

        return $user;
    }

    public function test_wallet_creation_and_contribution_flow(): void
    {
        $this->actingAsAdmin();
        $member = Member::factory()->create();

        $walletResponse = $this->postJson('/api/wallets', [
            'member_id' => $member->id,
            'seed_balance' => 0,
        ]);

        $walletResponse->assertCreated();
        $walletId = $walletResponse->json('data.id');

        $contributionResponse = $this->postJson("/api/wallets/{$walletId}/contributions", [
            'amount' => 1500,
            'source' => 'manual',
            'reference' => 'TEST',
        ]);

        $contributionResponse->assertCreated()
            ->assertJsonPath('amount', '1500.00');
    }

    public function test_announcements_crud(): void
    {
        $this->actingAsAdmin();

        $store = $this->postJson('/api/announcements', [
            'title' => 'System Upgrade',
            'body' => 'We will be upgrading tonight.',
        ]);

        $store->assertCreated();
        $announcementId = $store->json('id');

        $update = $this->putJson("/api/announcements/{$announcementId}", [
            'title' => 'System Upgrade',
            'body' => 'Completed successfully.',
            'is_pinned' => true,
        ]);

        $update->assertOk()->assertJsonFragment(['is_pinned' => true]);

        $index = $this->getJson('/api/announcements');
        $index->assertOk()->assertJsonCount(1);
    }

    public function test_meeting_motion_and_vote(): void
    {
        $admin = $this->actingAsAdmin();

        $meetingResponse = $this->postJson('/api/meetings', [
            'title' => 'AGM',
            'scheduled_for' => now()->addDay()->toDateTimeString(),
            'location' => 'Hall',
        ]);

        $meetingResponse->assertCreated();
        $meetingId = $meetingResponse->json('id');

        $motionResponse = $this->postJson("/api/meetings/{$meetingId}/motions", [
            'title' => 'Approve Budget',
            'description' => 'Approve FY budget',
        ]);

        $motionResponse->assertCreated();
        $motionId = $motionResponse->json('id');

        $vote = $this->postJson("/api/motions/{$motionId}/votes", [
            'choice' => 'yes',
        ]);

        $vote->assertOk()->assertJsonFragment(['choice' => 'yes', 'user_id' => $admin->id]);
    }
}

