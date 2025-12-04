<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Member Statement - {{ $member->name }}</title>
    @include('exports.partials.member_statement_styles')
    <style>
        .page-number {
            position: fixed;
            bottom: 20px;
            right: 28px;
            font-size: 10px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="statement">
        <div class="branding">
            <div class="brand-lockup">
                <div class="brand-icon">
                    @if(isset($logoPath) && $logoPath && file_exists($logoPath))
                        <img src="{{ $logoPath }}" alt="Logo" style="max-height: 60px; max-width: 60px; object-fit: contain;">
                    @else
                        @include('exports.partials.evimeria_logo')
                    @endif
                </div>
                <div class="brand-text">
                    <div class="brand-name">{{ $appName ?? 'Evimeria Initiative' }}</div>
                    <div class="brand-tagline">{{ $appTagline ?? '1000 For A 1000' }}</div>
                </div>
            </div>
        </div>

        <div class="statement-title">Member Contribution Statement</div>
        <div class="generated">
            Generated: {{ $generatedAt->format('F j, Y g:i A') }} | 
            Printed: {{ $printDate->format('F j, Y g:i A') }}
        </div>

        @php
            // Format phone with country code
            $phone = $member->phone ?? '-';
            if ($phone !== '-' && !str_starts_with($phone, '+')) {
                $phone = str_starts_with($phone, '254') ? '+' . $phone : '+254' . ltrim($phone, '0');
            }
            $totalContributions = $summary['total_contributions'] ?? 0;
            $expectedContributions = $summary['expected_contributions'] ?? 0;
            $difference = $totalContributions - $expectedContributions;
            $contributionStatus = $summary['contribution_status_label'] ?? 'Unknown';
            $contributionStatusColor = $summary['contribution_status_color'] ?? '#6B7280';
        @endphp
        
        <table class="info-table">
            <tr>
                <td class="label">Name:</td>
                <td><strong>{{ $member->name }}</strong></td>
                <td class="label">Phone:</td>
                <td><strong>{{ $phone }}</strong></td>
            </tr>
            <tr>
                <td class="label">Member No:</td>
                <td><strong>{{ $member->member_number ?? '-' }}</strong></td>
                <td class="label">ID Number:</td>
                <td><strong>{{ $member->id_number ?? '-' }}</strong></td>
            </tr>
            <tr>
                <td class="label">Email:</td>
                <td>{{ $member->email ?? '-' }}</td>
                <td class="label">Church:</td>
                <td>{{ $member->church ?? '-' }}</td>
            </tr>
            <tr>
                <td class="label">Contribution Status:</td>
                <td colspan="3">
                    <strong style="color: {{ $contributionStatusColor }};">{{ $contributionStatus }}</strong>
                </td>
            </tr>
            <tr>
                <td class="label">Period:</td>
                <td colspan="3"><strong>{{ $rangeLabel }}</strong></td>
            </tr>
        </table>

        <table class="transactions">
            <thead>
                <tr>
                    <th style="width: 12%;">Date</th>
                    <th style="width: 40%;">Description</th>
                    <th style="width: 18%;">Reference</th>
                    <th style="width: 15%;">Type</th>
                    <th style="width: 15%;" class="text-right">Amount (KES)</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($entries as $entry)
                    @php
                        $amount = (float) ($entry['amount'] ?? 0);
                        $dateDisplay = empty($entry['date']) ? '-' : \Carbon\Carbon::parse($entry['date'])->format('M d, Y');
                        $typeLabel = ucwords(str_replace('_', ' ', $entry['type'] ?? 'contribution'));
                    @endphp
                    <tr>
                        <td>{{ $dateDisplay }}</td>
                        <td>{{ $entry['description'] ?? '-' }}</td>
                        <td>{{ $entry['reference'] ?? '-' }}</td>
                        <td>{{ $typeLabel }}</td>
                        <td class="text-right">{{ number_format($amount, 2) }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="5" class="empty-row">No transactions for the selected period.</td>
                    </tr>
                @endforelse
            </tbody>
            <tfoot>
                <tr class="totals-row">
                    <td colspan="4"><strong>Period Total</strong></td>
                    <td class="text-right"><strong>{{ number_format($summary['period_total'] ?? 0, 2) }}</strong></td>
                </tr>
            </tfoot>
        </table>

        @if(count($monthlyTotals) > 0)
            <div style="margin-top: 20px;">
                <h3 style="font-size: 12px; font-weight: 600; margin-bottom: 8px;">Monthly Summary</h3>
                <table class="transactions" style="font-size: 10px;">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th class="text-right">Contributions</th>
                            <th class="text-right">Net</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($monthlyTotals as $month)
                            <tr>
                                <td>{{ $month['label'] }}</td>
                                <td class="text-right">{{ number_format($month['contributions'], 2) }}</td>
                                <td class="text-right">{{ number_format($month['net'], 2) }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endif

        <div class="summary-section" style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px;">
            <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;">Statement Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-size: 14px;">Total Contributions:</td>
                    <td style="padding: 8px 0; text-align: right; font-size: 14px;">KES {{ number_format($totalContributions, 2) }}</td>
                </tr>
                <tr style="border-top: 2px solid #dee2e6;">
                    <td style="padding: 12px 0; font-size: 16px;"><strong>Expected Contributions:</strong></td>
                    <td style="padding: 12px 0; text-align: right; font-size: 16px; font-weight: bold; color: #0066cc;">KES {{ number_format($expectedContributions, 2) }}</td>
                </tr>
                <tr style="background-color: {{ $difference >= 0 ? '#d4edda' : '#f8d7da' }}; border: 2px solid {{ $difference >= 0 ? '#28a745' : '#dc3545' }};">
                    <td style="padding: 12px 10px; font-size: 16px;"><strong>Difference (Contribution - Expected):</strong></td>
                    <td style="padding: 12px 10px; text-align: right; font-size: 18px; font-weight: bold; color: {{ $difference >= 0 ? '#155724' : '#721c24' }};">
                        KES {{ number_format($difference, 2) }}
                    </td>
                </tr>
            </table>
        </div>

        <div class="footer-text" style="margin-top: 24px;">
            <p>This is an electronically generated statement. For further clarification, contact the administrator
            @if(isset($contactPhone) && $contactPhone)
                at <strong>{{ $contactPhone }}</strong>
            @endif
            .</p>
        </div>
    </div>
    
    <div class="page-number">Page 1</div>
</body>
</html>

