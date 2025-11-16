<?php

namespace App\Http\Controllers;

use App\Models\ContributionStatusRule;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ContributionStatusRuleController extends Controller
{
    public function index()
    {
        $rules = ContributionStatusRule::ordered()->get();

        return response()->json([
            'data' => $rules->map(fn (ContributionStatusRule $rule) => $this->transform($rule)),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);
        $data['sort_order'] = ContributionStatusRule::max('sort_order') + 1;

        $rule = ContributionStatusRule::create($data);

        $this->syncDefaultFlag($rule, $data['is_default'] ?? false);

        return response()->json($this->transform($rule->fresh()), 201);
    }

    public function update(Request $request, ContributionStatusRule $contributionStatus)
    {
        $data = $this->validateData($request, $contributionStatus);

        if (($data['is_default'] ?? null) === false && $contributionStatus->is_default) {
            $otherDefaultExists = ContributionStatusRule::where('id', '!=', $contributionStatus->id)
                ->where('is_default', true)
                ->exists();

            if (!$otherDefaultExists) {
                throw ValidationException::withMessages([
                    'is_default' => 'At least one status must be the default.',
                ]);
            }
        }

        $contributionStatus->fill($data)->save();

        $this->syncDefaultFlag($contributionStatus, $data['is_default'] ?? $contributionStatus->is_default);

        return response()->json($this->transform($contributionStatus->fresh()));
    }

    public function destroy(ContributionStatusRule $contributionStatus)
    {
        if (ContributionStatusRule::count() <= 1) {
            return response()->json(['message' => 'At least one status rule is required.'], 422);
        }

        $wasDefault = $contributionStatus->is_default;
        $contributionStatus->delete();

        if ($wasDefault) {
            $replacement = ContributionStatusRule::ordered()->first();
            if ($replacement) {
                $replacement->is_default = true;
                $replacement->save();
            }
        }

        return response()->json(['message' => 'Status rule deleted.']);
    }

    public function reorder(Request $request)
    {
        $data = $request->validate([
            'order' => 'required|array|min:1',
            'order.*' => 'integer|exists:contribution_status_rules,id',
        ]);

        foreach ($data['order'] as $index => $id) {
            ContributionStatusRule::where('id', $id)->update(['sort_order' => $index + 1]);
        }

        ContributionStatusRule::clearCache();

        return response()->json(['message' => 'Status order updated.']);
    }

    protected function validateData(Request $request, ?ContributionStatusRule $rule = null): array
    {
        $id = $rule?->id;
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'slug' => 'nullable|string|max:120|unique:contribution_status_rules,slug,' . ($id ?? 'null'),
            'description' => 'nullable|string|max:500',
            'type' => 'nullable|in:percentage,amount',
            'min_ratio' => 'nullable|numeric|min:0|max:10',
            'max_ratio' => 'nullable|numeric|min:0|max:10',
            'min_amount' => 'nullable|numeric|min:0',
            'max_amount' => 'nullable|numeric|min:0',
            'color' => 'nullable|string|max:20',
            'is_default' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0|max:1000',
        ]);

        $type = $data['type'] ?? 'percentage';
        $data['type'] = $type;

        if ($type === 'percentage') {
            $hasMin = array_key_exists('min_ratio', $data) && $data['min_ratio'] !== null;
            $hasMax = array_key_exists('max_ratio', $data) && $data['max_ratio'] !== null;

            if (!$hasMin && !$hasMax) {
                throw ValidationException::withMessages([
                    'min_ratio' => 'Provide at least a minimum or maximum percentage.',
                ]);
            }

            if ($hasMin && $hasMax && $data['min_ratio'] >= $data['max_ratio']) {
                throw ValidationException::withMessages([
                    'max_ratio' => 'The maximum percentage must be greater than the minimum.',
                ]);
            }

            $data['min_amount'] = null;
            $data['max_amount'] = null;
        } else {
            $hasMin = array_key_exists('min_amount', $data) && $data['min_amount'] !== null;
            $hasMax = array_key_exists('max_amount', $data) && $data['max_amount'] !== null;

            if (!$hasMin && !$hasMax) {
                throw ValidationException::withMessages([
                    'min_amount' => 'Provide at least a minimum or maximum amount.',
                ]);
            }

            if ($hasMin && $hasMax && $data['min_amount'] >= $data['max_amount']) {
                throw ValidationException::withMessages([
                    'max_amount' => 'The maximum amount must be greater than the minimum.',
                ]);
            }

            $data['min_ratio'] = null;
            $data['max_ratio'] = null;
        }

        return $data;
    }

    protected function syncDefaultFlag(ContributionStatusRule $rule, bool $isDefault): void
    {
        if ($isDefault) {
            ContributionStatusRule::where('id', '!=', $rule->id)->update(['is_default' => false]);
        }

        ContributionStatusRule::clearCache();
    }

    protected function transform(ContributionStatusRule $rule): array
    {
        return [
            'id' => $rule->id,
            'name' => $rule->name,
            'slug' => $rule->slug,
            'description' => $rule->description,
            'type' => $rule->type ?? 'percentage',
            'min_ratio' => $rule->min_ratio,
            'max_ratio' => $rule->max_ratio,
            'min_percentage' => is_null($rule->min_ratio) ? null : round($rule->min_ratio * 100, 2),
            'max_percentage' => is_null($rule->max_ratio) ? null : round($rule->max_ratio * 100, 2),
            'min_amount' => $rule->min_amount,
            'max_amount' => $rule->max_amount,
            'color' => $rule->color,
            'is_default' => (bool) $rule->is_default,
            'sort_order' => $rule->sort_order,
            'created_at' => $rule->created_at,
            'updated_at' => $rule->updated_at,
        ];
    }
}


