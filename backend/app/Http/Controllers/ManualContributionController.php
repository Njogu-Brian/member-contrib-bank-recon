<?php

namespace App\Http\Controllers;

use App\Models\ManualContribution;
use App\Models\Member;
use Illuminate\Http\Request;

class ManualContributionController extends Controller
{
    public function index(Request $request)
    {
        $query = ManualContribution::with(['member', 'creator']);

        if ($request->has('member_id')) {
            $query->where('member_id', $request->member_id);
        }

        if ($request->has('date_from')) {
            $query->where('contribution_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('contribution_date', '<=', $request->date_to);
        }

        return response()->json($query->orderBy('contribution_date', 'desc')->paginate($request->get('per_page', 20)));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'member_id' => 'required|exists:members,id',
            'amount' => 'required|numeric|min:0.01',
            'contribution_date' => 'required|date',
            'payment_method' => 'required|in:cash,mpesa,bank_transfer,other',
            'notes' => 'nullable|string',
        ]);

        $validated['created_by'] = $request->user()->id;

        $contribution = ManualContribution::create($validated);
        $contribution->load(['member', 'creator']);

        return response()->json($contribution, 201);
    }

    public function show(ManualContribution $manualContribution)
    {
        $manualContribution->load(['member', 'creator']);
        return response()->json($manualContribution);
    }

    public function update(Request $request, ManualContribution $manualContribution)
    {
        $validated = $request->validate([
            'member_id' => 'sometimes|required|exists:members,id',
            'amount' => 'sometimes|required|numeric|min:0.01',
            'contribution_date' => 'sometimes|required|date',
            'payment_method' => 'sometimes|required|in:cash,mpesa,bank_transfer,other',
            'notes' => 'nullable|string',
        ]);

        $manualContribution->update($validated);
        $manualContribution->load(['member', 'creator']);

        return response()->json($manualContribution);
    }

    public function destroy(ManualContribution $manualContribution)
    {
        $manualContribution->delete();

        return response()->json(['message' => 'Manual contribution deleted successfully']);
    }

    public function importExcel(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        try {
            $file = $request->file('file');
            $extension = $file->getClientOriginalExtension();
            
            if ($extension === 'csv') {
                return $this->importCsv($file, $request->user());
            } else {
                return $this->importExcelFile($file, $request->user());
            }
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Import failed: ' . $e->getMessage(),
            ], 422);
        }
    }

    private function importCsv($file, $user)
    {
        $handle = fopen($file->getRealPath(), 'r');
        $header = fgetcsv($handle);
        $header = array_map('strtolower', array_map('trim', $header));
        
        $errors = [];
        $success = 0;
        $rowNum = 1;
        
        while (($row = fgetcsv($handle)) !== false) {
            $rowNum++;
            $data = array_combine($header, $row);
            
            // Find member by name or phone
            $member = null;
            if (!empty($data['member_name'])) {
                $member = Member::where('name', 'like', '%' . $data['member_name'] . '%')->first();
            }
            if (!$member && !empty($data['phone'])) {
                $member = Member::where('phone', 'like', '%' . $data['phone'] . '%')->first();
            }
            
            if (!$member) {
                $errors[] = "Row {$rowNum}: Member not found";
                continue;
            }
            
            $amount = (float) ($data['amount'] ?? 0);
            $date = $data['date'] ?? $data['contribution_date'] ?? now()->toDateString();
            
            if ($amount <= 0) {
                $errors[] = "Row {$rowNum}: Invalid amount";
                continue;
            }
            
            try {
                ManualContribution::create([
                    'member_id' => $member->id,
                    'amount' => $amount,
                    'contribution_date' => $date,
                    'payment_method' => $data['payment_method'] ?? 'cash',
                    'notes' => $data['notes'] ?? 'Imported from Excel',
                    'created_by' => $user->id,
                ]);
                $success++;
            } catch (\Exception $e) {
                $errors[] = "Row {$rowNum}: " . $e->getMessage();
            }
        }
        
        fclose($handle);
        
        return response()->json([
            'success' => $success,
            'errors' => $errors,
            'message' => "Imported {$success} contributions" . (count($errors) > 0 ? " with " . count($errors) . " errors" : ""),
        ]);
    }

    private function importExcelFile($file, $user)
    {
        // For Excel files, we'll use a simple CSV-like approach
        // In production, you'd use PhpSpreadsheet or similar
        return response()->json([
            'message' => 'Excel import requires PhpSpreadsheet. Please use CSV format for now.',
        ], 422);
    }
}


