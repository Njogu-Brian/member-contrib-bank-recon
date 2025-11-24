import '../../models/report_export.dart';
import '../../models/report_summary.dart';
import '../../utils/constants.dart';
import '../api_service.dart';

class ReportApiService {
  ReportApiService(this._api);

  final ApiService _api;

  Future<ReportSummary> fetchSummary() async {
    final response = await _api.get(AppConstants.reportsSummaryPath);
    final rawData = response['data'];
    final data = rawData is Map<String, dynamic> ? rawData : response;
    return ReportSummary.fromJson(data);
  }

  Future<List<ReportExport>> fetchExports() async {
    final response = await _api.get(AppConstants.reportExportsPath);
    final list = response['data'] as List<dynamic>? ?? response as List<dynamic>? ?? [];
    return list
        .map((json) => ReportExport.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<ReportExport> requestExport({
    required String type,
    required String format,
  }) async {
    final response = await _api.post(
      AppConstants.reportExportsPath,
      body: {'type': type, 'format': format},
    );
    return ReportExport.fromJson(response);
  }
}

