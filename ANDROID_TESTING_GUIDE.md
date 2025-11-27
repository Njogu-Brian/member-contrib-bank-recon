# Android App Testing Guide

This guide explains how to test the Evimeria Flutter Android app locally with your backend API.

## Prerequisites

1. **Flutter SDK** (3.10.1 or higher)
   - Download: https://flutter.dev/docs/get-started/install
   - Verify: `flutter doctor`

2. **Android Studio** with Android SDK
   - Download: https://developer.android.com/studio
   - Install Android SDK (API level 21+)
   - Set up Android emulator or connect physical device

3. **Backend Running Locally**
   - Laravel backend must be running on `http://localhost:8000`
   - See `README_LOCAL_SETUP.md` for starting services

## Quick Start

### 1. Configure Environment

The app reads configuration from `evimeria_app/env/.env`. Create this file if it doesn't exist:

```bash
cd evimeria_app
mkdir -p env
```

Create `evimeria_app/env/.env` with:

```env
# For Android Emulator: use 10.0.2.2 instead of localhost
# For Physical Device: use your computer's local IP (e.g., 192.168.1.100)
API_BASE_URL=http://10.0.2.2:8000/api

# For testing on physical device (find your IP with ipconfig on Windows or ifconfig on Mac/Linux)
# API_BASE_URL=http://192.168.1.100:8000/api

# 32-character encryption key (generate a random string)
LOCAL_ENCRYPTION_KEY=Your32CharacterEncryptionKeyHere!!

# Firebase Cloud Messaging (optional for push notifications)
FCM_PROJECT_ID=evimeria-demo
```

**Important Notes:**
- **Android Emulator**: Use `10.0.2.2` instead of `localhost` (this is the emulator's alias to your host machine)
- **Physical Device**: Use your computer's local IP address (find it with `ipconfig` on Windows or `ifconfig` on Mac/Linux)

### 2. Install Dependencies

```bash
cd evimeria_app
flutter pub get
```

### 3. Test Backend Connection

Before running the app, verify your backend is accessible:

**For Emulator:**
```bash
# Test if backend is reachable from emulator
adb shell ping 10.0.2.2
```

**For Physical Device:**
```bash
# Test if backend is reachable from device
# Use a browser on your phone: http://YOUR_IP:8000/api/v1/public/health
```

### 4. Run on Android Emulator

#### Option A: Using Flutter CLI

1. **Start an Android Emulator:**
   - Open Android Studio
   - Go to Tools > Device Manager
   - Create/Start an emulator (e.g., Pixel 5)

2. **Check available devices:**
   ```bash
   flutter devices
   ```

3. **Run the app:**
   ```bash
   cd evimeria_app
   flutter run
   ```

   Or run in release mode:
   ```bash
   flutter run --release
   ```

#### Option B: Using Android Studio

1. Open `evimeria_app` folder in Android Studio
2. Select an emulator from the device dropdown
3. Click the Run button (green play icon)

### 5. Run on Physical Android Device

1. **Enable Developer Options on your phone:**
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
   - Developer options will appear in Settings

2. **Enable USB Debugging:**
   - Go to Settings > Developer Options
   - Enable "USB Debugging"

3. **Connect device via USB:**
   ```bash
   # Verify device is connected
   adb devices
   ```

4. **Update .env for physical device:**
   - Find your computer's IP address:
     - Windows: `ipconfig` (look for IPv4 Address)
     - Mac/Linux: `ifconfig` or `ip addr`
   - Update `API_BASE_URL` in `evimeria_app/env/.env`:
     ```env
     API_BASE_URL=http://192.168.1.100:8000/api
     ```
   - Replace `192.168.1.100` with your actual IP

5. **Ensure backend is accessible:**
   - Make sure your computer and phone are on the same WiFi network
   - Temporarily disable Windows Firewall or allow port 8000
   - Test in phone browser: `http://YOUR_IP:8000/api/v1/public/health`

6. **Run the app:**
   ```bash
   cd evimeria_app
   flutter run
   ```

## Building APK for Testing

### Debug APK (Faster build, larger file size)

```bash
cd evimeria_app
flutter build apk --debug
```

Output: `build/app/outputs/flutter-apk/app-debug.apk`

### Release APK (Optimized, smaller file size)

```bash
cd evimeria_app
flutter build apk --release
```

Output: `build/app/outputs/flutter-apk/app-release.apk`

### Install APK on Device

```bash
# Install via ADB
adb install build/app/outputs/flutter-apk/app-release.apk

# Or transfer the APK file to your phone and install manually
```

## Testing Checklist

### Authentication
- [ ] User registration
- [ ] User login
- [ ] Password reset
- [ ] MFA (Multi-Factor Authentication) setup
- [ ] Logout

### Member Features
- [ ] View member list
- [ ] View member details
- [ ] View own profile

### KYC (Know Your Customer)
- [ ] Complete KYC wizard
- [ ] Upload documents
- [ ] Update profile

### Finance Features
- [ ] View contributions
- [ ] View wallet balance
- [ ] View contribution history
- [ ] View investments

### Meetings
- [ ] View meetings list
- [ ] View meeting details
- [ ] Vote on motions

### Announcements
- [ ] View announcements
- [ ] Mark announcements as read

### Budget & Expenses
- [ ] View budgets
- [ ] View expenses
- [ ] View reports

### Notifications
- [ ] Receive push notifications (if FCM configured)
- [ ] View notification preferences

## Troubleshooting

### App Can't Connect to Backend

1. **Check .env file:**
   - Verify `API_BASE_URL` is correct
   - For emulator: use `10.0.2.2:8000`
   - For physical device: use your computer's IP

2. **Check backend is running:**
   ```bash
   curl http://localhost:8000/api/v1/public/health
   ```

3. **Check network connectivity:**
   - Emulator: `adb shell ping 10.0.2.2`
   - Physical device: Test in browser

4. **Check CORS settings:**
   - Ensure `backend/config/cors.php` allows your origin
   - Or use `APP_ENV=local` which allows all origins

5. **Check Laravel logs:**
   ```bash
   tail -f backend/storage/logs/laravel.log
   ```

### Build Errors

1. **Clean build:**
   ```bash
   flutter clean
   flutter pub get
   flutter build apk
   ```

2. **Check Flutter doctor:**
   ```bash
   flutter doctor -v
   ```

3. **Update dependencies:**
   ```bash
   flutter pub upgrade
   ```

### Firebase Issues

If you're not using push notifications, you can comment out Firebase initialization in `lib/main.dart`:

```dart
// Comment out Firebase initialization if not needed
// await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
```

### SSL/HTTPS Issues

If you're using HTTPS locally or get SSL errors:

1. **For development only**, disable SSL verification (NOT for production):
   - Add `--no-verify-ssl` flag or configure in API service

2. **Better solution**: Use HTTP for local testing, HTTPS for production

## Testing with Production API

To test against production API, update `evimeria_app/env/.env`:

```env
API_BASE_URL=https://evimeria.breysomsolutions.co.ke/api
```

**Note:** Make sure CORS is configured on the production server to allow requests from your app.

## Development Tips

1. **Hot Reload**: Press `r` in terminal while app is running for hot reload
2. **Hot Restart**: Press `R` for full restart
3. **DevTools**: Press `d` to open Flutter DevTools
4. **Logs**: View logs in terminal or Android Studio console

## Next Steps

1. Set up Firebase Cloud Messaging for push notifications
2. Configure signing for release builds
3. Set up CI/CD for automated builds
4. Configure app icons and splash screens
5. Test on multiple Android versions and screen sizes

## Mobile API Endpoints Reference

The app uses endpoints from both `/api/v1/mobile/` (mobile-specific) and `/api/v1/admin/` (admin endpoints that mobile app also uses).

### Authentication & User Management (Mobile Endpoints)

- `POST /mobile/auth/login` - User login
- `POST /mobile/auth/register` - User registration
- `GET /mobile/auth/me` - Get current user
- `POST /mobile/auth/logout` - Logout
- `POST /auth/password/reset-request` - Request password reset
- `POST /auth/password/reset` - Reset password

### KYC (Know Your Customer) - Mobile Endpoints

- `GET /mobile/kyc/profile` - Get KYC profile
- `PUT /mobile/kyc/profile` - Update KYC profile
- `POST /mobile/kyc/documents` - Upload KYC documents

### Multi-Factor Authentication (Mobile Endpoints)

- `POST /mobile/mfa/enable` - Enable MFA
- `POST /mobile/mfa/disable` - Disable MFA

### Members (Mobile Endpoints)

- `GET /mobile/members` - List members
- `GET /mobile/members/{id}` - Get member details

### Finance Features (Admin Endpoints)

**Wallets & Contributions:**
- `GET /admin/wallets` - List wallets
- `GET /admin/wallets/{id}` - Get wallet details
- `POST /admin/wallets/{id}/contributions` - Create contribution
- `GET /admin/members/{id}/penalties` - Get member penalties

**Investments:**
- `GET /admin/investments` - List investments
- `POST /admin/investments` - Create investment
- `GET /admin/investments/{id}` - Get investment details
- `PUT /admin/investments/{id}` - Update investment
- `DELETE /admin/investments/{id}` - Delete investment

### Meetings & Motions (Admin Endpoints)

- `GET /admin/meetings` - List meetings
- `POST /admin/meetings` - Create meeting
- `POST /admin/meetings/{id}/motions` - Add motion to meeting
- `POST /admin/motions/{id}/votes` - Vote on motion

### Announcements (Admin Endpoints)

- `GET /admin/announcements` - List announcements
- `POST /admin/announcements` - Create announcement (admin only)
- `PUT /admin/announcements/{id}` - Update announcement (admin only)
- `DELETE /admin/announcements/{id}` - Delete announcement (admin only)

### Budgets & Expenses (Admin Endpoints)

**Budgets:**
- `GET /admin/budgets` - List budgets
- `POST /admin/budgets` - Create budget
- `PUT /admin/budget-months/{id}` - Update budget month

**Expenses:**
- `GET /admin/expenses` - List expenses
- `POST /admin/expenses` - Create expense
- `GET /admin/expenses/{id}` - Get expense details
- `PUT /admin/expenses/{id}` - Update expense
- `DELETE /admin/expenses/{id}` - Delete expense

### Notifications (Admin Endpoints)

- `GET /admin/notifications/log` - Get notification log
- `GET /admin/notification-preferences` - Get notification preferences
- `PUT /admin/notification-preferences` - Update notification preferences

### Reports (Admin Endpoints)

- `GET /admin/reports/summary` - Get summary report
- `GET /admin/reports/contributions` - Get contributions report
- `GET /admin/reports/expenses` - Get expenses report
- `GET /admin/reports/members` - Get members report
- `GET /admin/reports/transactions` - Get transactions report
- `GET /admin/report-exports` - List report exports
- `POST /admin/report-exports` - Create report export

### Public Endpoints (No Authentication)

- `GET /public/health` - Health check
- `GET /public/test` - API test endpoint
- `GET /public/settings` - Public settings (logo, branding)
- `GET /public/dashboard/snapshot` - Public dashboard snapshot
- `GET /public/announcements` - Public announcements (published only)

### Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer {token}
```

The token is obtained from the login endpoint and stored securely in the app.

### Notes

- Mobile-specific endpoints (`/mobile/*`) are designed for mobile app use
- Admin endpoints (`/admin/*`) require appropriate permissions
- Some admin endpoints may require specific roles (e.g., `manage-announcements`, `manage-meetings`)
- See `backend/routes/api.php` for complete API documentation and route definitions


