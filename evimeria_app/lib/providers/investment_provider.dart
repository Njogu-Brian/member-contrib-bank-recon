import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/investment.dart';
import '../services/api/investment_api_service.dart';
import 'auth_provider.dart';

final investmentApiServiceProvider = Provider<InvestmentApiService>(
  (ref) => InvestmentApiService(ref.watch(apiServiceProvider)),
);

final investmentProvider =
    StateNotifierProvider<InvestmentNotifier, InvestmentState>((ref) {
  return InvestmentNotifier(ref.watch(investmentApiServiceProvider))..refresh();
});

class InvestmentState {
  const InvestmentState({
    required this.investments,
    required this.isLoading,
    this.errorMessage,
    this.calculatedRoi,
  });

  factory InvestmentState.initial() {
    return const InvestmentState(
      investments: [],
      isLoading: false,
    );
  }

  final List<Investment> investments;
  final bool isLoading;
  final String? errorMessage;
  final double? calculatedRoi;

  InvestmentState copyWith({
    List<Investment>? investments,
    bool? isLoading,
    String? errorMessage,
    double? calculatedRoi,
  }) {
    return InvestmentState(
      investments: investments ?? this.investments,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      calculatedRoi: calculatedRoi ?? this.calculatedRoi,
    );
  }
}

class InvestmentNotifier extends StateNotifier<InvestmentState> {
  InvestmentNotifier(this._api) : super(InvestmentState.initial());

  final InvestmentApiService _api;

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final items = await _api.fetchInvestments();
      state = state.copyWith(isLoading: false, investments: items);
    } catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }

  Future<void> createOrUpdateInvestment({
    Investment? existing,
    required Map<String, dynamic> payload,
  }) async {
    try {
      if (existing == null) {
        final created = await _api.createInvestment(payload);
        state = state.copyWith(
          investments: [...state.investments, created],
          errorMessage: null,
        );
      } else {
        final updated = await _api.updateInvestment(existing.id, payload);
        final newList = state.investments
            .map((inv) => inv.id == updated.id ? updated : inv)
            .toList();
        state = state.copyWith(investments: newList, errorMessage: null);
      }
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
      rethrow;
    }
  }

  Future<void> deleteInvestment(int id) async {
    try {
      await _api.deleteInvestment(id);
      state = state.copyWith(
        investments: state.investments.where((inv) => inv.id != id).toList(),
      );
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
      rethrow;
    }
  }

  Future<double> calculateRoi(int id) async {
    final roi = await _api.fetchRoi(id);
    state = state.copyWith(calculatedRoi: roi);
    return roi;
  }
}

