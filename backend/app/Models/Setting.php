<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
        'type',
        'description',
    ];

    public static function get(string $key, $default = null)
    {
        $setting = self::where('key', $key)->first();
        
        if (!$setting) {
            return $default;
        }

        return match ($setting->type) {
            'boolean' => filter_var($setting->value, FILTER_VALIDATE_BOOLEAN),
            'number' => is_numeric($setting->value) ? (float) $setting->value : $default,
            'date' => $setting->value ? \Carbon\Carbon::parse($setting->value) : $default,
            default => $setting->value ?? $default,
        };
    }

    public static function set(string $key, $value, string $type = 'string', string $description = null): void
    {
        $setting = self::updateOrCreate(
            ['key' => $key],
            [
                'value' => is_array($value) || is_object($value) ? json_encode($value) : (string) $value,
                'type' => $type,
                'description' => $description,
            ]
        );
    }

    public static function getContributionStartDate(): ?\Carbon\Carbon
    {
        return self::get('contribution_start_date');
    }

    public static function getCurrentWeek(): int
    {
        $startDate = self::getContributionStartDate();
        if (!$startDate) {
            return 0;
        }

        $now = now('Africa/Nairobi');
        $weeks = $startDate->diffInWeeks($now);
        return $weeks + 1; // Week 1 is the first week
    }
}

