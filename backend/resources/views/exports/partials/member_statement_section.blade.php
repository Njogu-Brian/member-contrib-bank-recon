@php
    $range = $rangeLabel ?? 'All Time';
    $memberNumber = $member->member_code ?? $member->member_number ?? '-';
    $email = $member->email ?? '-';
    $phone = $member->phone ?? '-';
    $membershipType = $member->membership_type ?? 'Member';
    $residentChurch = $member->resident_church ?? '-';
    $statusLabel = $member->is_active ? 'Active' : 'Inactive';
    $summaryData = $summary ?? [];
    $totalContributions = $summaryData['total_contributions'] ?? 0;
    $expectedContributions = $summaryData['expected_contributions'] ?? 0;
    $outstanding = max($expectedContributions - $totalContributions, 0);
    $generatedDisplay = $generatedAt instanceof \Carbon\CarbonInterface ? $generatedAt->format('F j, Y g:i A') : $generatedAt;
    $sortedEntries = collect($entries ?? [])->sortBy('date')->values();
    $runningBalance = 0;
    $totalCredits = 0;
    $totalDebits = 0;
@endphp

<div class="statement {{ ($pageBreak ?? false) ? 'page-break' : '' }}">
    <div class="branding">
        <div class="brand-lockup">
            <div class="brand-icon">
                @include('exports.partials.evimeria_logo')
            </div>
            <div class="brand-text">
                <div class="brand-name">Evimeria Initiative</div>
                <div class="brand-tagline">1000 For A 1000</div>
            </div>
        </div>
    </div>

    <div class="statement-title">Comprehensive Member Statement</div>
    <div class="generated">Generated: {{ $generatedDisplay }}</div>

    <table class="info-table">
        <tr>
            <td class="label">Name:</td>
            <td>{{ $member->name }}</td>
            <td class="label">Email:</td>
            <td>{{ $email }}</td>
        </tr>
        <tr>
            <td class="label">Member No:</td>
            <td>{{ $memberNumber }}</td>
            <td class="label">Phone:</td>
            <td>{{ $phone }}</td>
        </tr>
        <tr>
            <td class="label">Membership Type:</td>
            <td>{{ $membershipType }}</td>
            <td class="label">Resident Church:</td>
            <td>{{ $residentChurch }}</td>
        </tr>
        <tr>
            <td class="label">Registration Date:</td>
            <td>{{ optional($member->date_of_registration)->format('M d, Y') ?? '-' }}</td>
            <td class="label">Status:</td>
            <td>{{ $statusLabel }}</td>
        </tr>
        <tr>
            <td class="label">Period:</td>
            <td colspan="3">{{ $range }}</td>
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
                    $amount = (float) ($entry['amount'] ?? 0);
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

    <div class="summary-block">
        <div><strong>Total Contributions:</strong> KES {{ number_format($totalContributions, 2) }}</div>
        <div><strong>Total Outstanding Invoices (remaining):</strong> KES {{ number_format($outstanding, 2) }}</div>
        <div><strong>Total Expenses:</strong> KES {{ number_format($summaryData['total_expenses'] ?? 0, 2) }}</div>
        <div><strong>Status:</strong> {{ $summaryData['contribution_status_label'] ?? 'Unknown' }}</div>
    </div>

    <div class="footer-text">
        Statement generated electronically by Evimeria Contributions System.
    </div>
</div>

