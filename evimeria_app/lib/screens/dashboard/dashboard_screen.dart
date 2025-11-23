import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';

import '../../models/dashboard_summary.dart';
import '../../providers/auth_provider.dart';
import '../../providers/dashboard_provider.dart';
import '../../widgets/dashboard/announcement_carousel.dart';
import '../../widgets/dashboard/notification_tile.dart';
import '../../widgets/dashboard/stat_card.dart';
import '../auth/mfa_screen.dart';
import '../kyc/kyc_wizard_screen.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardValue = ref.watch(dashboardProvider);
    final formatter = NumberFormat.compactCurrency(symbol: 'KES ');
    final authNotifier = ref.read(authControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Evimeria Dashboard'),
        actions: [
          IconButton(
            tooltip: 'Complete KYC',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const KycWizardScreen()),
            ),
            icon: const Icon(Icons.verified_user_outlined),
          ),
          IconButton(
            tooltip: 'MFA',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const MfaScreen()),
            ),
            icon: const Icon(Icons.phonelink_lock),
          ),
          IconButton(
            tooltip: 'Logout',
            onPressed: () => authNotifier.logout(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: SafeArea(
        child: dashboardValue.when(
          data: (summary) => RefreshIndicator(
            onRefresh: () async => ref.refresh(dashboardProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildHeroRow(summary, formatter),
                const SizedBox(height: 16),
                _buildStatsGrid(summary, formatter),
                const SizedBox(height: 24),
                Text(
                  'Announcements',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                AnnouncementCarousel(items: summary.announcements),
                const SizedBox(height: 24),
                Text(
                  'Notifications',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                ...summary.notifications.take(5).map(
                      (n) => Card(
                        child: NotificationTile(item: n),
                      ),
                    ),
                const SizedBox(height: 24),
                Text(
                  'Weekly contributions',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                _buildChart(summary.weekly),
                const SizedBox(height: 24),
                Text(
                  'Monthly contributions',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                _buildChart(summary.monthly),
              ],
            ),
          ),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stack) => Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(error.toString()),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.refresh(dashboardProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeroRow(DashboardSummary summary, NumberFormat formatter) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 600;
        final walletCard = _HighlightCard(
          title: 'Wallet balance',
          value: formatter.format(summary.walletBalance),
          icon: Icons.account_balance_wallet_outlined,
        );
        final investmentCard = _HighlightCard(
          title: 'Investments',
          value: formatter.format(summary.investmentsTotal),
          icon: Icons.trending_up,
          color: Colors.orange,
        );

        if (isWide) {
          return Row(
            children: [
              Expanded(child: walletCard),
              const SizedBox(width: 16),
              Expanded(child: investmentCard),
            ],
          );
        }

        return Column(
          children: [
            walletCard,
            const SizedBox(height: 12),
            investmentCard,
          ],
        );
      },
    );
  }

  Widget _buildStatsGrid(DashboardSummary summary, NumberFormat formatter) {
    return GridView(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.8,
      ),
      children: [
        StatCard(
          label: 'Total members',
          value: summary.stats.totalMembers.toString(),
          icon: Icons.people_alt,
        ),
        StatCard(
          label: 'Unassigned txns',
          value: summary.stats.unassignedTransactions.toString(),
          icon: Icons.pending_actions,
          color: Colors.orange,
        ),
        StatCard(
          label: 'Statements processed',
          value: summary.stats.statementsProcessed.toString(),
          icon: Icons.receipt_long,
          color: Colors.blue,
        ),
        StatCard(
          label: 'Contributions',
          value: formatter.format(summary.stats.totalContributions),
          icon: Icons.payments,
          color: Colors.green,
        ),
      ],
    );
  }

  Widget _buildChart(List<ContributionPoint> points) {
    if (points.isEmpty) {
      return const Text('No data yet');
    }
    return Column(
      children: points.map((point) {
        final percent = point.amount == 0
            ? 0.0
            : (point.amount / (points.map((e) => e.amount).reduce(
                        (value, element) => value > element ? value : element)) *
                    1.0)
                .clamp(0.0, 1.0);
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(point.label),
              const SizedBox(height: 4),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(
                  minHeight: 8,
                  value: percent.isNaN ? 0 : percent,
                  backgroundColor: Colors.grey.shade200,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

class _HighlightCard extends StatelessWidget {
  const _HighlightCard({
    required this.title,
    required this.value,
    this.icon,
    this.color,
  });

  final String title;
  final String value;
  final IconData? icon;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final resolvedColor = color ?? Colors.teal;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: resolvedColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon ?? Icons.wallet, color: resolvedColor),
          const Spacer(),
          Text(
            title,
            style: Theme.of(context)
                .textTheme
                .labelLarge
                ?.copyWith(color: Colors.grey[700]),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: Theme.of(context)
                .textTheme
                .headlineSmall
                ?.copyWith(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}

