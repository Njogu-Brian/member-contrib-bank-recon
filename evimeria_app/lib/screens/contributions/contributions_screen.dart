import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:printing/printing.dart';

import '../../providers/wallet_provider.dart';
import '../../widgets/loading_overlay.dart';
import 'widgets/contribution_form.dart';
import 'widgets/contribution_history_list.dart';
import 'widgets/late_payment_banner.dart';
import 'widgets/wallet_balance_card.dart';

class ContributionsScreen extends HookConsumerWidget {
  const ContributionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final walletState = ref.watch(walletProvider);
    final notifier = ref.read(walletProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Contributions'),
      ),
      body: LoadingOverlay(
        isLoading: walletState.isLoading,
        child: RefreshIndicator(
          onRefresh: notifier.refresh,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              WalletBalanceCard(wallets: walletState.wallets),
              if (walletState.membersAtRisk.isNotEmpty)
                LatePaymentBanner(members: walletState.membersAtRisk),
              const SizedBox(height: 16),
              ContributionForm(
                wallets: walletState.wallets,
                onSubmit: (walletId, amount, source, reference) async {
                  final receiptBytes = await notifier.submitContribution(
                    walletId: walletId,
                    amount: amount,
                    source: source,
                    reference: reference,
                  );
                  if (receiptBytes != null && context.mounted) {
                    await _showReceiptDialog(context, receiptBytes);
                  }
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Contribution captured successfully.')),
                    );
                  }
                },
              ),
              const SizedBox(height: 24),
              ContributionHistoryList(wallets: walletState.wallets),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showReceiptDialog(BuildContext context, Uint8List bytes) {
    return showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Receipt preview'),
          content: SizedBox(
            width: 420,
            height: 520,
            child: PdfPreview(
              build: (format) async => bytes,
              allowPrinting: true,
              allowSharing: true,
              canChangeOrientation: false,
              canChangePageFormat: false,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }
}

