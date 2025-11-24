import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/audit_log.dart';
import '../services/api/audit_api_service.dart';
import 'auth_provider.dart';

final auditApiServiceProvider = Provider<AuditApiService>(
  (ref) => AuditApiService(ref.watch(apiServiceProvider)),
);

final auditLogsProvider = FutureProvider<List<AuditLogEntry>>((ref) async {
  final api = ref.watch(auditApiServiceProvider);
  return api.fetchAuditLogs();
});

