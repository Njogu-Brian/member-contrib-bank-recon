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

The app uses these endpoints (under `/api/v1/mobile/`):

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout
- `GET /kyc/profile` - Get KYC profile
- `PUT /kyc/profile` - Update KYC profile
- `POST /kyc/documents` - Upload KYC documents
- `POST /mfa/enable` - Enable MFA
- `POST /mfa/disable` - Disable MFA
- `GET /members` - List members
- `GET /members/{id}` - Get member details

See `backend/routes/api.php` for complete API documentation.


