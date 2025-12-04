@php
    $range = $rangeLabel ?? 'All Time';
    $memberNumber = $member->member_number ?? '-';
    $email = $member->email ?? '-';
    // Format phone with country code (add +254 for Kenya numbers only if not already formatted)
    $phone = $member->phone ?? '-';
    if ($phone !== '-' && !str_starts_with($phone, '+')) {
        // Only add +254 for Kenyan numbers (starting with 0 or 254)
        if (str_starts_with($phone, '254')) {
            $phone = '+' . $phone;
        } elseif (str_starts_with($phone, '0') && strlen($phone) >= 10) {
            $phone = '+254' . ltrim($phone, '0');
        }
        // Otherwise leave as is (could be international already formatted differently)
    }
    $idNumber = $member->id_number ?? '-';
    $church = $member->church ?? '-';
    $contributionStatus = $summaryData['contribution_status_label'] ?? 'Unknown';
    $contributionStatusColor = $summaryData['contribution_status_color'] ?? '#6B7280';
    $summaryData = $summary ?? [];
    $totalContributions = $summaryData['total_contributions'] ?? 0;
    $expectedContributions = $summaryData['expected_contributions'] ?? 0;
    $difference = $totalContributions - $expectedContributions;
    $generatedDisplay = $generatedAt instanceof \Carbon\CarbonInterface ? $generatedAt->format('F j, Y g:i A') : $generatedAt;
    $sortedEntries = collect($entries ?? [])->sortBy('date')->values();
    $runningBalance = 0;
    $totalCredits = 0;
    $totalDebits = 0;
@endphp

<div class="statement {{ ($pageBreak ?? false) ? 'page-break' : '' }}">
    @php
        // Prepare logo for watermark and header
        $logoBase64 = null;
        if (isset($logoPath) && $logoPath && file_exists($logoPath)) {
            $imageData = base64_encode(file_get_contents($logoPath));
            $imageType = pathinfo($logoPath, PATHINFO_EXTENSION);
            $logoBase64 = 'data:image/' . $imageType . ';base64,' . $imageData;
        }
    @endphp
    
    <!-- Watermark Logo (behind content) -->
    @if($logoBase64)
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: -1; opacity: 0.08; width: 100%; text-align: center;">
            <img src="{{ $logoBase64 }}" alt="Watermark" style="max-width: 500px; max-height: 500px; object-fit: contain;">
        </div>
    @endif
    
    <div class="branding">
        <div class="brand-lockup">
            <div class="brand-icon">
                @if($logoBase64)
                    <img src="{{ $logoBase64 }}" alt="Logo" style="max-height: 80px; max-width: 80px; object-fit: contain;">
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

    <div class="statement-title">Comprehensive Member Statement</div>
    <div class="generated">Generated: {{ $generatedDisplay }}</div>

    <table class="info-table">
        <tr>
            <td class="label">Name:</td>
            <td><strong>{{ $member->name }}</strong></td>
            <td class="label">Phone:</td>
            <td><strong>{{ $phone }}</strong></td>
        </tr>
        <tr>
            <td class="label">Member No:</td>
            <td><strong>{{ $memberNumber }}</strong></td>
            <td class="label">ID Number:</td>
            <td><strong>{{ $idNumber }}</strong></td>
        </tr>
        <tr>
            <td class="label">Email:</td>
            <td>{{ $email }}</td>
            <td class="label">Church:</td>
            <td>{{ $church }}</td>
        </tr>
        <tr>
            <td class="label">Contribution Status:</td>
            <td colspan="3">
                <strong style="color: {{ $contributionStatusColor }};">{{ $contributionStatus }}</strong>
            </td>
        </tr>
        <tr>
            <td class="label">Period:</td>
            <td colspan="3"><strong>{{ $range }}</strong></td>
        </tr>
    </table>

    <div class="note">
        Note: Positive balances below indicate <strong>amount owed</strong> (debits exceed credits).
    </div>

    <table class="transactions">
        <thead>
            <tr>
                <th style="width: 16%;">Date</th>
                <th>Description</th>
                <th style="width: 16%;">Debit (KES)</th>
                <th style="width: 16%;">Credit (KES)</th>
                <th style="width: 18%;">Balance (KES)</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($sortedEntries as $entry)
                @php
                    // Handle both 'amount' property and 'credit'/'debit' properties
                    $amount = isset($entry['amount']) 
                        ? (float) $entry['amount'] 
                        : (float) (($entry['credit'] ?? 0) - ($entry['debit'] ?? 0));
                    $isDebit = $amount < 0;
                    $debit = $isDebit ? abs($amount) : 0;
                    $credit = $isDebit ? 0 : $amount;
                    $runningBalance += $amount;
                    $totalDebits += $debit;
                    $totalCredits += $credit;
                    $dateDisplay = empty($entry['date']) ? '-' : \Carbon\Carbon::parse($entry['date'])->format('M d, Y');
                @endphp
                <tr>
                    <td>{{ $dateDisplay }}</td>
                    <td>{{ $entry['description'] ?? '-' }}</td>
                    <td class="text-right">{{ $debit ? number_format($debit, 2) : '-' }}</td>
                    <td class="text-right">{{ $credit ? number_format($credit, 2) : '-' }}</td>
                    <td class="text-right">{{ number_format($runningBalance, 2) }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" class="empty-row">No statement activity for the selected period.</td>
                </tr>
            @endforelse
        </tbody>
        <tfoot>
            <tr class="totals-row">
                <td colspan="2">Totals</td>
                <td class="text-right">{{ number_format($totalDebits, 2) }}</td>
                <td class="text-right">{{ number_format($totalCredits, 2) }}</td>
                <td class="text-right">{{ number_format($runningBalance, 2) }}</td>
            </tr>
        </tfoot>
    </table>

    <div class="summary-section" style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;">Statement Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 8px 0; font-size: 14px;">Total Contributions:</td>
                <td style="padding: 8px 0; text-align: right; font-size: 14px;">KES {{ number_format($totalContributions, 2) }}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; font-size: 14px;">Total Expenses:</td>
                <td style="padding: 8px 0; text-align: right; font-size: 14px;">KES {{ number_format($summaryData['total_expenses'] ?? 0, 2) }}</td>
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

    <div class="footer-text">
        Statement generated electronically by {{ $appName ?? 'Evimeria Initiative' }} Contributions System.
    </div>
</div>

