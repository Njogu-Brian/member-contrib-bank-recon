import 'package:evimeria_app/models/dashboard_summary.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('DashboardStats parses numeric fields', () {
    final stats = DashboardStats.fromJson({
      'total_members': 150,
      'unassigned_transactions': 12,
      'draft_assignments': 4,
      'auto_assigned': 20,
      'total_contributions': 120000.50,
      'assigned_contributions': 80000,
      'unassigned_contributions': 40000.5,
      'statements_processed': 30,
    });

    expect(stats.totalMembers, 150);
    expect(stats.unassignedTransactions, 12);
    expect(stats.totalContributions, 120000.50);
  });

  test('ContributionPoint handles different labels', () {
    final weekly = ContributionPoint.fromJson(
      {'week': '2025-10', 'amount': 1000},
      labelKey: 'week',
    );
    final monthly = ContributionPoint.fromJson(
      {'month_name': 'January 2025', 'amount': 2000},
      labelKey: 'month_name',
    );

    expect(weekly.label, '2025-10');
    expect(monthly.label, 'January 2025');
  });
}

