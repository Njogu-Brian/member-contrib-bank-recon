<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

use App\Models\Invoice;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

echo "Deleting invoices for January 2024 (period: 2024-W01)...\n\n";

// Get all invoices for 2024-W01
$invoices = Invoice::where('period', '2024-W01')->get();

$total = $invoices->count();
$pending = $invoices->where('status', 'pending')->count();
$paid = $invoices->where('status', 'paid')->count();

echo "Found {$total} invoices:\n";
echo "  - Pending: {$pending}\n";
echo "  - Paid: {$paid}\n\n";

if ($total === 0) {
    echo "No invoices to delete.\n";
    exit(0);
}

echo "Proceeding to delete all invoices...\n";

// Start transaction
DB::beginTransaction();

try {
    $deleted = 0;
    $errors = [];
    
    foreach ($invoices as $invoice) {
        try {
            // For paid invoices, we need to set payment_id to null first to avoid foreign key constraint
            if ($invoice->isPaid() && $invoice->payment_id) {
                $invoice->payment_id = null;
                $invoice->save();
            }
            
            $invoice->delete();
            $deleted++;
            
            if ($deleted % 50 === 0) {
                echo "Deleted {$deleted} invoices...\n";
            }
        } catch (\Exception $e) {
            $errors[] = "Invoice ID {$invoice->id}: " . $e->getMessage();
            Log::error("Failed to delete invoice {$invoice->id}: " . $e->getMessage());
        }
    }
    
    if (count($errors) > 0) {
        echo "\nErrors encountered:\n";
        foreach ($errors as $error) {
            echo "  - {$error}\n";
        }
        DB::rollBack();
        echo "\nTransaction rolled back due to errors.\n";
        exit(1);
    }
    
    DB::commit();
    
    echo "\n✓ Successfully deleted {$deleted} invoices for January 2024.\n";
    Log::info("Deleted {$deleted} invoices for period 2024-W01");
    
} catch (\Exception $e) {
    DB::rollBack();
    echo "\n✗ Error: " . $e->getMessage() . "\n";
    Log::error("Failed to delete January 2024 invoices: " . $e->getMessage());
    exit(1);
}

