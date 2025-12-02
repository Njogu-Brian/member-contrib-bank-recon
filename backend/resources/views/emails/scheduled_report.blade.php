<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $reportType }} Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #4f46e5;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }
        .content {
            background-color: #f9fafb;
            padding: 20px;
            border: 1px solid #e5e7eb;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 12px;
        }
        .attachment-list {
            background-color: white;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
        }
        .attachment-item {
            padding: 10px;
            border-bottom: 1px solid #e5e7eb;
        }
        .attachment-item:last-child {
            border-bottom: none;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $reportType }} Report</h1>
        <p>Scheduled {{ $frequency }} Report</p>
    </div>
    
    <div class="content">
        <p>Hello,</p>
        
        <p>Your scheduled <strong>{{ $reportType }}</strong> report is ready and attached to this email.</p>
        
        <p><strong>Generated:</strong> {{ $generatedAt->format('Y-m-d H:i:s') }}</p>
        
        @if(!empty($exports))
        <div class="attachment-list">
            <h3>Report Files:</h3>
            @foreach($exports as $format => $filePath)
            <div class="attachment-item">
                <strong>{{ strtoupper($format) }}</strong> - Report exported in {{ $format }} format
            </div>
            @endforeach
        </div>
        @endif
        
        <p>Please find the report attachments below.</p>
        
        <p>Best regards,<br>
        Evimeria System</p>
    </div>
    
    <div class="footer">
        <p>This is an automated email. Please do not reply.</p>
        <p>Generated on {{ $generatedAt->format('F j, Y \a\t g:i A') }}</p>
    </div>
</body>
</html>

