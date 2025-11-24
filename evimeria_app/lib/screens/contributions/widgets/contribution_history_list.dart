import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../models/wallet.dart';

class ContributionHistoryList extends StatelessWidget {
  const ContributionHistoryList({super.key, required this.wallets});

  final List<Wallet> wallets;

  @override
  Widget build(BuildContext context) {
    final contributions = wallets
        .expand((wallet) => wallet.contributions.map((c) => (wallet, c)))
        .toList()
      ..sort(
        (a, b) => (b.$2.createdAt ?? DateTime.now())
            .compareTo(a.$2.createdAt ?? DateTime.now()),
      );

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Recent contributions',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            if (contributions.isEmpty)
              Text(
                'No contributions recorded yet.',
                style: TextStyle(color: Colors.grey[700]),
              )
            else
              ...contributions.take(8).map(
                    (entry) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        backgroundColor: Colors.teal.withValues(alpha: .15),
                        child: const Icon(Icons.payments_outlined, color: Colors.teal),
                      ),
                      title: Text(
                        'KES ${entry.$2.amount.toStringAsFixed(2)} • ${entry.$2.source.toUpperCase()}',
                      ),
                      subtitle: Text(
                        [
                          entry.$1.member?.name ?? 'Wallet ${entry.$1.id}',
                          if (entry.$2.createdAt != null)
                            DateFormat('dd MMM yyyy').format(entry.$2.createdAt!),
                        ].join(' • '),
                      ),
                      trailing: Text(
                        entry.$2.status.toUpperCase(),
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: entry.$2.status == 'cleared'
                              ? Colors.green
                              : Colors.orange,
                        ),
                      ),
                    ),
                  ),
          ],
        ),
      ),
    );
  }
}

