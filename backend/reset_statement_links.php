<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

use App\Models\Member;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

echo "Resetting all statement links for members...\n\n";

// Count members with tokens
$membersWithTokens = Member::whereNotNull('public_share_token')->count();
$totalMembers = Member::count();

echo "Total members: {$totalMembers}\n";
echo "Members with statement links: {$membersWithTokens}\n\n";

if ($membersWithTokens === 0) {
    echo "No statement links to reset.\n";
    exit(0);
}

echo "This will invalidate all existing statement links sent via SMS.\n";
echo "New links will be automatically generated when members request them.\n\n";

// Start transaction
DB::beginTransaction();

try {
    // Reset all public_share_token fields to NULL
    // This will invalidate all existing links
    $updated = Member::whereNotNull('public_share_token')
        ->update([
            'public_share_token' => null,
            'public_share_token_expires_at' => null,
            'public_share_last_accessed_at' => null,
            'public_share_access_count' => 0,
        ]);
    
    DB::commit();
    
    echo "✓ Successfully reset {$updated} statement links.\n";
    echo "\nAll existing statement links are now invalid.\n";
    echo "New links will be generated automatically when:\n";
    echo "  - Members request statements via SMS\n";
    echo "  - The system sends new statement links\n";
    echo "  - Members access their statement through the public link\n\n";
    
    Log::info("Reset all statement links", [
        'members_affected' => $updated,
        'reset_by' => 'admin_script',
    ]);
    
} catch (\Exception $e) {
    DB::rollBack();
    echo "\n✗ Error: " . $e->getMessage() . "\n";
    Log::error("Failed to reset statement links: " . $e->getMessage());
    exit(1);
}

