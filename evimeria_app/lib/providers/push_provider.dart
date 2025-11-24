import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/push_notification_service.dart';

final pushNotificationProvider = Provider<PushNotificationService>(
  (ref) => PushNotificationService(),
);

