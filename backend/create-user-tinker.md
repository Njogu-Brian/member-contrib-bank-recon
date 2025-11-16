# Create User via Tinker

## Option 1: Simple User Creation

```php
php artisan tinker
```

Then run:
```php
$user = App\Models\User::create([
    'name' => 'Admin User',
    'email' => 'admin@example.com',
    'password' => bcrypt('password123'),
]);
```

## Option 2: One-liner Command

```bash
php artisan tinker --execute="App\Models\User::create(['name' => 'Admin User', 'email' => 'admin@example.com', 'password' => bcrypt('password123')]);"
```

## Option 3: Interactive Tinker Session

```bash
php artisan tinker
```

Then:
```php
$user = new App\Models\User();
$user->name = 'Admin User';
$user->email = 'admin@example.com';
$user->password = bcrypt('password123');
$user->save();
```

## Verify User Created

```php
App\Models\User::all();
```

