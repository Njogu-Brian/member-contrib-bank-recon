import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/budget.dart';
import '../services/api/budget_api_service.dart';
import 'auth_provider.dart';

final budgetApiServiceProvider = Provider<BudgetApiService>(
  (ref) => BudgetApiService(ref.watch(apiServiceProvider)),
);

final budgetProvider =
    StateNotifierProvider<BudgetNotifier, BudgetState>((ref) {
  return BudgetNotifier(ref.watch(budgetApiServiceProvider))..refresh();
});

class BudgetState {
  const BudgetState({
    required this.budgets,
    required this.isLoading,
    this.errorMessage,
  });

  factory BudgetState.initial() {
    return const BudgetState(budgets: [], isLoading: false);
  }

  final List<Budget> budgets;
  final bool isLoading;
  final String? errorMessage;

  BudgetState copyWith({
    List<Budget>? budgets,
    bool? isLoading,
    String? errorMessage,
  }) {
    return BudgetState(
      budgets: budgets ?? this.budgets,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class BudgetNotifier extends StateNotifier<BudgetState> {
  BudgetNotifier(this._api) : super(BudgetState.initial());

  final BudgetApiService _api;

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final items = await _api.fetchBudgets();
      state = state.copyWith(budgets: items, isLoading: false);
    } catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }

  Future<void> saveBudget({Budget? existing, required Map<String, dynamic> payload}) async {
    try {
      if (existing == null) {
        final created = await _api.createBudget(payload);
        state = state.copyWith(budgets: [created, ...state.budgets]);
      } else {
        final updated = await _api.updateBudget(existing.id, payload);
        state = state.copyWith(
          budgets: state.budgets
              .map((budget) => budget.id == updated.id ? updated : budget)
              .toList(),
        );
      }
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
      rethrow;
    }
  }

  Future<void> updateMonth(Budget budget, BudgetMonth month, double amount) async {
    try {
      final updatedMonth = await _api.updateBudgetMonth(month.id, {'amount': amount});
      final nextBudgets = state.budgets.map((item) {
        if (item.id != budget.id) return item;
        final months = item.months
            .map((m) => m.id == updatedMonth.id ? updatedMonth : m)
            .toList();
        return Budget(
          id: item.id,
          name: item.name,
          total: item.total,
          spent: item.spent,
          description: item.description,
          months: months,
        );
      }).toList();
      state = state.copyWith(budgets: nextBudgets);
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
      rethrow;
    }
  }
}

