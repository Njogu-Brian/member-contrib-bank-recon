import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/dashboard_summary.dart';
import '../services/api/dashboard_api_service.dart';
import 'auth_provider.dart';

final dashboardApiServiceProvider = Provider<DashboardApiService>(
  (ref) => DashboardApiService(ref.watch(apiServiceProvider)),
);

final dashboardProvider =
    FutureProvider.autoDispose<DashboardSummary>((ref) async {
  final api = ref.watch(dashboardApiServiceProvider);
  return api.fetchBundle();
});

