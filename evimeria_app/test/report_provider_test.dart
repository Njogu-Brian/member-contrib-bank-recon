import 'package:evimeria_app/models/report_export.dart';
import 'package:evimeria_app/models/report_summary.dart';
import 'package:evimeria_app/providers/report_provider.dart';
import 'package:evimeria_app/services/api/report_api_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockReportApi extends Mock implements ReportApiService {}

void main() {
  group('ReportNotifier', () {
    late _MockReportApi api;
    late ReportNotifier notifier;

    setUp(() {
      api = _MockReportApi();
      notifier = ReportNotifier(api);
    });

    test('refresh loads summary and exports', () async {
      when(() => api.fetchSummary()).thenAnswer(
        (_) async => ReportSummary(
          totalWalletBalance: 100000,
          monthlyContributions: 12000,
          monthlyExpenses: 4000,
          roiYearToDate: 12.5,
          contributionTrend: const [
            ReportDataPoint(label: 'Jan', value: 1000),
          ],
          expenseTrend: const [
            ReportDataPoint(label: 'Jan', value: 500),
          ],
        ),
      );
      when(() => api.fetchExports()).thenAnswer((_) async => []);

      await notifier.refresh();

      expect(notifier.state.summary?.totalWalletBalance, 100000);
    });

    test('requestExport appends export entry', () async {
      when(() => api.fetchSummary()).thenAnswer((_) async => ReportSummary(
            totalWalletBalance: 0,
            monthlyContributions: 0,
            monthlyExpenses: 0,
            roiYearToDate: 0,
            contributionTrend: const [],
            expenseTrend: const [],
          ));
      when(() => api.fetchExports()).thenAnswer((_) async => []);
      when(() => api.requestExport(type: any(named: 'type'), format: any(named: 'format')))
          .thenAnswer(
        (_) async => const ReportExport(
          id: 1,
          type: 'summary',
          format: 'pdf',
          status: 'pending',
          downloadUrl: null,
          createdAt: null,
        ),
      );

      await notifier.requestExport('summary', 'pdf');

      expect(notifier.state.exports, isNotEmpty);
    });
  });
}

