# Quick Fix for Member.php Syntax Error

## Problem:
Production has a syntax error in `app/Models/Member.php` causing 500 errors.

## Solution Options:

### Option 1: Run the Fix Script (Recommended)

SSH into production and run:
```bash
cd ~/laravel-app/evimeria/backend
php fix_member_syntax.php
```

This will:
- Create a backup
- Fix the syntax error
- Verify the fix worked

### Option 2: Manual Fix via cPanel

1. Open `app/Models/Member.php` in cPanel File Manager
2. Find the `isProfileComplete()` method (around line 286)
3. Replace it with the correct code from `Member_fix_section.php`
4. Find the `getMissingProfileFields()` method (around line 301)
5. Replace it with the correct code from `Member_fix_section.php`

### Option 3: Upload Correct File

1. Extract `backend_updates.zip` locally
2. Upload `app/Models/Member.php` to production
3. Make sure it goes to: `~/laravel-app/evimeria/backend/app/Models/Member.php`

## After Fixing:

1. Verify syntax:
   ```bash
   php -l app/Models/Member.php
   ```
   Should say: "No syntax errors detected"

2. Clear caches:
   ```bash
   php artisan config:clear
   php artisan route:clear
   php artisan cache:clear
   ```

3. Test the API endpoints again

## The Correct Code:

The `isProfileComplete()` method should be:
```php
public function isProfileComplete(): bool
{
    return !empty($this->name) &&
           !empty($this->phone) &&
           !empty($this->email) &&
           !empty($this->id_number) &&
           !empty($this->church) &&
           !empty($this->next_of_kin_name) &&
           !empty($this->next_of_kin_phone) &&
           !empty($this->next_of_kin_relationship);
}
```

The `getMissingProfileFields()` method should be:
```php
public function getMissingProfileFields(): array
{
    $missing = [];
    
    if (empty($this->name)) $missing[] = 'name';
    if (empty($this->phone)) $missing[] = 'phone';
    if (empty($this->email)) $missing[] = 'email';
    if (empty($this->id_number)) $missing[] = 'id_number';
    if (empty($this->church)) $missing[] = 'church';
    if (empty($this->next_of_kin_name)) $missing[] = 'next_of_kin_name';
    if (empty($this->next_of_kin_phone)) $missing[] = 'next_of_kin_phone';
    if (empty($this->next_of_kin_relationship)) $missing[] = 'next_of_kin_relationship';
    
    return $missing;
}
```

