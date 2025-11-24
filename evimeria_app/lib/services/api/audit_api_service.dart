import '../../models/audit_log.dart';
import '../../utils/constants.dart';
import '../api_service.dart';

class AuditApiService {
  AuditApiService(this._api);

  final ApiService _api;

  Future<List<AuditLogEntry>> fetchAuditLogs() async {
    final response = await _api.get(AppConstants.auditsPath);
    final list = response['data'] as List<dynamic>? ?? response as List<dynamic>? ?? [];
    return list
        .map((json) => AuditLogEntry.fromJson(json as Map<String, dynamic>))
        .toList();
  }
}

