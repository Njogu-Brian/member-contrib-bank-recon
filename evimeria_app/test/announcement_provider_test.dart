import 'package:evimeria_app/models/notification_preference.dart';
import 'package:evimeria_app/providers/announcement_provider.dart';
import 'package:evimeria_app/services/api/announcement_api_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockAnnouncementApi extends Mock implements AnnouncementApiService {}

void main() {
  setUpAll(() {
    registerFallbackValue(
      const NotificationPreference(
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
      ),
    );
  });

  test('NotificationPreferenceNotifier updates state', () async {
    final api = _MockAnnouncementApi();
    final notifier = NotificationPreferenceNotifier(api);
    final preference = NotificationPreference(
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
    );
    when(() => api.fetchPreferences()).thenAnswer((_) async => preference);
    when(() => api.updatePreferences(any())).thenAnswer((_) async => preference.copyWith(smsEnabled: true));

    await notifier.load();
    expect(notifier.state.value?.emailEnabled, true);
    await notifier.update(preference.copyWith(smsEnabled: true));
    expect(notifier.state.value?.smsEnabled, true);
  });
}

