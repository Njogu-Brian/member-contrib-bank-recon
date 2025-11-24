import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/member.dart';
import '../models/user.dart';
import '../models/wallet.dart';
import '../services/api/wallet_api_service.dart';
import '../services/member_service.dart';
import '../services/receipt_service.dart';
import 'auth_provider.dart';

final walletApiServiceProvider = Provider<WalletApiService>(
  (ref) => WalletApiService(ref.watch(apiServiceProvider)),
);

final receiptServiceProvider = Provider((ref) => const ReceiptService());

final walletProvider = StateNotifierProvider<WalletNotifier, WalletState>((ref) {
  return WalletNotifier(
    walletApi: ref.watch(walletApiServiceProvider),
    memberService: MemberService(apiService: ref.watch(apiServiceProvider)),
    receiptService: ref.watch(receiptServiceProvider),
    currentUser: () => ref.watch(authControllerProvider).user,
  )..refresh();
});

class WalletState {
  const WalletState({
    required this.wallets,
    required this.isLoading,
    required this.membersAtRisk,
    this.errorMessage,
  });

  factory WalletState.initial() {
    return const WalletState(
      wallets: [],
      membersAtRisk: [],
      isLoading: false,
    );
  }

  final List<Wallet> wallets;
  final bool isLoading;
  final List<Member> membersAtRisk;
  final String? errorMessage;

  WalletState copyWith({
    List<Wallet>? wallets,
    bool? isLoading,
    List<Member>? membersAtRisk,
    String? errorMessage,
  }) {
    return WalletState(
      wallets: wallets ?? this.wallets,
      isLoading: isLoading ?? this.isLoading,
      membersAtRisk: membersAtRisk ?? this.membersAtRisk,
      errorMessage: errorMessage,
    );
  }
}

class WalletNotifier extends StateNotifier<WalletState> {
  WalletNotifier({
    required WalletApiService walletApi,
    required MemberService memberService,
    required ReceiptService receiptService,
    required EvUser? Function() currentUser,
  })  : _walletApi = walletApi,
        _memberService = memberService,
        _receiptService = receiptService,
        _currentUser = currentUser,
        super(WalletState.initial());

  final WalletApiService _walletApi;
  final MemberService _memberService;
  final ReceiptService _receiptService;
  final EvUser? Function() _currentUser;

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final wallets = await _walletApi.fetchWallets();
      final members = await _walletApi.fetchMembersNeedingAttention(_memberService);
      state = state.copyWith(
        wallets: wallets,
        membersAtRisk: members,
        isLoading: false,
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: error.toString(),
      );
    }
  }

  Future<Uint8List?> submitContribution({
    required int walletId,
    required double amount,
    required String source,
    String? reference,
  }) async {
    try {
      final contribution = await _walletApi.createContribution(
        walletId: walletId,
        amount: amount,
        source: source,
        reference: reference,
      );
      await refresh();
      final wallet = state.wallets.firstWhere(
        (w) => w.id == walletId,
        orElse: () => state.wallets.first,
      );
      final user = _currentUser() ?? const EvUser(id: 0, name: 'Member', email: '');
      return _receiptService.buildContributionReceipt(
        contribution: contribution,
        wallet: wallet,
        user: user,
      );
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
      rethrow;
    }
  }
}

