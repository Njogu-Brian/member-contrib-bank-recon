<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'module',
        'action',
        'description',
    ];

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'role_permissions');
    }

    public static function getModules(): array
    {
        return [
            'dashboard',
            'members',
            'staff',
            'contributions',
            'payments',
            'expenses',
            'investments',
            'announcements',
            'meetings',
            'reports',
            'settings',
            'integrations',
            'audit_logs',
            'transactions',
            'statements',
            'sms',
            'wallets',
            'budgets',
        ];
    }

    public static function getActions(): array
    {
        return [
            'view',
            'create',
            'update',
            'delete',
            'export',
            'approve',
            'manage',
        ];
    }
}

