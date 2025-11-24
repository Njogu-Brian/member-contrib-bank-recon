import 'dart:typed_data';

import 'package:evimeria_app/models/member.dart';
import 'package:evimeria_app/models/user.dart';
import 'package:evimeria_app/models/wallet.dart';
import 'package:evimeria_app/providers/wallet_provider.dart';
import 'package:evimeria_app/services/api/wallet_api_service.dart';
import 'package:evimeria_app/services/member_service.dart';
import 'package:evimeria_app/services/receipt_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockWalletApi extends Mock implements WalletApiService {}

class _MockMemberService extends Mock implements MemberService {}

class _MockReceiptService extends Mock implements ReceiptService {}

void main() {
  group('WalletNotifier', () {
    late _MockWalletApi walletApi;
    late _MockMemberService memberService;
    late _MockReceiptService receiptService;
    late WalletNotifier notifier;

    const testUser = EvUser(id: 1, name: 'Tester', email: 'test@example.com');

    setUp(() {
      walletApi = _MockWalletApi();
      memberService = _MockMemberService();
      receiptService = _MockReceiptService();
      notifier = WalletNotifier(
        walletApi: walletApi,
        memberService: memberService,
        receiptService: receiptService,
        currentUser: () => testUser,
      );
    });

    test('refresh loads wallets and members at risk', () async {
      final wallet = Wallet(
        id: 1,
        memberId: 1,
        balance: 1000,
        lockedBalance: 0,
        member: const Member(id: 1, name: 'Alice', email: 'a@test', phone: '123', status: 'on_track'),
        contributions: const [],
      );
      when(() => walletApi.fetchWallets()).thenAnswer((_) async => [wallet]);
      when(() => walletApi.fetchMembersNeedingAttention(memberService)).thenAnswer(
        (_) async => [const Member(id: 2, name: 'Bob', email: 'b@test', phone: '456', status: 'deficit')],
      );

      await notifier.refresh();

      expect(notifier.state.wallets, hasLength(1));
      expect(notifier.state.membersAtRisk, hasLength(1));
    });

    test('submitContribution returns receipt bytes', () async {
      final wallet = Wallet(
        id: 5,
        memberId: 5,
        balance: 2000,
        lockedBalance: 0,
        member: const Member(id: 5, name: 'Zoe', email: 'z@test', phone: '789', status: 'ahead'),
        contributions: const [],
      );
      final record = ContributionRecord(
        id: 99,
        amount: 1500,
        source: 'mpesa',
        status: 'cleared',
        createdAt: DateTime.now(),
        reference: 'XYZ',
        receiptUrl: null,
        metadata: const {},
      );

      when(() => walletApi.createContribution(
            walletId: wallet.id,
            amount: any(named: 'amount'),
            source: any(named: 'source'),
            reference: any(named: 'reference'),
            contributedAt: any(named: 'contributedAt'),
          )).thenAnswer((_) async => record);
      when(() => walletApi.fetchWallets()).thenAnswer((_) async => [wallet]);
      when(() => walletApi.fetchMembersNeedingAttention(memberService))
          .thenAnswer((_) async => []);
      when(
        () => receiptService.buildContributionReceipt(
          contribution: record,
          wallet: wallet,
          user: testUser,
        ),
      ).thenAnswer((_) async => Uint8List.fromList([1, 2, 3]));

      final receipt = await notifier.submitContribution(
        walletId: wallet.id,
        amount: 1500,
        source: 'mpesa',
        reference: 'XYZ',
      );

      expect(receipt, isNotNull);
      verify(
        () => receiptService.buildContributionReceipt(
          contribution: record,
          wallet: wallet,
          user: testUser,
        ),
      ).called(1);
    });
  });
}

