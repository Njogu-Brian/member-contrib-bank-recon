<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt {{ $receiptNumber }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111; }
        .header { text-align: center; margin-bottom: 20px; }
        .details { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .details th, .details td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        .qr { text-align: center; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Evimeria Group Receipt</h2>
        <p>Receipt #: {{ $receiptNumber }}</p>
    </div>

    <table class="details">
        <tr>
            <th>Member</th>
            <td>{{ $payment->member?->name ?? 'N/A' }}</td>
        </tr>
        <tr>
            <th>Amount</th>
            <td>{{ number_format($payment->amount, 2) }} {{ $payment->currency }}</td>
        </tr>
        <tr>
            <th>Channel</th>
            <td>{{ strtoupper($payment->channel) }}</td>
        </tr>
        <tr>
            <th>Reference</th>
            <td>{{ $payment->provider_reference }}</td>
        </tr>
        <tr>
            <th>Date</th>
            <td>{{ optional($payment->created_at)->toDateTimeString() }}</td>
        </tr>
        @if($notes)
            <tr>
                <th>Notes</th>
                <td>{{ $notes }}</td>
            </tr>
        @endif
    </table>

    <div class="qr">
        <p>Scan to verify</p>
        <img src="{{ $qrImage }}" width="150" height="150" alt="QR Code">
    </div>
</body>
</html>

