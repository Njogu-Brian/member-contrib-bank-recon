<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>All Member Statements</title>
    <?php echo $__env->make('exports.partials.member_statement_styles', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>
</head>
<body>
<?php $__currentLoopData = $items; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
    <?php
        $member = $item['member'];
        $entries = $item['data']['collection'];
        $summary = $item['data']['summary'];
        $rangeLabel = $item['data']['range_label'];
    ?>
    <?php echo $__env->make('exports.partials.member_statement_section', [
        'member' => $member,
        'entries' => $entries,
        'summary' => $summary,
        'rangeLabel' => $rangeLabel,
        'generatedAt' => $generatedAt,
        'pageBreak' => !$loop->last,
    ], \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>
<?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
</body>
</html>


<?php /**PATH D:\Projects\Evimeria_System\backend\resources\views/exports/bulk_member_statements.blade.php ENDPATH**/ ?>