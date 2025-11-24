import 'package:evimeria_app/models/budget.dart';
import 'package:evimeria_app/providers/budget_provider.dart';
import 'package:evimeria_app/services/api/budget_api_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockBudgetApi extends Mock implements BudgetApiService {}

void main() {
  group('BudgetNotifier', () {
    late _MockBudgetApi api;
    late BudgetNotifier notifier;

    setUp(() {
      api = _MockBudgetApi();
      notifier = BudgetNotifier(api);
    });

    test('refresh fetches budgets', () async {
      when(() => api.fetchBudgets()).thenAnswer(
        (_) async => [
          Budget(
            id: 1,
            name: 'Ops',
            total: 10000,
            spent: 2000,
            description: null,
            months: const [],
          ),
        ],
      );

      await notifier.refresh();

      expect(notifier.state.budgets, hasLength(1));
    });

    test('saveBudget adds budget', () async {
      when(() => api.createBudget(any())).thenAnswer(
        (_) async => Budget(
          id: 2,
          name: 'Tech',
          total: 5000,
          spent: 0,
          description: null,
          months: const [],
        ),
      );

      await notifier.saveBudget(payload: {'name': 'Tech', 'amount': 5000});

      expect(notifier.state.budgets.first.name, 'Tech');
    });
  });
}

