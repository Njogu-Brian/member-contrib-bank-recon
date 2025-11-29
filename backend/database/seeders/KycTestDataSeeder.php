<?php

namespace Database\Seeders;

use App\Models\Member;
use App\Models\KycDocument;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class KycTestDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get or create a few members with pending KYC status
        $members = Member::where(function($query) {
            $query->where('is_active', false)
                  ->orWhereNull('is_active');
        })->limit(3)->get();

        if ($members->isEmpty()) {
            $members = Member::limit(3)->get();
        }

        $documentTypes = ['national_id', 'passport', 'drivers_license', 'birth_certificate'];
        $statuses = ['pending', 'in_review'];
        
        // Get first admin user
        $adminUser = User::first();
        if (!$adminUser) {
            $this->command->error('No users found in database. Please create a user first.');
            return;
        }

        foreach ($members as $index => $member) {
            // Set KYC status to pending or in_review
            $member->update([
                'kyc_status' => $statuses[$index % 2],
                'is_active' => false,
            ]);

            // Create 1-2 KYC documents per member
            $numDocuments = ($index % 2) + 1;
            
            for ($i = 0; $i < $numDocuments; $i++) {
                KycDocument::create([
                    'user_id' => $adminUser->id,
                    'member_id' => $member->id,
                    'document_type' => $documentTypes[$i % count($documentTypes)],
                    'file_name' => $documentTypes[$i % count($documentTypes)] . '_' . $member->id . '.pdf',
                    'disk' => 'public',
                    'path' => 'kyc_documents/test_' . Str::uuid() . '.pdf',
                    'status' => 'pending',
                    'notes' => 'Test document for KYC verification',
                ]);
            }
        }

        $this->command->info('Created ' . KycDocument::count() . ' KYC documents for testing.');
    }
}

