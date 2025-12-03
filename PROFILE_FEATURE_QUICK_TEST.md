# Profile Completion Feature - Quick Testing Guide

## 🚀 Quick Start

### Step 1: Test Profile Incomplete Scenario

**Using Browser:**
1. Get a member's statement token:
```bash
cd backend
php artisan tinker --execute="
`$member = App\Models\Member::first();
`$member->email = null;
`$member->id_number = null;
`$member->church = null;
`$member->profile_completed_at = null;
`$member->save();
echo 'Token: ' . `$member->getPublicShareToken() . PHP_EOL;
echo 'Test URL: ' . url('/statement/' . `$member->public_share_token) . PHP_EOL;
"
```

2. **Visit the URL in your browser**
3. **Expected:** Beautiful profile completion modal appears
4. **Fill in the form:**
   - Name: (pre-filled)
   - Phone: (pre-filled)
   - Email: test@example.com
   - ID Number: 12345678
   - Church: Community Church
5. **Click "Save & Continue"**
6. **Expected:** Statement displays immediately

### Step 2: Test Profile Complete Scenario

**Using same member:**
1. Click the statement link again
2. **Expected:** Statement displays immediately (no modal)

### Step 3: Test Admin Portal

1. **Login to admin portal**
2. **Navigate:** Members → Select any member
3. **Verify:** New fields visible:
   - Alternative Phone
   - ID Number (bold)
   - Church
   - Profile Completed
4. **Click:** "Edit Member"
5. **Verify:** New fields in edit form
6. **Update & Save**

### Step 4: Test PDF Export

1. **From member profile → Download statement**
2. **Open PDF**
3. **Verify fields:**
   - ✅ Name
   - ✅ Phone
   - ✅ **ID Number (bold)**
   - ✅ Member Number
   - ✅ Email
   - ✅ Church

---

## 🧪 API Testing (Optional)

### Test 1: Check Profile Status
```bash
# Get token from Step 1
TOKEN="your_token_here"

curl -X GET "http://localhost/api/v1/public/profile/${TOKEN}/status" \
  -H "Accept: application/json"
```

**Expected Response:**
```json
{
  "is_complete": false,
  "missing_fields": ["email", "id_number", "church"],
  "member": {
    "name": "John Doe",
    "phone": "0712345678",
    ...
  }
}
```

### Test 2: Update Profile
```bash
curl -X POST "http://localhost/api/v1/public/profile/${TOKEN}/update" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "name": "John Doe",
    "phone": "0712345678",
    "secondary_phone": "0723456789",
    "email": "john@example.com",
    "id_number": "12345678",
    "church": "Community Church"
  }'
```

**Expected Response:**
```json
{
  "message": "Profile updated successfully",
  "is_complete": true,
  "profile_completed_at": "2025-12-04T..."
}
```

### Test 3: Access Statement (Before Profile Complete)
```bash
curl -X GET "http://localhost/api/v1/public/statement/${TOKEN}" \
  -H "Accept: application/json"
```

**Expected Response (403):**
```json
{
  "error": "Profile Incomplete",
  "message": "Please complete your profile before viewing your statement.",
  "requires_profile_update": true,
  "missing_fields": ["email", "id_number", "church"]
}
```

### Test 4: Access Statement (After Profile Complete)
```bash
# After updating profile
curl -X GET "http://localhost/api/v1/public/statement/${TOKEN}" \
  -H "Accept: application/json"
```

**Expected Response (200):**
```json
{
  "member": {...},
  "statement": [...],
  "summary": {...}
}
```

---

## ✅ Success Checklist

### Backend
- [ ] Migration ran successfully
- [ ] New columns exist in `members` table
- [ ] Profile status API returns correct data
- [ ] Profile update API accepts and saves data
- [ ] Statement access blocked when profile incomplete
- [ ] Statement accessible after profile complete
- [ ] PDF includes new fields

### Frontend
- [ ] Profile modal appears for incomplete profiles
- [ ] Form validation works
- [ ] Required fields marked with *
- [ ] Error messages display correctly
- [ ] Profile updates successfully
- [ ] Statement loads after profile update
- [ ] Admin portal shows new fields
- [ ] Edit modal has new fields

### User Experience
- [ ] Modal is visually appealing (gradient header)
- [ ] Form is easy to understand
- [ ] Success flow is smooth
- [ ] No duplicate prompts for complete profiles
- [ ] Mobile responsive

---

## 🐛 Common Issues & Solutions

### Issue 1: Modal doesn't appear
**Solution:**
```bash
# Clear member's profile completion
php artisan tinker --execute="
`$member = App\Models\Member::where('public_share_token', 'YOUR_TOKEN')->first();
`$member->profile_completed_at = null;
`$member->email = null;
`$member->save();
"
```

### Issue 2: Validation errors
**Check:**
- Email format (must include @)
- All required fields filled
- No empty strings

### Issue 3: Statement still blocked after update
**Solution:**
```bash
# Clear caches
cd backend
php artisan cache:clear
php artisan config:clear
php artisan route:clear
```

### Issue 4: 500 Error on profile update
**Check Laravel logs:**
```bash
tail -f backend/storage/logs/laravel.log
```

---

## 📱 Mobile App Testing

### API Endpoints Ready:
- ✅ `GET /api/v1/public/profile/{token}/status`
- ✅ `POST /api/v1/public/profile/{token}/update`
- ✅ `GET /api/v1/public/statement/{token}` (with profile check)

### Mobile Implementation Steps:
1. Check profile status on app launch
2. Show profile form if incomplete
3. Submit profile data
4. Show statement after completion

---

## 🎯 Quick Verification Commands

```bash
# Check if migrations ran
cd backend
php artisan migrate:status | grep profile_fields

# Check database columns
php artisan tinker --execute="
echo 'Members table columns:' . PHP_EOL;
\$columns = Illuminate\Support\Facades\Schema::getColumnListing('members');
foreach (\$columns as \$col) {
  if (in_array(\$col, ['church', 'profile_completed_at', 'id_number', 'email', 'secondary_phone'])) {
    echo '  ✓ ' . \$col . PHP_EOL;
  }
}
"

# Test profile completion logic
php artisan tinker --execute="
\$member = App\Models\Member::first();
echo 'Member: ' . \$member->name . PHP_EOL;
echo 'Profile Complete: ' . (\$member->isProfileComplete() ? 'YES' : 'NO') . PHP_EOL;
echo 'Missing Fields: ' . implode(', ', \$member->getMissingProfileFields()) . PHP_EOL;
"
```

---

## 🎉 Testing Complete!

If all checks pass:
- ✅ Feature is working correctly
- ✅ Ready for production
- ✅ No breaking changes

**Next Steps:**
1. Deploy to staging for user acceptance testing
2. Train administrators on new fields
3. Notify members about profile completion requirement
4. Monitor logs for any issues

---

## 📞 Support

If issues persist:
1. Check `PROFILE_COMPLETION_FEATURE_GUIDE.md` for detailed documentation
2. Review Laravel logs: `storage/logs/laravel.log`
3. Check browser console for frontend errors
4. Verify API responses in Network tab

**All features implemented successfully! 🚀**

