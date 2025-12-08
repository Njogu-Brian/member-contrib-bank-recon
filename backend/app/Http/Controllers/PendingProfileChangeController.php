<?php

namespace App\Http\Controllers;

use App\Models\PendingProfileChange;
use App\Models\Member;
use App\Models\KycDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class PendingProfileChangeController extends Controller
{
    /**
     * Get all pending profile changes
     */
    public function index(Request $request)
    {
        try {
            $query = PendingProfileChange::with([
                'member' => function ($q) {
                    $q->select('id', 'name', 'phone', 'email', 'member_code');
                },
                'reviewedBy' => function ($q) {
                    $q->select('id', 'name', 'email');
                }
            ])
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc');

            if ($request->filled('member_id')) {
                $query->where('member_id', $request->member_id);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->whereHas('member', function ($memberQuery) use ($search) {
                        $memberQuery->where('name', 'like', "%{$search}%")
                          ->orWhere('phone', 'like', "%{$search}%")
                          ->orWhere('email', 'like', "%{$search}%")
                          ->orWhere('member_code', 'like', "%{$search}%");
                    })
                    ->orWhere('field_name', 'like', "%{$search}%")
                    ->orWhere('old_value', 'like', "%{$search}%")
                    ->orWhere('new_value', 'like', "%{$search}%");
                });
            }

            $perPage = max(1, min(100, (int) $request->get('per_page', 25)));
            $changes = $query->paginate($perPage);

            // Transform items to ensure member data is properly formatted
            $items = $changes->items();
            $transformedItems = array_map(function ($change) {
                $member = $change->member ?? null;
                $reviewedBy = $change->reviewedBy ?? null;
                
                return [
                    'id' => $change->id ?? null,
                    'member_id' => $change->member_id ?? null,
                    'field_name' => $change->field_name ?? '',
                    'old_value' => $change->old_value ?? null,
                    'new_value' => $change->new_value ?? '',
                    'status' => $change->status ?? 'pending',
                    'reviewed_by' => $change->reviewed_by ?? null,
                    'reviewed_at' => $change->reviewed_at ? $change->reviewed_at->toDateTimeString() : null,
                    'rejection_reason' => $change->rejection_reason ?? null,
                    'created_at' => $change->created_at ? $change->created_at->toDateTimeString() : null,
                    'updated_at' => $change->updated_at ? $change->updated_at->toDateTimeString() : null,
                    'member' => $member ? [
                        'id' => $member->id ?? null,
                        'name' => $member->name ?? '',
                        'phone' => $member->phone ?? '',
                        'email' => $member->email ?? '',
                        'member_code' => $member->member_code ?? '',
                    ] : null,
                    'reviewed_by_user' => $reviewedBy ? [
                        'id' => $reviewedBy->id ?? null,
                        'name' => $reviewedBy->name ?? '',
                        'email' => $reviewedBy->email ?? '',
                    ] : null,
                ];
            }, $items);

            // Return in standard Laravel pagination format
            return response()->json([
                'data' => $transformedItems,
                'current_page' => $changes->currentPage(),
                'last_page' => $changes->lastPage(),
                'per_page' => $changes->perPage(),
                'total' => $changes->total(),
                'from' => $changes->firstItem(),
                'to' => $changes->lastItem(),
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching pending profile changes: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json([
                'message' => 'Error fetching pending profile changes',
                'error' => config('app.debug') ? $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine() : 'An error occurred',
            ], 500);
        }
    }

    /**
     * Approve a single pending change
     */
    public function approve(Request $request, PendingProfileChange $change)
    {
        try {
            if ($change->status !== 'pending') {
                return response()->json([
                    'message' => 'This change has already been processed',
                ], 422);
            }

            DB::beginTransaction();

            $member = $change->member;
            $fieldName = $change->field_name;
            $newValue = $change->new_value;

            // Validate uniqueness for unique fields before approving
            $uniqueFields = ['id_number', 'phone', 'whatsapp_number'];
            if (in_array($fieldName, $uniqueFields) && !empty($newValue)) {
                $existingMember = Member::where($fieldName, $newValue)
                    ->where('id', '!=', $member->id)
                    ->first();
                
                if ($existingMember) {
                    DB::rollBack();
                    $fieldLabels = [
                        'id_number' => 'ID number',
                        'phone' => 'phone number',
                        'secondary_phone' => 'WhatsApp number',
                    ];
                    $fieldLabel = $fieldLabels[$fieldName] ?? $fieldName;
                    
                    return response()->json([
                        'message' => "Cannot approve: This {$fieldLabel} is already registered to another member ({$existingMember->name}).",
                    ], 422);
                }
            }

            // Update the member field
            $member->$fieldName = $newValue;
            $member->save();

            // Mark change as approved
            $change->update([
                'status' => 'approved',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            // Check if profile should be marked as complete
            if ($member->isProfileComplete() && !$member->profile_completed_at) {
                $member->markProfileComplete();
            }

            // Check KYC status - if all required documents are approved, update KYC status
            $this->updateKycStatusIfComplete($member);

            // Clear cached profile status for this member's token
            Cache::forget('profile-status:' . $member->public_share_token);

            DB::commit();

            return response()->json([
                'message' => 'Change approved successfully',
                'change' => $change->fresh(['member', 'reviewedBy']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error approving profile change: ' . $e->getMessage(), [
                'change_id' => $change->id,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Error approving change',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred',
            ], 500);
        }
    }

    /**
     * Reject a single pending change
     */
    public function reject(Request $request, PendingProfileChange $change)
    {
        try {
            if ($change->status !== 'pending') {
                return response()->json([
                    'message' => 'This change has already been processed',
                ], 422);
            }

            $change->update([
                'status' => 'rejected',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'rejection_reason' => $request->input('reason', 'Change rejected by admin'),
            ]);

            return response()->json([
                'message' => 'Change rejected successfully',
                'change' => $change->fresh(['member', 'reviewedBy']),
            ]);
        } catch (\Exception $e) {
            Log::error('Error rejecting profile change: ' . $e->getMessage(), [
                'change_id' => $change->id,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Error rejecting change',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred',
            ], 500);
        }
    }

    /**
     * Approve all pending changes for a specific member
     */
    public function approveMemberChanges(Request $request, Member $member)
    {
        try {
            $pendingChanges = PendingProfileChange::where('member_id', $member->id)
                ->where('status', 'pending')
                ->get();

            if ($pendingChanges->isEmpty()) {
                return response()->json([
                    'message' => 'No pending changes found for this member',
                    'count' => 0,
                ]);
            }

            DB::beginTransaction();

            // Validate uniqueness for all changes before applying them
            $uniqueFields = ['id_number', 'phone', 'whatsapp_number'];
            $conflicts = [];
            
            foreach ($pendingChanges as $change) {
                $fieldName = $change->field_name;
                $newValue = $change->new_value;
                
                if (in_array($fieldName, $uniqueFields) && !empty($newValue)) {
                    $existingMember = Member::where($fieldName, $newValue)
                        ->where('id', '!=', $member->id)
                        ->first();
                    
                    if ($existingMember) {
                        $fieldLabels = [
                            'id_number' => 'ID number',
                            'phone' => 'phone number',
                            'whatsapp_number' => 'WhatsApp number',
                        ];
                        $fieldLabel = $fieldLabels[$fieldName] ?? $fieldName;
                        $conflicts[] = "{$fieldLabel} is already registered to {$existingMember->name}";
                    }
                }
            }
            
            if (!empty($conflicts)) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Cannot approve changes: ' . implode(', ', $conflicts),
                    'conflicts' => $conflicts,
                ], 422);
            }

            $approvedCount = 0;
            foreach ($pendingChanges as $change) {
                $fieldName = $change->field_name;
                $newValue = $change->new_value;

                // Update the member field
                $member->$fieldName = $newValue;
                $approvedCount++;
            }

            // Save all changes at once
            $member->save();

            // Mark all changes as approved
            PendingProfileChange::where('member_id', $member->id)
                ->where('status', 'pending')
                ->update([
                    'status' => 'approved',
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                ]);

            // Check if profile should be marked as complete
            if ($member->isProfileComplete() && !$member->profile_completed_at) {
                $member->markProfileComplete();
            }

            // Check KYC status - if all required documents are approved, update KYC status
            $this->updateKycStatusIfComplete($member);

            // Clear cached profile status for this member's token
            Cache::forget('profile-status:' . $member->public_share_token);

            DB::commit();

            return response()->json([
                'message' => "Approved {$approvedCount} change(s) for {$member->name}",
                'count' => $approvedCount,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error approving member changes: ' . $e->getMessage(), [
                'member_id' => $member->id,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Error approving changes',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred',
            ], 500);
        }
    }

    /**
     * Approve all pending changes for all members
     */
    public function approveAllChanges(Request $request)
    {
        try {
            $pendingChanges = PendingProfileChange::where('status', 'pending')
                ->with('member')
                ->get()
                ->groupBy('member_id');

            if ($pendingChanges->isEmpty()) {
                return response()->json([
                    'message' => 'No pending changes found',
                    'count' => 0,
                ]);
            }

            DB::beginTransaction();

            $totalApproved = 0;
            $membersProcessed = 0;
            $conflicts = [];

            foreach ($pendingChanges as $memberId => $changes) {
                $member = Member::find($memberId);
                if (!$member) {
                    continue;
                }

                // Validate uniqueness for this member's changes
                $uniqueFields = ['id_number', 'phone', 'whatsapp_number'];
                $memberConflicts = [];
                
                foreach ($changes as $change) {
                    $fieldName = $change->field_name;
                    $newValue = $change->new_value;
                    
                    if (in_array($fieldName, $uniqueFields) && !empty($newValue)) {
                        $existingMember = Member::where($fieldName, $newValue)
                            ->where('id', '!=', $member->id)
                            ->first();
                        
                        if ($existingMember) {
                            $fieldLabels = [
                                'id_number' => 'ID number',
                                'phone' => 'phone number',
                                'whatsapp_number' => 'WhatsApp number',
                            ];
                            $fieldLabel = $fieldLabels[$fieldName] ?? $fieldName;
                            $memberConflicts[] = "{$member->name}: {$fieldLabel} already registered to {$existingMember->name}";
                        }
                    }
                }
                
                if (!empty($memberConflicts)) {
                    $conflicts = array_merge($conflicts, $memberConflicts);
                    continue; // Skip this member
                }

                foreach ($changes as $change) {
                    $fieldName = $change->field_name;
                    $newValue = $change->new_value;
                    $member->$fieldName = $newValue;
                    $totalApproved++;
                }

                $member->save();

                // Mark all changes for this member as approved
                PendingProfileChange::where('member_id', $memberId)
                    ->where('status', 'pending')
                    ->update([
                        'status' => 'approved',
                        'reviewed_by' => $request->user()->id,
                        'reviewed_at' => now(),
                    ]);

                // Check if profile should be marked as complete
                if ($member->isProfileComplete() && !$member->profile_completed_at) {
                    $member->markProfileComplete();
                }

                // Check KYC status - if all required documents are approved, update KYC status
                $this->updateKycStatusIfComplete($member);

                // Clear cached profile status for this member's token
                Cache::forget('profile-status:' . $member->public_share_token);

                $membersProcessed++;
            }

            if (!empty($conflicts)) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Cannot approve all changes due to conflicts: ' . implode('; ', $conflicts),
                    'conflicts' => $conflicts,
                    'approved_count' => $totalApproved,
                    'members_processed' => $membersProcessed,
                ], 422);
            }

            DB::commit();

            return response()->json([
                'message' => "Approved {$totalApproved} change(s) for {$membersProcessed} member(s)",
                'count' => $totalApproved,
                'members_processed' => $membersProcessed,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error approving all changes: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Error approving changes',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred',
            ], 500);
        }
    }

    /**
     * Get statistics for pending changes
     */
    public function statistics(Request $request)
    {
        try {
            $stats = [
                'total_pending' => PendingProfileChange::where('status', 'pending')->count(),
                'total_approved' => PendingProfileChange::where('status', 'approved')->count(),
                'total_rejected' => PendingProfileChange::where('status', 'rejected')->count(),
                'pending_by_member' => PendingProfileChange::where('status', 'pending')
                    ->select('member_id', DB::raw('count(*) as count'))
                    ->groupBy('member_id')
                    ->count(),
            ];

            return response()->json($stats);
        } catch (\Exception $e) {
            Log::error('Error fetching pending changes statistics: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error fetching statistics',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred',
            ], 500);
        }
    }

    /**
     * Get pending profile changes with statement information
     * This endpoint returns pending profile changes, similar to index but structured for statement view
     */
    public function statement(Request $request)
    {
        try {
            $query = PendingProfileChange::with([
                'member' => function ($q) {
                    $q->select('id', 'name', 'phone', 'email', 'member_code');
                },
                'reviewedBy' => function ($q) {
                    $q->select('id', 'name', 'email');
                }
            ])
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc');

            if ($request->filled('member_id')) {
                $query->where('member_id', $request->member_id);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->whereHas('member', function ($memberQuery) use ($search) {
                        $memberQuery->where('name', 'like', "%{$search}%")
                          ->orWhere('phone', 'like', "%{$search}%")
                          ->orWhere('email', 'like', "%{$search}%")
                          ->orWhere('member_code', 'like', "%{$search}%");
                    })
                    ->orWhere('field_name', 'like', "%{$search}%")
                    ->orWhere('old_value', 'like', "%{$search}%")
                    ->orWhere('new_value', 'like', "%{$search}%");
                });
            }

            $perPage = max(1, min(100, (int) $request->get('per_page', 25)));
            $changes = $query->paginate($perPage);

            // Transform items to ensure member data is properly formatted
            $items = $changes->items();
            $transformedItems = array_map(function ($change) {
                $member = $change->member ?? null;
                $reviewedBy = $change->reviewedBy ?? null;
                
                // Get basic statement summary for member if available
                $statementSummary = null;
                if ($member && isset($member->id)) {
                    try {
                        $memberModel = Member::find($member->id);
                        if ($memberModel) {
                            $statementSummary = [
                                'total_contributions' => $memberModel->total_contributions ?? 0,
                                'expected_contributions' => $memberModel->expected_contributions ?? 0,
                                'contribution_status' => $memberModel->contribution_status ?? 'unknown',
                            ];
                        }
                    } catch (\Exception $e) {
                        // Ignore errors when fetching statement summary
                        Log::debug('Error fetching statement summary for member: ' . $e->getMessage());
                    }
                }
                
                return [
                    'id' => $change->id ?? null,
                    'member_id' => $change->member_id ?? null,
                    'field_name' => $change->field_name ?? '',
                    'old_value' => $change->old_value ?? null,
                    'new_value' => $change->new_value ?? '',
                    'status' => $change->status ?? 'pending',
                    'reviewed_by' => $change->reviewed_by ?? null,
                    'reviewed_at' => $change->reviewed_at ? $change->reviewed_at->toDateTimeString() : null,
                    'rejection_reason' => $change->rejection_reason ?? null,
                    'created_at' => $change->created_at ? $change->created_at->toDateTimeString() : null,
                    'updated_at' => $change->updated_at ? $change->updated_at->toDateTimeString() : null,
                    'member' => $member ? [
                        'id' => $member->id ?? null,
                        'name' => $member->name ?? '',
                        'phone' => $member->phone ?? '',
                        'email' => $member->email ?? '',
                        'member_code' => $member->member_code ?? '',
                    ] : null,
                    'reviewed_by_user' => $reviewedBy ? [
                        'id' => $reviewedBy->id ?? null,
                        'name' => $reviewedBy->name ?? '',
                        'email' => $reviewedBy->email ?? '',
                    ] : null,
                    'statement_summary' => $statementSummary,
                ];
            }, $items);

            // Return in standard Laravel pagination format
            return response()->json([
                'data' => $transformedItems,
                'current_page' => $changes->currentPage(),
                'last_page' => $changes->lastPage(),
                'per_page' => $changes->perPage(),
                'total' => $changes->total(),
                'from' => $changes->firstItem(),
                'to' => $changes->lastItem(),
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching pending profile changes statement: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json([
                'message' => 'Error fetching pending profile changes statement',
                'error' => config('app.debug') ? $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine() : 'An error occurred',
            ], 500);
        }
    }

    /**
     * Update KYC status if all required documents are approved
     */
    private function updateKycStatusIfComplete(Member $member): void
    {
        $requiredDocuments = ['front_id', 'back_id', 'selfie'];
        $approvedDocuments = KycDocument::where('member_id', $member->id)
            ->whereIn('document_type', $requiredDocuments)
            ->where('status', 'approved')
            ->pluck('document_type')
            ->toArray();

        $allApproved = count(array_intersect($requiredDocuments, $approvedDocuments)) === count($requiredDocuments);

        if ($allApproved && $member->isProfileComplete()) {
            $member->update([
                'kyc_status' => 'approved',
                'kyc_approved_at' => now(),
                'kyc_approved_by' => auth()->id(),
            ]);
        }
    }
}
