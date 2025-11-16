<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>All Member Statements</title>
    @include('exports.partials.member_statement_styles')
</head>
<body>
@foreach ($items as $item)
    @php
        $member = $item['member'];
        $entries = $item['data']['collection'];
        $summary = $item['data']['summary'];
        $rangeLabel = $item['data']['range_label'];
    @endphp
    @include('exports.partials.member_statement_section', [
        'member' => $member,
        'entries' => $entries,
        'summary' => $summary,
        'rangeLabel' => $rangeLabel,
        'generatedAt' => $generatedAt,
        'pageBreak' => !$loop->last,
    ])
@endforeach
</body>
</html>


