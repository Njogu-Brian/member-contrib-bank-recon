import 'package:evimeria_app/models/announcement.dart';

import '../../models/notification_message.dart';
import '../../models/notification_preference.dart';
import '../../utils/constants.dart';
import '../api_service.dart';

class AnnouncementApiService {
  AnnouncementApiService(this._api);

  final ApiService _api;

  Future<List<Announcement>> fetchAnnouncements() async {
    final response = await _api.get(AppConstants.announcementsPath);
    final list = response['data'] as List<dynamic>? ?? response as List<dynamic>? ?? [];
    return list
        .map((json) => Announcement.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<List<NotificationMessage>> fetchNotifications() async {
    final response = await _api.get(AppConstants.notificationsPath);
    final list = response['data'] as List<dynamic>? ?? response as List<dynamic>? ?? [];
    return list
        .map((json) => NotificationMessage.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<NotificationPreference> fetchPreferences() async {
    final response = await _api.get(AppConstants.notificationPreferencesPath);
    return NotificationPreference.fromJson(response);
  }

  Future<NotificationPreference> updatePreferences(NotificationPreference preference) async {
    final response = await _api.put(
      AppConstants.notificationPreferencesPath,
      body: preference.toJson(),
    );
    return NotificationPreference.fromJson(response);
  }
}

