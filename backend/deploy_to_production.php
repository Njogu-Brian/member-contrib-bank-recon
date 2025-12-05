<?php
/**
 * Complete deployment script for profile completion changes
 * Run on production: php deploy_to_production.php
 */

echo "=== Deploying Profile Completion Changes ===\n\n";

// 1. Update Member Model
echo "1. Updating Member model...\n";
$memberFile = __DIR__ . '/app/Models/Member.php';
$memberContent = file_get_contents($memberFile);

// Backup
file_put_contents($memberFile . '.backup.' . date('YmdHis'), $memberContent);

// Update isProfileComplete
$memberContent = preg_replace(
    '/public function isProfileComplete\(\): bool\s*\{[^}]+\}/s',
    "public function isProfileComplete(): bool\n    {\n        return !empty(\$this->name) &&\n               !empty(\$this->phone) &&\n               !empty(\$this->email) &&\n               !empty(\$this->id_number) &&\n               !empty(\$this->church) &&\n               !empty(\$this->next_of_kin_name) &&\n               !empty(\$this->next_of_kin_phone) &&\n               !empty(\$this->next_of_kin_relationship);\n    }",
    $memberContent
);

// Update getMissingProfileFields
$memberContent = preg_replace(
    '/public function getMissingProfileFields\(\): array\s*\{[^}]+\}/s',
    "public function getMissingProfileFields(): array\n    {\n        \$missing = [];\n        \n        if (empty(\$this->name)) \$missing[] = 'name';\n        if (empty(\$this->phone)) \$missing[] = 'phone';\n        if (empty(\$this->email)) \$missing[] = 'email';\n        if (empty(\$this->id_number)) \$missing[] = 'id_number';\n        if (empty(\$this->church)) \$missing[] = 'church';\n        if (empty(\$this->next_of_kin_name)) \$missing[] = 'next_of_kin_name';\n        if (empty(\$this->next_of_kin_phone)) \$missing[] = 'next_of_kin_phone';\n        if (empty(\$this->next_of_kin_relationship)) \$missing[] = 'next_of_kin_relationship';\n        \n        return \$missing;\n    }",
    $memberContent
);

// Update comment
$memberContent = preg_replace(
    '/\/\*\*\s*\* Check if member profile is complete\s*\* Required fields: [^\*]+\*\//',
    "/**\n     * Check if member profile is complete\n     * Required fields: name, phone, email, id_number, church, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship\n     */",
    $memberContent
);

file_put_contents($memberFile, $memberContent);
echo "   ✓ Member model updated\n";

// 2. Update ProfileController
echo "2. Updating ProfileController...\n";
$controllerFile = __DIR__ . '/app/Http/Controllers/ProfileController.php';
$controllerContent = file_get_contents($controllerFile);

// Backup
file_put_contents($controllerFile . '.backup.' . date('YmdHis'), $controllerContent);

// Change nullable to required
$controllerContent = str_replace(
    "'next_of_kin_name' => 'nullable|string|max:255',",
    "'next_of_kin_name' => 'required|string|max:255',",
    $controllerContent
);

$controllerContent = str_replace(
    "'next_of_kin_phone' => ['nullable', 'string', 'max:20', 'regex:/^\\+\\d{1,4}\\d{6,14}$/'],",
    "'next_of_kin_phone' => ['required', 'string', 'max:20', 'regex:/^\\+\\d{1,4}\\d{6,14}$/'],",
    $controllerContent
);

$controllerContent = str_replace(
    "'next_of_kin_relationship' => 'nullable|string|max:255|in:wife,husband,brother,sister,father,mother,son,daughter,cousin,friend,other',",
    "'next_of_kin_relationship' => 'required|string|max:255|in:wife,husband,brother,sister,father,mother,son,daughter,cousin,friend,other',",
    $controllerContent
);

// Add error messages
if (strpos($controllerContent, "next_of_kin_name.required") === false) {
    $controllerContent = str_replace(
        "'phone.regex' => 'Phone number must start with + followed by country code and number (e.g., +254712345678)',",
        "'next_of_kin_name.required' => 'Next of kin name is required',\n            'next_of_kin_phone.required' => 'Next of kin phone number is required',\n            'phone.regex' => 'Phone number must start with + followed by country code and number (e.g., +254712345678)',",
        $controllerContent
    );
}

if (strpos($controllerContent, "next_of_kin_relationship.required") === false) {
    $controllerContent = str_replace(
        "'next_of_kin_phone.regex' => 'Next of kin phone number must start with + followed by country code and number',",
        "'next_of_kin_phone.regex' => 'Next of kin phone number must start with + followed by country code and number',\n            'next_of_kin_relationship.required' => 'Next of kin relationship is required',",
        $controllerContent
    );
}

file_put_contents($controllerFile, $controllerContent);
echo "   ✓ ProfileController updated\n";

// 3. Clear caches
echo "3. Clearing Laravel caches...\n";
exec('php artisan config:clear', $output, $return);
exec('php artisan route:clear', $output, $return);
exec('php artisan cache:clear', $output, $return);
echo "   ✓ Caches cleared\n";

echo "\n=== Backend deployment complete! ===\n";
echo "Next: Upload frontend dist files to production\n";

