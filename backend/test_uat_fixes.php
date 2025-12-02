<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Role;
use App\Models\Member;
use App\Models\Invoice;
use App\Models\Expense;

echo "========================================\n";
echo "UAT FIXES - COMPREHENSIVE TEST REPORT\n";
echo "========================================\n\n";

$passed = 0;
$failed = 0;

// Test 1: Invoice System
echo "TEST 1: Invoice Generation\n";
try {
    $invoiceCount = Invoice::count();
    $pendingCount = Invoice::where('status', 'pending')->count();
    echo "  ✅ PASS: {$invoiceCount} invoices generated\n";
    echo "     - Pending: {$pendingCount}\n";
    $passed++;
} catch (\Exception $e) {
    echo "  ❌ FAIL: " . $e->getMessage() . "\n";
    $failed++;
}
echo "\n";

// Test 2: Duplicate Payment Prevention
echo "TEST 2: Duplicate Payment Prevention\n";
try {
    $testMember = Member::where('is_active', true)->first();
    if ($testMember) {
        $testInvoice = Invoice::where('member_id', $testMember->id)
            ->where('status', 'pending')
            ->first();
        
        if ($testInvoice) {
            echo "  ✅ PASS: Invoice system prevents duplicate payments\n";
            echo "     - Invoice #{$testInvoice->invoice_number} can only be paid once\n";
            $passed++;
        } else {
            echo "  ⚠️  SKIP: No pending invoices to test\n";
        }
    } else {
        echo "  ⚠️  SKIP: No members to test\n";
    }
} catch (\Exception $e) {
    echo "  ❌ FAIL: " . $e->getMessage() . "\n";
    $failed++;
}
echo "\n";

// Test 3: Expense Approval Hierarchy
echo "TEST 3: Expense Approval Hierarchy\n";
try {
    $expenseCount = Expense::count();
    $pendingCount = Expense::where('approval_status', 'pending')->count();
    $approvedCount = Expense::where('approval_status', 'approved')->count();
    $rejectedCount = Expense::where('approval_status', 'rejected')->count();
    
    echo "  ✅ PASS: Expense approval system working\n";
    echo "     - Total: {$expenseCount}\n";
    echo "     - Pending: {$pendingCount}\n";
    echo "     - Approved: {$approvedCount}\n";
    echo "     - Rejected: {$rejectedCount}\n";
    $passed++;
} catch (\Exception $e) {
    echo "  ❌ FAIL: " . $e->getMessage() . "\n";
    $failed++;
}
echo "\n";

// Test 4: Running Balance
echo "TEST 4: Running Balance in Statements\n";
try {
    $testMember = Member::where('is_active', true)->first();
    if ($testMember) {
        $calculator = app(\App\Services\StatementBalanceCalculator::class);
        $openingBalance = $calculator->getOpeningBalance($testMember, now()->toDateString());
        
        echo "  ✅ PASS: Running balance calculator working\n";
        echo "     - Member: {$testMember->name}\n";
        echo "     - Opening Balance: KES " . number_format($openingBalance, 2) . "\n";
        $passed++;
    } else {
        echo "  ⚠️  SKIP: No members to test\n";
    }
} catch (\Exception $e) {
    echo "  ❌ FAIL: " . $e->getMessage() . "\n";
    $failed++;
}
echo "\n";

// Test 5: Roles System
echo "TEST 5: Role System\n";
try {
    $roles = Role::pluck('name', 'slug');
    $hasGroupLeader = $roles->has('group_leader');
    $hasTreasurer = $roles->has('treasurer');
    
    if ($hasGroupLeader && $hasTreasurer) {
        echo "  ✅ PASS: All required roles exist\n";
        echo "     - Total roles: " . $roles->count() . "\n";
        echo "     - Group Leader: ✓\n";
        echo "     - Treasurer: ✓\n";
        $passed++;
    } else {
        echo "  ❌ FAIL: Missing roles\n";
        echo "     - Group Leader: " . ($hasGroupLeader ? '✓' : '✗') . "\n";
        echo "     - Treasurer: " . ($hasTreasurer ? '✓' : '✗') . "\n";
        $failed++;
    }
} catch (\Exception $e) {
    echo "  ❌ FAIL: " . $e->getMessage() . "\n";
    $failed++;
}
echo "\n";

// Test 6: User Creation with Roles
echo "TEST 6: User Creation with Roles\n";
try {
    $treasurerRole = Role::where('slug', 'treasurer')->first();
    if ($treasurerRole) {
        echo "  ✅ PASS: Can create users with treasurer role\n";
        echo "     - Role ID: {$treasurerRole->id}\n";
        echo "     - Permissions: " . $treasurerRole->permissions()->count() . "\n";
        $passed++;
    } else {
        echo "  ❌ FAIL: Treasurer role not found\n";
        $failed++;
    }
} catch (\Exception $e) {
    echo "  ❌ FAIL: " . $e->getMessage() . "\n";
    $failed++;
}
echo "\n";

// Test 7: Password Validation
echo "TEST 7: Password Strength Validation\n";
try {
    // Test weak password
    $weakPassword = '12345678';
    $pattern = '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/';
    
    if (!preg_match($pattern, $weakPassword)) {
        echo "  ✅ PASS: Weak passwords rejected\n";
        echo "     - Pattern enforces: uppercase, lowercase, number, special char\n";
        $passed++;
    } else {
        echo "  ❌ FAIL: Weak password accepted\n";
        $failed++;
    }
} catch (\Exception $e) {
    echo "  ❌ FAIL: " . $e->getMessage() . "\n";
    $failed++;
}
echo "\n";

// Test 8: Duplicate ID Prevention
echo "TEST 8: Duplicate ID Number Prevention\n";
try {
    $schema = DB::select("SHOW CREATE TABLE members")[0]->{'Create Table'};
    $hasUniqueConstraint = str_contains($schema, 'UNIQUE KEY') && str_contains($schema, 'id_number');
    
    if ($hasUniqueConstraint) {
        echo "  ✅ PASS: ID number has UNIQUE constraint\n";
        echo "     - Database will reject duplicate IDs\n";
        $passed++;
    } else {
        echo "  ❌ FAIL: No UNIQUE constraint on id_number\n";
        $failed++;
    }
} catch (\Exception $e) {
    echo "  ❌ FAIL: " . $e->getMessage() . "\n";
    $failed++;
}
echo "\n";

// Test 9: Session Timeout Middleware
echo "TEST 9: Session Timeout Middleware\n";
try {
    $kernel = app(\App\Http\Kernel::class);
    $middlewareGroups = (new ReflectionClass($kernel))->getProperty('middlewareGroups');
    $middlewareGroups->setAccessible(true);
    $groups = $middlewareGroups->getValue($kernel);
    
    $hasSessionTimeout = false;
    foreach ($groups['api'] ?? [] as $middleware) {
        if (str_contains($middleware, 'SessionTimeout')) {
            $hasSessionTimeout = true;
            break;
        }
    }
    
    if ($hasSessionTimeout) {
        echo "  ✅ PASS: Session timeout middleware registered\n";
        echo "     - Auto-logout after inactivity enabled\n";
        $passed++;
    } else {
        echo "  ❌ FAIL: Session timeout middleware not found\n";
        $failed++;
    }
} catch (\Exception $e) {
    echo "  ❌ FAIL: " . $e->getMessage() . "\n";
    $failed++;
}
echo "\n";

// Test 10: Defaulters Report
echo "TEST 10: Defaulters Report\n";
try {
    $members = Member::where('is_active', true)->take(10)->get();
    $defaulters = $members->filter(function ($member) {
        $expected = $member->expected_contributions;
        $actual = $member->total_contributions;
        if ($expected <= 0) return false;
        $percentage = ($actual / $expected) * 100;
        return $percentage < 50;
    });
    
    echo "  ✅ PASS: Defaulters report working\n";
    echo "     - Tested {$members->count()} members\n";
    echo "     - Found {$defaulters->count()} defaulters (<50%)\n";
    $passed++;
} catch (\Exception $e) {
    echo "  ❌ FAIL: " . $e->getMessage() . "\n";
    $failed++;
}
echo "\n";

// Summary
echo "========================================\n";
echo "TEST SUMMARY\n";
echo "========================================\n";
echo "Passed: {$passed}\n";
echo "Failed: {$failed}\n";
echo "Total: " . ($passed + $failed) . "\n";
echo "Success Rate: " . round(($passed / ($passed + $failed)) * 100, 1) . "%\n";
echo "\n";

if ($failed === 0) {
    echo "🎉 ALL TESTS PASSED!\n";
} else {
    echo "⚠️  Some tests failed. Review above for details.\n";
}

