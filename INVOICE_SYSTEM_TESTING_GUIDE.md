# 🧪 Invoice System Testing Guide

Complete step-by-step guide to test all new invoice features.

---

## 📋 Prerequisites

1. Backend server running: `cd backend && php artisan serve`
2. Frontend dev server running: `cd frontend && npm run dev`
3. Admin credentials: admin@evimeria.com / admin123

---

## 🎯 Test Suite

### **Test 1: View Generated Invoices**

**Steps:**
1. ✅ Login to admin portal
2. ✅ Navigate to **Invoices** (sidebar → Finance → Invoices)
3. ✅ You should see 466 invoices listed

**Expected Results:**
- Invoice table shows multiple pages of invoices
- Each invoice has:
  - Invoice number (INV-20251203-XXXX)
  - Member name
  - Amount: KES 1,000.00
  - Issue date, Due date
  - Period (2025-W49)
  - Status: "pending" (yellow badge)
  - Action buttons: Edit, Cancel, Delete

**✅ PASS if:** You see invoices listed with correct data

---

### **Test 2: Filter Invoices**

**Steps:**
1. ✅ On Invoices page
2. ✅ Change **Status** dropdown to "Pending"
3. ✅ All 466 invoices should still show (all are pending)
4. ✅ Select a member from **Member** dropdown
5. ✅ Should show only that member's invoices

**Test Overdue Filter:**
1. ✅ Check **"Overdue Only"** checkbox
2. ✅ Should show 0 invoices (none are overdue yet - all just created)

**✅ PASS if:** Filters work correctly

---

### **Test 3: Create Manual Invoice**

**Steps:**
1. ✅ Click **"Create Invoice"** button
2. ✅ Click **"Click to search and select a member..."**
3. ✅ Search for a member (e.g., type "John")
4. ✅ Select a member
5. ✅ Set Amount: 2000
6. ✅ Leave dates as default
7. ✅ Add description: "Special invoice test"
8. ✅ Click **Save**

**Expected Results:**
- Success alert
- Invoice appears in table
- Member name shows correctly
- Amount: KES 2,000.00

**✅ PASS if:** Invoice created successfully

---

### **Test 4: Member Statement with Invoices**

**Steps:**
1. ✅ Navigate to **Members** → Click any member
2. ✅ Go to **Statement View** tab
3. ✅ Scroll down to **Transactions** table
4. ✅ Look for orange "Invoice" badge entries

**Expected Results:**
- Should see invoice entries like:
  ```
  Date: 30/11/2025
  Type: Invoice (orange badge)
  Description: Weekly contribution invoices for November 2025 (5 weeks)
  Amount: -KES 5,000
  ```
- **Monthly Totals** table should show invoice amounts
- **Contribution Summary** should show "Pending Invoices" card

**✅ PASS if:** Invoices appear aggregated by month

---

### **Test 5: Auto-Match Payments to Invoices**

**Steps:**
1. ✅ Navigate to **Manual Contributions**
2. ✅ Click **"Add Contribution"**
3. ✅ Select a member who has invoices
4. ✅ Enter amount: 5000
5. ✅ Click **Save**
6. ✅ Go back to **Invoices** page
7. ✅ Filter by that member

**Expected Results:**
- 5 of that member's invoices should now show status: "paid" (green badge)
- Oldest invoices paid first
- Remaining invoices still "pending"

**Alternative: Bulk Match**
1. ✅ On Invoices page, click **"Auto-Match Payments"**
2. ✅ Confirm dialog
3. ✅ Alert shows: "Matched X invoices to payments!"
4. ✅ Refresh page - some invoices now "paid"

**✅ PASS if:** Invoices automatically marked as paid

---

### **Test 6: Transaction Click-Through to Member Statement**

**Steps:**
1. ✅ Navigate to **Transactions** page
2. ✅ Find a transaction with an assigned member
3. ✅ **Click the member name** (should be blue/clickable)
4. ✅ Should navigate to that member's profile
5. ✅ Transaction should be **highlighted in yellow**
6. ✅ Page auto-scrolls to that transaction

**Test in Statement View:**
1. ✅ Navigate to **Statements** → Open any statement
2. ✅ Click **"View Transactions"**
3. ✅ Click a member name in the table
4. ✅ Same behavior - navigate and highlight

**✅ PASS if:** Navigation and highlighting works

---

### **Test 7: Invoice Reminder Configuration**

**Steps:**
1. ✅ Navigate to **Settings** (sidebar → Administration → Settings)
2. ✅ Click **"Invoice Reminders"** tab
3. ✅ Should see configuration form with:
   - Enable/Disable checkbox ✓
   - Frequency dropdown (Daily/Weekly/Bi-Weekly/Monthly)
   - Time picker (default 09:00)
   - Days before due (default 2)
   - Overdue message template
   - Due soon message template
4. ✅ Change frequency to "Weekly"
5. ✅ Change time to "10:00"
6. ✅ Edit overdue message:
   ```
   URGENT: {{member_name}}, you owe KES {{total_outstanding}} 
   ({{pending_invoice_count}} invoices). Pay now! - {{app_name}}
   ```
7. ✅ Click **"Save Invoice Reminder Settings"**

**Expected Results:**
- Success message
- Settings saved

**✅ PASS if:** Settings save successfully

---

### **Test 8: Bulk SMS with Invoice Placeholders**

**Steps:**
1. ✅ Navigate to **Bulk SMS** (Engagement → Bulk SMS)
2. ✅ Click **"Compose"** tab
3. ✅ Look for **new orange/red placeholder buttons:**
   - `{pending_invoices}`
   - `{overdue_invoices}`
   - `{pending_invoice_count}`
   - `{oldest_invoice_number}`
   - `{oldest_invoice_due_date}`
4. ✅ Click a few buttons to insert placeholders
5. ✅ Compose message:
   ```
   Dear {name}, you have {pending_invoice_count} pending invoices 
   totaling KES {pending_invoices}. Oldest due: {oldest_invoice_due_date}. 
   Please pay soon!
   ```
6. ✅ Select 1-2 test members
7. ✅ Click **"Send SMS"** (or test without sending)

**Expected Results:**
- Placeholder buttons visible with proper colors
- Placeholders inserted correctly
- Message preview shows placeholders

**✅ PASS if:** Invoice placeholders available and work

---

### **Test 9: PDF Export with Invoices**

**Steps:**
1. ✅ Go to any member's profile
2. ✅ Click **"Export PDF"** button
3. ✅ PDF downloads
4. ✅ Open PDF

**Check PDF Contains:**
- ✅ **Registration Date** field populated
- ✅ **Logo** (if uploaded in settings)
- ✅ **Invoice entries** in transactions table showing as debits
- ✅ Monthly aggregated amounts

**✅ PASS if:** PDF shows invoices and registration date

---

### **Test 10: Invoice Reports (API Test)**

**Using Browser or Postman:**

**A. Outstanding Invoices Report:**
```
GET http://localhost:8000/api/v1/admin/invoice-reports/outstanding
Headers: Authorization: Bearer {your_token}
```

**Expected Response:**
```json
{
  "invoices": [...],
  "summary": {
    "total_outstanding": 466000.00,
    "total_pending": 466000.00,
    "total_overdue": 0,
    "count_pending": 466,
    "count_overdue": 0
  }
}
```

**B. Member Compliance Report:**
```
GET http://localhost:8000/api/v1/admin/invoice-reports/member-compliance
```

**Expected Response:**
```json
{
  "summary": {
    "total_members": 234,
    "compliant_members": 0,
    "members_with_overdue": 0,
    "average_compliance_rate": 0
  },
  "members": [...]
}
```

**C. Weekly Summary:**
```
GET http://localhost:8000/api/v1/admin/invoice-reports/weekly-summary
```

**✅ PASS if:** All reports return data

---

### **Test 11: Invoice Reminders (Manual Trigger)**

**Steps:**
1. ✅ Open terminal in backend folder
2. ✅ Run: `php artisan invoices:send-reminders --force`

**Expected Output:**
```
Sent X invoice reminders
```

**Check SMS Logs:**
```bash
php artisan tinker --execute="echo App\Models\SmsLog::count() . ' SMS sent';"
```

**Note:** If SMS service not configured, check `notification_logs` table:
```bash
php artisan tinker --execute="echo App\Models\NotificationLog::where('type', 'overdue_reminder')->count() . ' reminders logged';"
```

**✅ PASS if:** Reminders sent/logged (even if 0, means working)

---

### **Test 12: Generate Weekly Invoices (Manual)**

**Steps:**
1. ✅ Run: `php artisan invoices:generate-weekly`
2. ✅ Output: "Invoices already generated for week 2025-W49. Use --force to regenerate."
3. ✅ Run: `php artisan invoices:generate-weekly --force`
4. ✅ Should generate new invoices (or skip duplicates)

**Verify:**
```bash
php artisan tinker --execute="echo 'Week 49 invoices: ' . App\Models\Invoice::where('period', '2025-W49')->count();"
```

**✅ PASS if:** Command runs and invoices generated

---

### **Test 13: Search Members in Manual Contributions**

**Steps:**
1. ✅ Navigate to **Manual Contributions**
2. ✅ Click **"Add Contribution"**
3. ✅ Click **"Click to search and select a member..."**
4. ✅ Modal opens with search bar
5. ✅ Type to search (e.g., "john")
6. ✅ Results filter in real-time
7. ✅ Select a member
8. ✅ Member name appears in form

**✅ PASS if:** Search modal works and replaces dropdown

---

## 🐛 Troubleshooting

### **Issue: No invoices showing**
**Fix:** 
```bash
cd backend
php artisan route:clear
php artisan config:clear
php artisan cache:clear
```
Then refresh browser

### **Issue: 500 errors**
**Check Laravel logs:**
```bash
tail -f backend/storage/logs/laravel.log
```

### **Issue: Can't see new navigation item**
**Fix:** Hard refresh browser: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

### **Issue: SMS not sending**
**Check SMS configuration:**
```bash
php artisan tinker --execute="echo App\Models\Setting::get('sms_enabled', 'false');"
```

---

## 📊 Quick Verification Commands

```bash
# Count invoices
php artisan tinker --execute="echo 'Total: ' . App\Models\Invoice::count();"

# Count by status
php artisan tinker --execute="
  echo 'Pending: ' . App\Models\Invoice::where('status', 'pending')->count() . PHP_EOL;
  echo 'Paid: ' . App\Models\Invoice::where('status', 'paid')->count() . PHP_EOL;
  echo 'Overdue: ' . App\Models\Invoice::where('status', 'overdue')->count();
"

# Check settings
php artisan tinker --execute="
  echo 'Reminder enabled: ' . App\Models\Setting::get('invoice_reminder_enabled') . PHP_EOL;
  echo 'Frequency: ' . App\Models\Setting::get('invoice_reminder_frequency') . PHP_EOL;
  echo 'Time: ' . App\Models\Setting::get('invoice_reminder_time');
"

# View a sample invoice
php artisan tinker --execute="print_r(App\Models\Invoice::with('member')->first()->toArray());"

# Test auto-matching
php artisan tinker --execute="
  \$matcher = app(App\Services\InvoicePaymentMatcher::class);
  \$result = \$matcher->bulkMatchPayments();
  print_r(\$result);
"
```

---

## ✅ Success Criteria

All features working if:
- ✅ Invoices display correctly
- ✅ Filters work (status, member, overdue)
- ✅ Can create/edit/delete invoices
- ✅ Member statements show aggregated monthly invoices
- ✅ Auto-matching works (manual contributions → invoices marked paid)
- ✅ Member names clickable in transactions (navigate + highlight)
- ✅ Invoice reminder settings configurable
- ✅ Bulk SMS has invoice placeholders
- ✅ PDF exports include invoices and registration date
- ✅ Commands run without errors

---

## 🚀 Production Checklist

Before going live:

1. **Setup Scheduler:**
   ```bash
   # Add to crontab (Linux) or Task Scheduler (Windows):
   * * * * * cd /path-to-project/backend && php artisan schedule:run >> /dev/null 2>&1
   ```

2. **Verify Settings:**
   - Weekly contribution amount: KES 1,000
   - Invoice reminder enabled: Yes
   - Reminder frequency: Daily (or your preference)
   - SMS service configured and working

3. **Initial Invoice Generation:**
   ```bash
   php artisan invoices:generate-weekly --force
   ```

4. **Test SMS Service:**
   ```bash
   # Send test reminder to yourself
   php artisan invoices:send-reminders --force
   ```

5. **Backup Database:**
   ```bash
   php artisan backup:run  # If you have backup configured
   ```

---

## 📱 Expected Behavior Timeline

### **Week 1 (Starting Monday):**
- 00:00: System generates 234 invoices (KES 1,000 each)
- 09:00: No reminders sent (not due yet)

### **Week 1 (Friday):**
- 09:00: "Due soon" reminders sent (due in 2 days = Sunday)

### **Week 2 (Monday):**
- 00:00: Week 2 invoices generated
- 09:00: "Overdue" reminders for unpaid Week 1 invoices

### **When Member Pays:**
- Contribution recorded → Oldest 1-5 invoices automatically marked "paid"
- Member statement updated in real-time

### **End of Month:**
- Member sees one aggregated invoice debit per month on statement
- Example: "Weekly contribution invoices for December 2025 (4 weeks)" - KES 4,000

---

## 🎓 Feature Summary

| Feature | Status | Location |
|---------|--------|----------|
| Invoice Management | ✅ Complete | `/invoices` |
| Auto-Match Payments | ✅ Complete | Automatic + Manual button |
| Member Statements | ✅ Complete | Member profile |
| PDF with Invoices | ✅ Complete | Export PDF |
| Custom Reminders | ✅ Complete | Settings → Invoice Reminders |
| Bulk SMS Placeholders | ✅ Complete | Bulk SMS page |
| Invoice Reports | ✅ Complete | API endpoints |
| Click-Through Navigation | ✅ Complete | Transactions page |
| Weekly Generation | ✅ Complete | Automated (Mondays) |
| Daily Reminders | ✅ Complete | Automated (configurable) |

---

## 📞 Support

If issues persist:
1. Check Laravel logs: `backend/storage/logs/laravel.log`
2. Check browser console for errors
3. Verify database connection
4. Clear all caches: `php artisan optimize:clear`

---

**🎉 All features are now live and ready for testing!**

Refresh your browser at `/invoices` and you should see all 466 invoices displayed.

