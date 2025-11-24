import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/report_export.dart';
import '../models/report_summary.dart';
import '../services/api/report_api_service.dart';
import 'auth_provider.dart';

final reportApiServiceProvider = Provider<ReportApiService>(
  (ref) => ReportApiService(ref.watch(apiServiceProvider)),
);

final reportProvider =
    StateNotifierProvider<ReportNotifier, ReportState>((ref) {
  return ReportNotifier(ref.watch(reportApiServiceProvider))..refresh();
});

class ReportState {
  const ReportState({
    this.summary,
    required this.exports,
    required this.isLoading,
    this.errorMessage,
  });

  factory ReportState.initial() {
    return const ReportState(exports: [], isLoading: false);
  }

  final ReportSummary? summary;
  final List<ReportExport> exports;
  final bool isLoading;
  final String? errorMessage;

  ReportState copyWith({
    ReportSummary? summary,
    List<ReportExport>? exports,
    bool? isLoading,
    String? errorMessage,
  }) {
    return ReportState(
      summary: summary ?? this.summary,
      exports: exports ?? this.exports,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class ReportNotifier extends StateNotifier<ReportState> {
  ReportNotifier(this._api) : super(ReportState.initial());

  final ReportApiService _api;

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final summary = await _api.fetchSummary();
      final exports = await _api.fetchExports();
      state = state.copyWith(
        summary: summary,
        exports: exports,
        isLoading: false,
      );
    } catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }

  Future<void> requestExport(String type, String format) async {
    try {
      final export = await _api.requestExport(type: type, format: format);
      state = state.copyWith(exports: [export, ...state.exports]);
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
      rethrow;
    }
  }
}

