<?php
/**
 * Script to update Member model and ProfileController on production
 * Run this on the production server
 */

$memberModelPath = __DIR__ . '/app/Models/Member.php';
$profileControllerPath = __DIR__ . '/app/Http/Controllers/ProfileController.php';

echo "Updating Member model...\n";

// Update Member model - isProfileComplete method
$memberContent = file_get_contents($memberModelPath);

// Replace isProfileComplete method
$oldIsComplete = '/public function isProfileComplete\(\): bool\s*\{[^}]+\}/s';
$newIsComplete = <<<'PHP'
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
PHP;

$memberContent = preg_replace($oldIsComplete, $newIsComplete, $memberContent);

// Replace getMissingProfileFields method
$oldMissingFields = '/public function getMissingProfileFields\(\): array\s*\{[^}]+\}/s';
$newMissingFields = <<<'PHP'
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
PHP;

$memberContent = preg_replace($oldMissingFields, $newMissingFields, $memberContent);

// Update comment
$memberContent = preg_replace(
    '/\/\*\*\s*\* Check if member profile is complete\s*\* Required fields: [^\*]+\*\//',
    '/**' . "\n" . '     * Check if member profile is complete' . "\n" . '     * Required fields: name, phone, email, id_number, church, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship' . "\n" . '     */',
    $memberContent
);

file_put_contents($memberModelPath, $memberContent);
echo "✓ Member model updated\n";

echo "Updating ProfileController...\n";

// Update ProfileController validation
$controllerContent = file_get_contents($profileControllerPath);

// Replace next_of_kin validation rules
$controllerContent = preg_replace(
    "/'next_of_kin_name' => 'nullable/",
    "'next_of_kin_name' => 'required",
    $controllerContent
);

$controllerContent = preg_replace(
    "/'next_of_kin_phone' => \['nullable'/",
    "'next_of_kin_phone' => ['required'",
    $controllerContent
);

$controllerContent = preg_replace(
    "/'next_of_kin_relationship' => 'nullable/",
    "'next_of_kin_relationship' => 'required",
    $controllerContent
);

// Add error messages if not present
if (strpos($controllerContent, "next_of_kin_name.required") === false) {
    $controllerContent = preg_replace(
        "/'phone\.regex' => 'Phone number must start with/",
        "'next_of_kin_name.required' => 'Next of kin name is required',\n            'next_of_kin_phone.required' => 'Next of kin phone number is required',\n            'phone.regex' => 'Phone number must start with",
        $controllerContent
    );
}

if (strpos($controllerContent, "next_of_kin_relationship.required") === false) {
    $controllerContent = preg_replace(
        "/'next_of_kin_phone\.regex' => 'Next of kin phone number must start with/",
        "'next_of_kin_phone.regex' => 'Next of kin phone number must start with + followed by country code and number',\n            'next_of_kin_relationship.required' => 'Next of kin relationship is required',\n            'next_of_kin_phone.regex' => 'Next of kin phone number must start with",
        $controllerContent
    );
}

file_put_contents($profileControllerPath, $controllerContent);
echo "✓ ProfileController updated\n";

echo "\nAll backend changes applied successfully!\n";
echo "Next: Build and deploy frontend dist\n";

