#!/usr/bin/env php
<?php

$statements = [
    ['id' => 26, 'file' => '1764919651_EvimeriaAccount_statementTB25120500632751.pdf', 'expected_credit' => 84159],
    ['id' => 24, 'file' => '1764703087_Account_statementTB25112800289853.pdf', 'expected_credit' => 388032],
    ['id' => 23, 'file' => '1764007852_EVIMERIA (1).pdf', 'expected_credit' => 917650],
    ['id' => 22, 'file' => '1763997250_JOINT 02-10-2025-29-10-2025.pdf', 'expected_credit' => 20000],
    ['id' => 21, 'file' => '1764007871_EVIMERIA OCT.pdf', 'expected_credit' => 576841],
    ['id' => 18, 'file' => '1763997307_JOINT ACCOUNT 01-09-2024-4.04.2025.pdf', 'expected_credit' => 2556091],
    ['id' => 19, 'file' => '1764700057_EVIMERIA 30.10.2024-27-10-2025.pdf', 'expected_credit' => 6081513],
    ['id' => 20, 'file' => '1764008257_Evimeria Paybill statement.pdf', 'expected_credit' => 1154485],
];

echo "🧪 TESTING ALL STATEMENTS WITH CURRENT PARSER\n";
echo str_repeat("=", 80) . "\n\n";

$results = [];

foreach ($statements as $stmt) {
    $filePath = "storage/app/statements/{$stmt['file']}";
    
    if (!file_exists($filePath)) {
        echo "⚠️  Statement {$stmt['id']}: File not found\n\n";
        continue;
    }
    
    echo "Statement {$stmt['id']}: {$stmt['file']}\n";
    echo "  Expected: KES " . number_format($stmt['expected_credit']) . "\n";
    
    // Run parser
    $output = shell_exec("python ../ocr-parser/parse_pdf.py \"{$filePath}\" 2>&1");
    
    if ($output) {
        $transactions = json_decode($output, true);
        
        if ($transactions && is_array($transactions)) {
            $count = count($transactions);
            $totalCredit = array_sum(array_column($transactions, 'credit'));
            $diff = $totalCredit - $stmt['expected_credit'];
            $diffPercent = $stmt['expected_credit'] > 0 ? ($diff / $stmt['expected_credit']) * 100 : 0;
            
            $status = abs($diffPercent) < 0.5 ? "✅" : (abs($diffPercent) < 2 ? "⚠️" : "🔴");
            
            echo "  Parser:   {$count} transactions, KES " . number_format($totalCredit, 2) . " {$status}\n";
            echo "  Diff:     KES " . number_format($diff, 2) . " (" . number_format($diffPercent, 2) . "%)\n";
            
            if (abs($diff) > $stmt['expected_credit'] * 0.02) {
                // More than 2% off - check for issues
                $large = array_filter($transactions, fn($t) => ($t['credit'] ?? 0) > 100000);
                if (count($large) > 0) {
                    echo "  🚨 Found " . count($large) . " transactions > 100K (possible balance rows)\n";
                }
            }
            
            $results[] = [
                'id' => $stmt['id'],
                'count' => $count,
                'parser_credit' => $totalCredit,
                'expected_credit' => $stmt['expected_credit'],
                'diff' => $diff,
                'diff_percent' => $diffPercent,
                'status' => $status
            ];
        } else {
            echo "  ❌ Parser failed or returned invalid JSON\n";
        }
    } else {
        echo "  ❌ Parser command failed\n";
    }
    
    echo "\n";
}

echo str_repeat("=", 80) . "\n";
echo "SUMMARY\n";
echo str_repeat("=", 80) . "\n\n";

$perfect = count(array_filter($results, fn($r) => abs($r['diff_percent']) < 0.5));
$good = count(array_filter($results, fn($r) => abs($r['diff_percent']) < 2 && abs($r['diff_percent']) >= 0.5));
$bad = count(array_filter($results, fn($r) => abs($r['diff_percent']) >= 2));

echo "✅ Perfect (<0.5% diff): {$perfect}/" . count($results) . "\n";
echo "⚠️  Good (<2% diff): {$good}/" . count($results) . "\n";
echo "🔴 Bad (>=2% diff): {$bad}/" . count($results) . "\n\n";

if ($bad > 0) {
    echo "STATEMENTS NEEDING FIX:\n";
    foreach ($results as $r) {
        if (abs($r['diff_percent']) >= 2) {
            echo "  Statement {$r['id']}: Off by KES " . number_format($r['diff'], 2) . " ({$r['diff_percent']}%)\n";
        }
    }
}

