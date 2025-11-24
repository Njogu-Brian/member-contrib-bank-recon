import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../../../models/wallet.dart';

class ContributionForm extends HookConsumerWidget {
  const ContributionForm({
    super.key,
    required this.wallets,
    required this.onSubmit,
  });

  final List<Wallet> wallets;
  final Future<void> Function(
    int walletId,
    double amount,
    String source,
    String? reference,
  ) onSubmit;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final amountController = useTextEditingController();
    final referenceController = useTextEditingController();
    final selectedWalletId = useState<int?>(wallets.isNotEmpty ? wallets.first.id : null);
    final contributionSource = useState('mpesa');
    final formKey = useMemoized(GlobalKey<FormState>.new);
    final isSubmitting = useState(false);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'New contribution',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            if (wallets.isEmpty)
              Text(
                'You have no wallets yet. Create one from the admin console to begin tracking contributions.',
                style: TextStyle(color: Colors.grey[700]),
              )
            else
              Form(
                key: formKey,
                child: Column(
                  children: [
                    DropdownButtonFormField<int>(
                      initialValue: selectedWalletId.value,
                      decoration: const InputDecoration(
                        labelText: 'Wallet',
                        border: OutlineInputBorder(),
                      ),
                      items: wallets
                          .map(
                            (wallet) => DropdownMenuItem(
                              value: wallet.id,
                              child: Text(wallet.member?.name ?? 'Wallet ${wallet.id}'),
                            ),
                          )
                          .toList(),
                      onChanged: (value) => selectedWalletId.value = value,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: amountController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Amount',
                        prefixText: 'KES ',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        final parsed = double.tryParse(value ?? '');
                        if (parsed == null || parsed <= 0) {
                          return 'Enter a valid amount';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: contributionSource.value,
                      decoration: const InputDecoration(
                        labelText: 'Source',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'mpesa', child: Text('MPESA')),
                        DropdownMenuItem(value: 'bank', child: Text('Bank transfer')),
                        DropdownMenuItem(value: 'manual', child: Text('Manual')),
                      ],
                      onChanged: (value) => contributionSource.value = value ?? 'mpesa',
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: referenceController,
                      decoration: const InputDecoration(
                        labelText: 'Reference (optional)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: isSubmitting.value
                            ? null
                            : () async {
                                if (!(formKey.currentState?.validate() ?? false)) {
                                  return;
                                }
                                if (selectedWalletId.value == null) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Select a wallet first.')),
                                  );
                                  return;
                                }
                                isSubmitting.value = true;
                                try {
                                  await onSubmit(
                                    selectedWalletId.value!,
                                    double.parse(amountController.text.trim()),
                                    contributionSource.value,
                                    referenceController.text.trim().isEmpty
                                        ? null
                                        : referenceController.text.trim(),
                                  );
                                  amountController.clear();
                                  referenceController.clear();
                                } finally {
                                  isSubmitting.value = false;
                                }
                              },
                        icon: const Icon(Icons.payments_outlined),
                        label: Text(isSubmitting.value ? 'Submitting...' : 'Submit contribution'),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

