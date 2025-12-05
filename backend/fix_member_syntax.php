<?php
/**
 * Fix Member.php syntax error on production
 * Run: php fix_member_syntax.php
 */

$file = __DIR__ . '/app/Models/Member.php';

if (!file_exists($file)) {
    echo "File not found: $file\n";
    exit(1);
}

// Backup
copy($file, $file . '.backup.' . date('YmdHis'));

$content = file_get_contents($file);

// Fix isProfileComplete method
$content = preg_replace(
    '/public function isProfileComplete\(\): bool\s*\{[^}]+\}/s',
    "public function isProfileComplete(): bool\n    {\n        return !empty(\$this->name) &&\n               !empty(\$this->phone) &&\n               !empty(\$this->email) &&\n               !empty(\$this->id_number) &&\n               !empty(\$this->church) &&\n               !empty(\$this->next_of_kin_name) &&\n               !empty(\$this->next_of_kin_phone) &&\n               !empty(\$this->next_of_kin_relationship);\n    }",
    $content
);

// Fix getMissingProfileFields method
$content = preg_replace(
    '/public function getMissingProfileFields\(\): array\s*\{[^}]+\}/s',
    "public function getMissingProfileFields(): array\n    {\n        \$missing = [];\n        \n        if (empty(\$this->name)) \$missing[] = 'name';\n        if (empty(\$this->phone)) \$missing[] = 'phone';\n        if (empty(\$this->email)) \$missing[] = 'email';\n        if (empty(\$this->id_number)) \$missing[] = 'id_number';\n        if (empty(\$this->church)) \$missing[] = 'church';\n        if (empty(\$this->next_of_kin_name)) \$missing[] = 'next_of_kin_name';\n        if (empty(\$this->next_of_kin_phone)) \$missing[] = 'next_of_kin_phone';\n        if (empty(\$this->next_of_kin_relationship)) \$missing[] = 'next_of_kin_relationship';\n        \n        return \$missing;\n    }",
    $content
);

// Update comment
$content = preg_replace(
    '/\/\*\*\s*\* Check if member profile is complete\s*\* Required fields: [^\*]+\*\//',
    "/**\n     * Check if member profile is complete\n     * Required fields: name, phone, email, id_number, church, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship\n     */",
    $content
);

file_put_contents($file, $content);

// Verify syntax
$output = [];
$return = 0;
exec("php -l " . escapeshellarg($file) . " 2>&1", $output, $return);

if ($return === 0) {
    echo "✓ Member.php syntax fixed and verified!\n";
} else {
    echo "✗ Syntax error still exists:\n";
    echo implode("\n", $output) . "\n";
    // Restore backup
    $backup = glob($file . '.backup.*');
    if (!empty($backup)) {
        copy(end($backup), $file);
        echo "\nBackup restored.\n";
    }
    exit(1);
}

echo "\nFile updated successfully. Backup created.\n";

