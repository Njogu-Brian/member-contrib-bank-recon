import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../models/investment.dart';

class InvestmentCard extends StatelessWidget {
  const InvestmentCard({
    super.key,
    required this.investment,
    required this.onEdit,
    required this.onDelete,
    required this.onCalculateRoi,
  });

  final Investment investment;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onCalculateRoi;

  @override
  Widget build(BuildContext context) {
    final formatter = NumberFormat.currency(symbol: 'KES ');

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    investment.name,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
                Chip(
                  label: Text(investment.status.toUpperCase()),
                  backgroundColor: Colors.teal.withValues(alpha: .1),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              investment.description ?? 'No description provided.',
              style: TextStyle(color: Colors.grey[700]),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 8,
              children: [
                _InfoChip(label: 'Principal', value: formatter.format(investment.principalAmount)),
                if (investment.expectedRoiRate != null)
                  _InfoChip(
                    label: 'ROI target',
                    value: '${investment.expectedRoiRate!.toStringAsFixed(2)}%',
                  ),
                if (investment.startDate != null)
                  _InfoChip(
                    label: 'Start',
                    value: DateFormat('dd MMM yyyy').format(investment.startDate!),
                  ),
                if (investment.endDate != null)
                  _InfoChip(
                    label: 'Maturity',
                    value: DateFormat('dd MMM yyyy').format(investment.endDate!),
                  ),
              ],
            ),
            if (investment.payouts.isNotEmpty) ...[
              const Divider(),
              const Text('Scheduled payouts', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              ...investment.payouts.map(
                (payout) => ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.event),
                  title: Text('KES ${payout.amount.toStringAsFixed(2)}'),
                  subtitle: Text(
                    payout.payoutDate != null
                        ? DateFormat('dd MMM yyyy').format(payout.payoutDate!)
                        : 'TBD',
                  ),
                  trailing: Text(
                    payout.status.toUpperCase(),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 8),
            Row(
              children: [
                TextButton.icon(
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit),
                  label: const Text('Edit'),
                ),
                TextButton.icon(
                  onPressed: onDelete,
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Remove'),
                ),
                const Spacer(),
                FilledButton.icon(
                  onPressed: onCalculateRoi,
                  icon: const Icon(Icons.percent),
                  label: const Text('Calculate ROI'),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Chip(
      label: Text('$label: $value'),
      backgroundColor: Colors.grey[100],
    );
  }
}

