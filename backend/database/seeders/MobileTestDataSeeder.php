<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Member;
use App\Models\Wallet;
use App\Models\Investment;
use App\Models\InvestmentType;
use App\Models\Contribution;
use App\Models\Meeting;
use App\Models\Motion;
use App\Models\Announcement;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class MobileTestDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function () {
            // Create member first
            $member = Member::firstOrCreate(
                ['email' => 'mobiletest@evimeria.test'],
                [
                    'name' => 'Mobile Test User',
                    'phone' => '+254712345678',
                    'is_active' => true,
                ]
            );

            // Create test user with member_id
            $user = User::firstOrCreate(
                ['email' => 'mobiletest@evimeria.test'],
                [
                    'name' => 'Mobile Test User',
                    'password' => Hash::make('TestPassword123!'),
                    'email_verified_at' => now(),
                    'member_id' => $member->id,
                    'is_active' => true,
                ]
            );

            // Update member if user was just created
            if (!$user->wasRecentlyCreated && !$user->member_id) {
                $user->member_id = $member->id;
                $user->save();
            }

            // Create wallet for member
            $wallet = Wallet::firstOrCreate(
                ['member_id' => $member->id],
                [
                    'balance' => 50000.00,
                    'currency' => 'KES',
                ]
            );

            // Create sample contributions
            for ($i = 1; $i <= 5; $i++) {
                Contribution::firstOrCreate(
                    [
                        'wallet_id' => $wallet->id,
                        'amount' => 5000 * $i,
                        'contribution_date' => now()->subDays($i * 7),
                    ],
                    [
                        'source' => 'mobile_app',
                        'reference' => "TEST-CONT-$i",
                        'status' => 'completed',
                    ]
                );
            }

            // Create investment type if it doesn't exist
            $investmentType = InvestmentType::firstOrCreate(
                ['name' => 'Fixed Deposit'],
                [
                    'description' => 'Fixed deposit investment',
                    'interest_rate' => 12.5,
                    'minimum_amount' => 10000,
                ]
            );

            // Create sample investments
            for ($i = 1; $i <= 3; $i++) {
                Investment::firstOrCreate(
                    [
                        'member_id' => $member->id,
                        'investment_type_id' => $investmentType->id,
                        'amount' => 20000 * $i,
                        'start_date' => now()->subMonths($i),
                    ],
                    [
                        'maturity_date' => now()->subMonths($i)->addMonths(12),
                        'status' => 'active',
                    ]
                );
            }

            // Create sample meeting
            $meeting = Meeting::firstOrCreate(
                [
                    'title' => 'Monthly General Meeting',
                    'scheduled_at' => now()->addDays(7),
                ],
                [
                    'description' => 'Monthly general meeting for all members',
                    'location' => 'Virtual',
                    'status' => 'scheduled',
                ]
            );

            // Create sample motion
            $motion = Motion::firstOrCreate(
                [
                    'meeting_id' => $meeting->id,
                    'title' => 'Budget Approval for Q1 2025',
                ],
                [
                    'description' => 'Approve the proposed budget for Q1 2025',
                    'status' => 'open',
                ]
            );

            // Create sample announcements
            for ($i = 1; $i <= 3; $i++) {
                Announcement::firstOrCreate(
                    [
                        'title' => "Test Announcement $i",
                        'content' => "This is test announcement number $i for mobile app testing.",
                    ],
                    [
                        'is_active' => true,
                        'published_at' => now()->subDays($i),
                    ]
                );
            }

            $this->command->info('Mobile test data created successfully!');
            $this->command->info("Test User Email: mobiletest@evimeria.test");
            $this->command->info("Test Password: TestPassword123!");
        });
    }
}

