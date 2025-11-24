import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/user.dart';
import '../../providers/auth_provider.dart';
import '../announcements/announcements_screen.dart';
import '../contributions/contributions_screen.dart';
import '../dashboard/dashboard_screen.dart';
import '../finance/finance_screen.dart';
import '../investments/investments_screen.dart';
import '../meetings/meetings_screen.dart';
import '../reports/reports_screen.dart';

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authControllerProvider).user;
    final tabs = _buildTabs(user);
    final safeIndex = _currentIndex.clamp(0, tabs.length - 1);
    if (safeIndex != _currentIndex) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          setState(() => _currentIndex = safeIndex);
        }
      });
    }

    return Scaffold(
      body: IndexedStack(
        index: safeIndex,
        children: tabs
            .map(
              (tab) => KeyedSubtree(
                key: PageStorageKey(tab.label),
                child: tab.builder(context),
              ),
            )
            .toList(),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: safeIndex,
        destinations: tabs
            .map(
              (tab) => NavigationDestination(
                icon: Icon(tab.icon),
                label: tab.label,
              ),
            )
            .toList(),
        onDestinationSelected: (index) => setState(() => _currentIndex = index),
      ),
    );
  }

  List<_TabConfig> _buildTabs(EvUser? user) {
    final tabs = <_TabConfig>[
      _TabConfig(
        label: 'Dashboard',
        icon: Icons.dashboard_outlined,
        builder: (_) => const DashboardScreen(),
      ),
      _TabConfig(
        label: 'Contributions',
        icon: Icons.payments_outlined,
        builder: (_) => const ContributionsScreen(),
      ),
      _TabConfig(
        label: 'Investments',
        icon: Icons.trending_up,
        builder: (_) => const InvestmentsScreen(),
      ),
      _TabConfig(
        label: 'Announcements',
        icon: Icons.campaign_outlined,
        builder: (_) => const AnnouncementsScreen(),
      ),
      _TabConfig(
        label: 'Meetings',
        icon: Icons.groups_outlined,
        builder: (_) => const MeetingsScreen(),
      ),
    ];

    if (user?.canViewReports ?? true) {
      tabs.add(
        _TabConfig(
          label: 'Reports',
          icon: Icons.analytics_outlined,
          builder: (_) => const ReportsScreen(),
        ),
      );
    }

    if (user?.canManageFinance ?? false) {
      tabs.add(
        _TabConfig(
          label: 'Finance',
          icon: Icons.account_balance,
          builder: (_) => const FinanceScreen(),
        ),
      );
    }

    return tabs;
  }
}

class _TabConfig {
  const _TabConfig({
    required this.label,
    required this.icon,
    required this.builder,
  });

  final String label;
  final IconData icon;
  final WidgetBuilder builder;
}

