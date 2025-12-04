<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Member Statement</title>
    @include('exports.partials.member_statement_styles')
</head>
<body>
    @include('exports.partials.member_statement_section', [
        'member' => $member,
        'entries' => $entries,
        'summary' => $summary,
        'rangeLabel' => $rangeLabel,
        'generatedAt' => $generatedAt,
        'logoPath' => $logoPath ?? null,
        'appName' => $appName ?? 'Evimeria Initiative',
        'appTagline' => $appTagline ?? '1000 For A 1000',
        'pageBreak' => false,
    ])
</body>
</html>

