import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../../models/investment.dart';
import '../../providers/investment_provider.dart';
import '../../widgets/loading_overlay.dart';
import 'widgets/investment_card.dart';
import 'widgets/investment_form_sheet.dart';

class InvestmentsScreen extends HookConsumerWidget {
  const InvestmentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(investmentProvider);
    final notifier = ref.read(investmentProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Investments & ROI'),
        actions: [
          IconButton(
            onPressed: () => notifier.refresh(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: state.isLoading
            ? null
            : () => _openForm(context, notifier, existing: null),
        icon: const Icon(Icons.add_chart),
        label: const Text('New investment'),
      ),
      body: LoadingOverlay(
        isLoading: state.isLoading,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (state.errorMessage != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  state.errorMessage!,
                  style: const TextStyle(color: Colors.red),
                ),
              ),
            if (state.investments.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    'No investments yet. Tap the action button to create one.',
                    style: TextStyle(color: Colors.grey[700]),
                  ),
                ),
              )
            else
              ...state.investments.map(
                (investment) => InvestmentCard(
                  investment: investment,
                  onEdit: () => _openForm(context, notifier, existing: investment),
                  onDelete: () => notifier.deleteInvestment(investment.id),
                  onCalculateRoi: () async {
                    final roi = await notifier.calculateRoi(investment.id);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Current ROI: ${roi.toStringAsFixed(2)}%'),
                        ),
                      );
                    }
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _openForm(
    BuildContext context,
    InvestmentNotifier notifier, {
    Investment? existing,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => InvestmentFormSheet(
        existing: existing,
        onSubmit: (payload) => notifier.createOrUpdateInvestment(
          existing: existing,
          payload: payload,
        ),
      ),
    );
  }
}

