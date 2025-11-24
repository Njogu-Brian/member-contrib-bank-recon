import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/expense.dart';
import '../services/api/expense_api_service.dart';
import 'auth_provider.dart';

final expenseApiServiceProvider = Provider<ExpenseApiService>(
  (ref) => ExpenseApiService(ref.watch(apiServiceProvider)),
);

final expenseProvider =
    StateNotifierProvider<ExpenseNotifier, ExpenseState>((ref) {
  return ExpenseNotifier(ref.watch(expenseApiServiceProvider))..refresh();
});

class ExpenseState {
  const ExpenseState({
    required this.expenses,
    required this.isLoading,
    this.errorMessage,
  });

  factory ExpenseState.initial() {
    return const ExpenseState(expenses: [], isLoading: false);
  }

  final List<Expense> expenses;
  final bool isLoading;
  final String? errorMessage;

  ExpenseState copyWith({
    List<Expense>? expenses,
    bool? isLoading,
    String? errorMessage,
  }) {
    return ExpenseState(
      expenses: expenses ?? this.expenses,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class ExpenseNotifier extends StateNotifier<ExpenseState> {
  ExpenseNotifier(this._api) : super(ExpenseState.initial());

  final ExpenseApiService _api;

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final data = await _api.fetchExpenses();
      state = state.copyWith(expenses: data, isLoading: false);
    } catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }

  Future<void> saveExpense({Expense? existing, required Map<String, dynamic> payload}) async {
    try {
      if (existing == null) {
        final created = await _api.createExpense(payload);
        state = state.copyWith(expenses: [created, ...state.expenses]);
      } else {
        final updated = await _api.updateExpense(existing.id, payload);
        state = state.copyWith(
          expenses: state.expenses
              .map((expense) => expense.id == updated.id ? updated : expense)
              .toList(),
        );
      }
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
      rethrow;
    }
  }

  Future<void> deleteExpense(int id) async {
    try {
      await _api.deleteExpense(id);
      state = state.copyWith(
        expenses: state.expenses.where((expense) => expense.id != id).toList(),
      );
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
      rethrow;
    }
  }
}

