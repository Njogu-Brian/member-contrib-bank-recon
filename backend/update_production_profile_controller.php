<?php
/**
 * Update ProfileController on production
 * Run: php update_production_profile_controller.php
 */

$file = __DIR__ . '/app/Http/Controllers/ProfileController.php';
$content = file_get_contents($file);

// Change nullable to required for next_of_kin fields
$content = str_replace(
    "'next_of_kin_name' => 'nullable|string|max:255',",
    "'next_of_kin_name' => 'required|string|max:255',",
    $content
);

$content = str_replace(
    "'next_of_kin_phone' => ['nullable', 'string', 'max:20', 'regex:/^\\+\\d{1,4}\\d{6,14}$/'],",
    "'next_of_kin_phone' => ['required', 'string', 'max:20', 'regex:/^\\+\\d{1,4}\\d{6,14}$/'],",
    $content
);

$content = str_replace(
    "'next_of_kin_relationship' => 'nullable|string|max:255|in:wife,husband,brother,sister,father,mother,son,daughter,cousin,friend,other',",
    "'next_of_kin_relationship' => 'required|string|max:255|in:wife,husband,brother,sister,father,mother,son,daughter,cousin,friend,other',",
    $content
);

// Add error messages if not present
if (strpos($content, "next_of_kin_name.required") === false) {
    $content = str_replace(
        "'phone.regex' => 'Phone number must start with + followed by country code and number (e.g., +254712345678)',",
        "'next_of_kin_name.required' => 'Next of kin name is required',\n            'next_of_kin_phone.required' => 'Next of kin phone number is required',\n            'phone.regex' => 'Phone number must start with + followed by country code and number (e.g., +254712345678)',",
        $content
    );
}

if (strpos($content, "next_of_kin_relationship.required") === false) {
    $content = str_replace(
        "'next_of_kin_phone.regex' => 'Next of kin phone number must start with + followed by country code and number',",
        "'next_of_kin_phone.regex' => 'Next of kin phone number must start with + followed by country code and number',\n            'next_of_kin_relationship.required' => 'Next of kin relationship is required',",
        $content
    );
}

file_put_contents($file, $content);
echo "✓ ProfileController.php updated\n";

