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

        <table class="info-table">
            <tr>
                <td class="label">Account Holder:</td>
                <td><strong>{{ $member->name }}</strong></td>
                <td class="label">Member Code:</td>
                <td>{{ $member->member_code ?? $member->member_number ?? '-' }}</td>
            </tr>
            <tr>
                <td class="label">Phone:</td>
                <td>{{ $member->phone ?? '-' }}</td>
                <td class="label">Email:</td>
                <td>{{ $member->email ?? '-' }}</td>
            </tr>
            <tr>
                <td class="label">Statement Period:</td>
                <td colspan="3"><strong>{{ $rangeLabel }}</strong></td>
            </tr>
        </table>

        <div class="note" style="margin-bottom: 14px;">
            <strong>Summary:</strong> Total Contributions: KES {{ number_format($summary['total_contributions'] ?? 0, 2) }} | 
            Expected: KES {{ number_format($summary['expected_contributions'] ?? 0, 2) }} | 
            Difference: KES {{ number_format($summary['difference'] ?? 0, 2) }}
        </div>

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

