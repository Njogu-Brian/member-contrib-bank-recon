<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Database\Seeders\RolePermissionSeeder;

class SeedRolesAndPermissions extends Command
{
    protected $signature = 'admin:seed-roles-permissions';
    protected $description = 'Seed roles and permissions for admin portal';

    public function handle()
    {
        $this->info('Seeding roles and permissions...');
        $seeder = new RolePermissionSeeder();
        $seeder->run();
        $this->info('Roles and permissions seeded successfully!');
    }
}

