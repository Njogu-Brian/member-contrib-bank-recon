# Invoice SMS Placeholders Guide

This document lists all available placeholders for customizing invoice reminder messages and bulk SMS.

## How to Use Placeholders

Placeholders are wrapped in double curly braces: `{{placeholder_name}}`

Example:
```
Dear {{member_name}}, your invoice #{{invoice_number}} for KES {{invoice_amount}} is due on {{due_date}}. - {{app_name}}
```

## Available Placeholders

### Member Information
- `{{member_name}}` - Full name of the member
- `{{phone}}` - Member's phone number
- `{{email}}` - Member's email address
- `{{member_code}}` - Unique member code
- `{{member_number}}` - Member number

### Contribution Information
- `{{total_contributions}}` - Total contributions made by member (formatted: 10,000.00)
- `{{expected_contributions}}` - Expected total contributions (formatted)
- `{{contribution_status}}` - Status label (e.g., "Ahead", "Behind", "On Track")
- `{{contribution_difference}}` - Difference between total and expected (formatted)

### Invoice Information (NEW!)
- `{{invoice_number}}` - Specific invoice number (e.g., INV-20251203-0001)
- `{{invoice_amount}}` - Amount of specific invoice (formatted: 1,000.00)
- `{{days_overdue}}` - Number of days the invoice is overdue
- `{{days_until_due}}` - Number of days until invoice is due
- `{{due_date}}` - Due date of invoice (formatted: Dec 10, 2025)
- `{{total_outstanding}}` - Total outstanding amount across all invoices (formatted)
- `{{total_pending}}` - Total pending (not overdue) invoice amount (formatted)
- `{{pending_invoices}}` - Total pending invoices amount (formatted)
- `{{overdue_invoices}}` - Total overdue invoices amount (formatted)
- `{{paid_invoices}}` - Total paid invoices amount (formatted)
- `{{invoice_count}}` - Total number of invoices
- `{{pending_invoice_count}}` - Number of pending invoices
- `{{oldest_invoice_number}}` - Number of oldest pending invoice
- `{{oldest_invoice_due_date}}` - Due date of oldest invoice (formatted)

### System Information
- `{{app_name}}` - Application name from settings
- `{{statement_link}}` - Public statement link (requires "Include Statement Link" option)

## Message Templates Examples

### Overdue Invoice Reminder
```
OVERDUE NOTICE: {{member_name}}, Invoice #{{invoice_number}} for KES {{invoice_amount}} is {{days_overdue}} days overdue. Total outstanding: KES {{total_outstanding}}. Please pay immediately. - {{app_name}}
```

### Due Soon Reminder
```
Hi {{member_name}}, your invoice #{{invoice_number}} (KES {{invoice_amount}}) is due in {{days_until_due}} days ({{due_date}}). You have {{pending_invoice_count}} pending invoice(s). - {{app_name}}
```

### Bulk SMS with Invoice Info
```
Dear {{member_name}}, you have KES {{pending_invoices}} in pending contributions and KES {{overdue_invoices}} overdue. Oldest invoice: #{{oldest_invoice_number}} due {{oldest_invoice_due_date}}. Please clear your arrears. - {{app_name}}
```

### Weekly Collection Reminder
```
Weekly Reminder: {{member_name}}, you have {{pending_invoice_count}} pending invoice(s) totaling KES {{total_outstanding}}. Your contribution status: {{contribution_status}}. Thank you! - {{app_name}}
```

## Configuration

Invoice reminder settings can be configured in:
**Settings → Invoice Reminders Tab**

Options:
- Enable/Disable reminders
- Frequency: Daily, Weekly, Bi-Weekly, Monthly
- Time of day
- Days before due date for "due soon" reminders
- Custom message templates

