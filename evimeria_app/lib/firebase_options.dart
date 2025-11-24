import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        return android;
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'demo-api-key',
    appId: '1:999999999999:web:demo',
    messagingSenderId: '999999999999',
    projectId: 'evimeria-demo',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'demo-android-key',
    appId: '1:999999999999:android:demo',
    messagingSenderId: '999999999999',
    projectId: 'evimeria-demo',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'demo-ios-key',
    appId: '1:999999999999:ios:demo',
    messagingSenderId: '999999999999',
    projectId: 'evimeria-demo',
    iosBundleId: 'com.example.evimeriaApp',
  );
}

