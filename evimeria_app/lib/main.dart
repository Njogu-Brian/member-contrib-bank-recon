import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'firebase_options.dart';
import 'providers/auth_provider.dart';
import 'providers/push_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home/home_shell.dart';
import 'screens/kyc/kyc_wizard_screen.dart';
import 'services/push_notification_service.dart';
import 'utils/constants.dart';
import 'widgets/inactivity_timeout_widget.dart';

Future<void> _backgroundHandler(RemoteMessage message) async {
  if (Firebase.apps.isEmpty) {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: 'env/.env');
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  FirebaseMessaging.onBackgroundMessage(_backgroundHandler);
  final pushService = PushNotificationService();
  await pushService.initialize();
  runApp(
    ProviderScope(
      overrides: [
        pushNotificationProvider.overrideWithValue(pushService),
      ],
      child: const EvimeriaApp(),
    ),
  );
}

class EvimeriaApp extends ConsumerWidget {
  const EvimeriaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      title: AppConstants.appTitle,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xfff4f5f7),
      ),
      routes: {
        KycWizardScreen.routeName: (_) => const KycWizardScreen(),
      },
      home: const AuthGate(),
    );
  }
}

class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);

    if (!authState.bootstrapComplete) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (authState.isAuthenticated) {
      // Wrap authenticated content with inactivity timeout
      // Default timeout: 8 hours (480 minutes) - can be configured via settings
      return const InactivityTimeoutWidget(
        timeoutMinutes: 480, // TODO: Get from settings API
        child: HomeShell(),
      );
    }

    return const LoginScreen();
  }
}
