<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        //
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // Legacy gates for backward compatibility
        Gate::define('manage-wallets', fn (User $user) => $user->hasRole('admin') || $user->hasRole('treasurer'));
        Gate::define('manage-payments', fn (User $user) => $user->hasRole('admin') || $user->hasRole('treasurer'));
        Gate::define('manage-investments', fn (User $user) => $user->hasRole('admin') || $user->hasRole('treasurer'));
        Gate::define('manage-announcements', fn (User $user) => $user->hasRole('admin'));
        Gate::define('manage-meetings', fn (User $user) => $user->hasRole('admin') || $user->hasRole('treasurer'));
        Gate::define('manage-budget', fn (User $user) => $user->hasRole('admin') || $user->hasRole('treasurer'));
        Gate::define('manage-reports', fn (User $user) => $user->hasRole('admin'));

        // Dynamic permission gates (lazy loaded to avoid issues during migrations)
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('permissions')) {
                $permissions = \App\Models\Permission::all();
                foreach ($permissions as $permission) {
                    Gate::define($permission->slug, fn (User $user) => $user->hasPermission($permission->slug));
                }
            }
        } catch (\Exception $e) {
            // Table doesn't exist yet, skip gate definitions
        }
    }
}

