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
            'member_code' => 'nullable|string|max:50|unique:members,member_code,'.$member->id,
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

                $member = Member::updateOrCreate(
                    ['member_code' => $rowData['member_code'] ?? null],
                    [
                        'name' => $rowData['name'],
                        'phone' => $rowData['phone'] ?? null,
                        'email' => $rowData['email'] ?? null,
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

