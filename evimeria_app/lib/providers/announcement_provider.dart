import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/announcement.dart';
import '../models/notification_message.dart';
import '../models/notification_preference.dart';
import '../services/api/announcement_api_service.dart';
import 'auth_provider.dart';

final announcementApiServiceProvider = Provider<AnnouncementApiService>(
  (ref) => AnnouncementApiService(ref.watch(apiServiceProvider)),
);

final announcementsProvider = FutureProvider<List<Announcement>>((ref) async {
  final api = ref.watch(announcementApiServiceProvider);
  return api.fetchAnnouncements();
});

final notificationsProvider = FutureProvider<List<NotificationMessage>>((ref) async {
  final api = ref.watch(announcementApiServiceProvider);
  return api.fetchNotifications();
});

final notificationPreferenceProvider =
    StateNotifierProvider<NotificationPreferenceNotifier, AsyncValue<NotificationPreference>>(
  (ref) => NotificationPreferenceNotifier(ref.watch(announcementApiServiceProvider))..load(),
);

class NotificationPreferenceNotifier
    extends StateNotifier<AsyncValue<NotificationPreference>> {
  NotificationPreferenceNotifier(this._api) : super(const AsyncLoading());

  final AnnouncementApiService _api;

  Future<void> load() async {
    try {
      final prefs = await _api.fetchPreferences();
      state = AsyncData(prefs);
    } catch (error, stack) {
      state = AsyncError(error, stack);
    }
  }

  Future<void> update(NotificationPreference preference) async {
    final current = state.value ?? const NotificationPreference(
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
    );
    state = AsyncData(preference);
    try {
      final updated = await _api.updatePreferences(preference);
      state = AsyncData(updated);
    } catch (error, stack) {
      state = AsyncError(error, stack);
      state = AsyncData(current);
      rethrow;
    }
  }
}

