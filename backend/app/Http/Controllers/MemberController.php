<?php

namespace App\Http\Controllers;

use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class MemberController extends Controller
{
    public function index(Request $request)
    {
        $query = Member::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('member_code', 'like', "%{$search}%");
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $members = $query->paginate($request->get('per_page', 15));

        return response()->json($members);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'member_code' => 'nullable|string|max:50|unique:members',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $member = Member::create($validated);

        return response()->json($member, 201);
    }

    public function show(Member $member)
    {
        return response()->json($member);
    }

    public function update(Request $request, Member $member)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'member_code' => 'nullable|string|max:50|unique:members,member_code,' . $member->id,
            'member_number' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $member->update($validated);

        return response()->json($member);
    }

    public function destroy(Member $member)
    {
        $member->delete();

        return response()->json(['message' => 'Member deleted successfully']);
    }

    public function bulkUpload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
        ]);

        $file = $request->file('file');
        $data = array_map('str_getcsv', file($file->getRealPath()));
        $headers = array_shift($data);

        $errors = [];
        $created = 0;
        $updated = 0;

        DB::beginTransaction();
        try {
            foreach ($data as $row) {
                if (count($row) < 2) {
                    continue;
                }

                $rowData = array_combine($headers, $row);
                $validator = Validator::make($rowData, [
                    'name' => 'required|string',
                    'phone' => 'nullable|string',
                    'email' => 'nullable|email',
                    'member_code' => 'nullable|string',
                ]);

                if ($validator->fails()) {
                    $errors[] = ['row' => $row, 'errors' => $validator->errors()];
                    continue;
                }

                // Normalize empty strings to null
                $memberCode = !empty(trim($rowData['member_code'] ?? '')) ? trim($rowData['member_code']) : null;
                $phoneRaw = !empty(trim($rowData['phone'] ?? '')) ? trim($rowData['phone']) : null;
                $email = !empty(trim($rowData['email'] ?? '')) ? trim($rowData['email']) : null;
                $name = trim($rowData['name']);

                // Normalize phone number (remove spaces, dashes, parentheses)
                $phone = $phoneRaw ? preg_replace('/[\s\-\(\)]/', '', $phoneRaw) : null;

                // Determine search criteria: prefer member_code, then name+phone combo
                $searchCriteria = null;
                if ($memberCode) {
                    // Use member_code as primary identifier
                    $searchCriteria = ['member_code' => $memberCode];
                } elseif ($name && $phone) {
                    // Use name+phone as composite key when member_code is missing
                    // This ensures each unique person gets their own record
                    $searchCriteria = [
                        'name' => $name,
                        'phone' => $phone,
                    ];
                } elseif ($name) {
                    // Only name available - use name alone (less ideal but better than nothing)
                    $searchCriteria = ['name' => $name];
                } else {
                    // No usable identifier - skip this row
                    $errors[] = ['row' => $row, 'errors' => ['name' => ['Name is required']]];
                    continue;
                }

                // Update or create using the determined criteria
                $member = Member::updateOrCreate(
                    $searchCriteria,
                    [
                        'name' => $name,
                        'phone' => $phone,
                        'email' => $email,
                        'member_code' => $memberCode, // Preserve member_code if it exists
                        'is_active' => true,
                    ]
                );

                if ($member->wasRecentlyCreated) {
                    $created++;
                } else {
                    $updated++;
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Bulk upload completed',
                'created' => $created,
                'updated' => $updated,
                'errors' => $errors,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Bulk upload failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

