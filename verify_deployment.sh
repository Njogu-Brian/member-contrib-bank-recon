#!/bin/bash
# Verification script to check deployment status

echo "🔍 Verifying Deployment Status..."
echo ""

cd /home/royalce1/laravel-app/evimeria/backend

echo "📊 Checking Invoice Counts:"
echo ""

php artisan tinker --execute="
\$weekly = App\Models\Invoice::where('invoice_type', 'weekly_contribution')->count();
\$registration = App\Models\Invoice::where('invoice_type', 'registration_fee')->count();
\$annual = App\Models\Invoice::where('invoice_type', 'annual_subscription')->count();
\$software = App\Models\Invoice::where('invoice_type', 'software_acquisition')->count();

echo 'Weekly Contribution Invoices: ' . \$weekly . PHP_EOL;
echo 'Registration Fee Invoices: ' . \$registration . PHP_EOL;
echo 'Annual Subscription Invoices: ' . \$annual . PHP_EOL;
echo 'Software Acquisition Invoices: ' . \$software . PHP_EOL;
echo PHP_EOL;

\$total = \$weekly + \$registration + \$annual + \$software;
echo 'Total Invoices: ' . \$total . PHP_EOL;
"

echo ""
echo "📁 Checking Frontend:"
if [ -d "/home/royalce1/public_html/evimeria.breysomsolutions.co.ke" ]; then
    FILE_COUNT=$(find /home/royalce1/public_html/evimeria.breysomsolutions.co.ke -type f | wc -l)
    echo "  Frontend files: $FILE_COUNT"
    if [ $FILE_COUNT -gt 0 ]; then
        echo "  ✓ Frontend deployed"
    else
        echo "  ⚠ Frontend directory is empty"
    fi
else
    echo "  ⚠ Frontend directory not found"
fi

echo ""
echo "✅ Verification complete!"


