import 'package:evimeria_app/models/expense.dart';
import 'package:evimeria_app/providers/expense_provider.dart';
import 'package:evimeria_app/services/api/expense_api_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockExpenseApi extends Mock implements ExpenseApiService {}

void main() {
  group('ExpenseNotifier', () {
    late _MockExpenseApi api;
    late ExpenseNotifier notifier;

    setUp(() {
      api = _MockExpenseApi();
      notifier = ExpenseNotifier(api);
    });

    test('refresh loads expenses', () async {
      when(() => api.fetchExpenses()).thenAnswer(
        (_) async => [
          Expense(
            id: 1,
            category: 'Ops',
            amount: 1200,
            incurredOn: DateTime.now(),
            status: 'approved',
            description: 'Ops expense',
            receiptUrl: null,
            budgetMonthId: null,
          ),
        ],
      );

      await notifier.refresh();

      expect(notifier.state.expenses, hasLength(1));
    });

    test('saveExpense creates entry', () async {
      when(() => api.createExpense(any())).thenAnswer(
        (_) async => Expense(
          id: 2,
          category: 'Tech',
          amount: 500,
          incurredOn: DateTime.now(),
          status: 'pending',
          description: 'Internet',
          receiptUrl: null,
          budgetMonthId: null,
        ),
      );
      when(() => api.fetchExpenses()).thenAnswer((_) async => []);

      await notifier.saveExpense(payload: {'category': 'Tech', 'amount': 500});

      expect(notifier.state.expenses.first.category, 'Tech');
    });
  });
}

