import 'package:evimeria_app/models/investment.dart';
import 'package:evimeria_app/providers/investment_provider.dart';
import 'package:evimeria_app/services/api/investment_api_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockInvestmentApi extends Mock implements InvestmentApiService {}

void main() {
  group('InvestmentNotifier', () {
    late _MockInvestmentApi api;
    late InvestmentNotifier notifier;

    setUp(() {
      api = _MockInvestmentApi();
      notifier = InvestmentNotifier(api);
    });

    test('refresh fetches investments', () async {
      when(() => api.fetchInvestments()).thenAnswer(
        (_) async => [
          Investment(
            id: 1,
            memberId: 1,
            name: 'Bond',
            principalAmount: 1000,
            status: 'active',
            description: null,
            expectedRoiRate: 10,
            startDate: DateTime.now(),
            endDate: null,
            metadata: null,
            payouts: const [],
          ),
        ],
      );

      await notifier.refresh();

      expect(notifier.state.investments, hasLength(1));
    });

    test('createOrUpdateInvestment appends entry', () async {
      when(() => api.createInvestment(any())).thenAnswer(
        (_) async => Investment(
          id: 5,
          memberId: 1,
          name: 'Fund',
          principalAmount: 5000,
          status: 'active',
          description: null,
          expectedRoiRate: 12,
          startDate: null,
          endDate: null,
          metadata: null,
          payouts: const [],
        ),
      );

      await notifier.createOrUpdateInvestment(payload: {'name': 'Fund'});
      expect(notifier.state.investments, hasLength(1));
    });
  });
}

