<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Member Statement</title>
    <?php echo $__env->make('exports.partials.member_statement_styles', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>
</head>
<body>
    <?php echo $__env->make('exports.partials.member_statement_section', [
        'member' => $member,
        'entries' => $entries,
        'summary' => $summary,
        'rangeLabel' => $rangeLabel,
        'generatedAt' => $generatedAt,
        'pageBreak' => false,
    ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>
</body>
</html>

<?php /**PATH D:\Projects\Evimeria_System\backend\resources\views/exports/member_statement.blade.php ENDPATH**/ ?>