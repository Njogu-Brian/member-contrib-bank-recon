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
        'pageBreak' => false,
    ])
</body>
</html>

