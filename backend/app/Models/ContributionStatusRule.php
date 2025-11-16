<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class ContributionStatusRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'type',
        'min_ratio',
        'max_ratio',
        'min_amount',
        'max_amount',
        'color',
        'is_default',
        'sort_order',
    ];

    protected $casts = [
        'min_ratio' => 'float',
        'max_ratio' => 'float',
        'min_amount' => 'float',
        'max_amount' => 'float',
        'is_default' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saving(function (ContributionStatusRule $rule) {
            if (empty($rule->slug)) {
                $rule->slug = Str::slug($rule->name);
            }
        });

        static::saved(fn () => static::clearCache());
        static::deleted(fn () => static::clearCache());
    }

    public static function ordered(): \Illuminate\Database\Eloquent\Builder
    {
        return static::query()->orderBy('sort_order')->orderBy('id');
    }

    public static function cached(): Collection
    {
        return Cache::rememberForever('contribution_status_rules', fn () => static::ordered()->get());
    }

    public static function clearCache(): void
    {
        Cache::forget('contribution_status_rules');
    }

    public static function resolveForTotals(float $actual, float $expected): ?self
    {
        $rules = static::cached();
        $ratio = $expected > 0 ? $actual / $expected : null;

        foreach ($rules as $rule) {
            $type = $rule->type ?: 'percentage';

            if ($type === 'amount') {
                if (!is_null($rule->min_amount) && $actual < (float) $rule->min_amount) {
                    continue;
                }

                if (!is_null($rule->max_amount) && $actual >= (float) $rule->max_amount) {
                    continue;
                }

                return $rule;
            }

            if (is_null($ratio)) {
                continue;
            }

            if (!is_null($rule->min_ratio) && $ratio < (float) $rule->min_ratio) {
                continue;
            }

            if (!is_null($rule->max_ratio) && $ratio >= (float) $rule->max_ratio) {
                continue;
            }

            return $rule;
        }

        return $rules->firstWhere('is_default', true) ?? $rules->last();
    }

    public static function labelForSlug(?string $slug): ?string
    {
        if (!$slug) {
            return null;
        }

        return optional(static::cached()->firstWhere('slug', $slug))->name;
    }

    public static function colorForSlug(?string $slug): ?string
    {
        if (!$slug) {
            return null;
        }

        return optional(static::cached()->firstWhere('slug', $slug))->color;
    }
}


