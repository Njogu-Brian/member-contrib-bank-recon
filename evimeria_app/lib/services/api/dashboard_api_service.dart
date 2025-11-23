import 'package:collection/collection.dart';

import '../../models/announcement.dart';
import '../../models/dashboard_summary.dart';
import '../../models/notification_item.dart';
import '../../models/wallet_snapshot.dart';
import '../api_service.dart';

class DashboardApiService {
  DashboardApiService(this._api);

  final ApiService _api;

  Future<DashboardSummary> fetchBundle() async {
    final dashboardFuture = _api.get('/dashboard');
    final walletsFuture = _api.get('/wallets');
    final investmentsFuture = _api.get('/investments');
    final announcementsFuture = _api.get('/announcements');
    final notificationsFuture = _api.get('/notifications/log');

    final responses = await Future.wait([
      dashboardFuture,
      walletsFuture,
      investmentsFuture,
      announcementsFuture,
      notificationsFuture,
    ]);

    final dashboard = responses[0];
    final wallets = _unwrapList(responses[1]);
    final investments = _unwrapList(responses[2]);
    final announcements = _unwrapList(responses[3])
        .map((json) => Announcement.fromJson(json))
        .toList();
    final notifications = _unwrapList(responses[4])
        .map((json) => NotificationItem.fromJson(json))
        .toList();

    final stats =
        DashboardStats.fromJson(dashboard['statistics'] as Map<String, dynamic>);

    final weeklyRaw =
        (dashboard['contributions_by_week'] as List<dynamic>? ?? [])
            .cast<Map<String, dynamic>>();
    final monthlyRaw =
        (dashboard['contributions_by_month'] as List<dynamic>? ?? [])
            .cast<Map<String, dynamic>>();

    final double walletBalance = wallets.isNotEmpty
        ? WalletSnapshot.fromJson(wallets.first).balance
        : 0;

    final investmentsTotal = investments
        .map((json) => (json['principal_amount'] as num?)?.toDouble() ?? 0)
        .sum
        .toDouble();

    return DashboardSummary(
      stats: stats,
      weekly: weeklyRaw
          .map((json) => ContributionPoint.fromJson(json, labelKey: 'week'))
          .toList(),
      monthly: monthlyRaw
          .map((json) => ContributionPoint.fromJson(json, labelKey: 'month'))
          .toList(),
      walletBalance: walletBalance,
      investmentsTotal: investmentsTotal,
      announcements: announcements,
      notifications: notifications,
    );
  }

  List<Map<String, dynamic>> _unwrapList(dynamic response) {
    if (response is Map<String, dynamic> && response['data'] is List) {
      return (response['data'] as List).cast<Map<String, dynamic>>();
    }
    if (response is List) {
      return response.cast<Map<String, dynamic>>();
    }
    return const [];
  }
}

