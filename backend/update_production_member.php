<?php
/**
 * Update Member model on production
 * Run: php update_production_member.php
 */

$file = __DIR__ . '/app/Models/Member.php';
$content = file_get_contents($file);

// Update isProfileComplete method
$content = preg_replace(
    '/public function isProfileComplete\(\): bool\s*\{[^}]+\}/s',
    "public function isProfileComplete(): bool\n    {\n        return !empty(\$this->name) &&\n               !empty(\$this->phone) &&\n               !empty(\$this->email) &&\n               !empty(\$this->id_number) &&\n               !empty(\$this->church) &&\n               !empty(\$this->next_of_kin_name) &&\n               !empty(\$this->next_of_kin_phone) &&\n               !empty(\$this->next_of_kin_relationship);\n    }",
    $content
);

// Update getMissingProfileFields method
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
echo "✓ Member.php updated\n";

