import 'announcement.dart';
import 'notification_item.dart';

class DashboardSummary {
  const DashboardSummary({
    required this.stats,
    required this.weekly,
    required this.monthly,
    required this.walletBalance,
    required this.investmentsTotal,
    required this.announcements,
    required this.notifications,
  });

  final DashboardStats stats;
  final List<ContributionPoint> weekly;
  final List<ContributionPoint> monthly;
  final double walletBalance;
  final double investmentsTotal;
  final List<Announcement> announcements;
  final List<NotificationItem> notifications;
}

class DashboardStats {
  const DashboardStats({
    required this.totalMembers,
    required this.unassignedTransactions,
    required this.draftAssignments,
    required this.autoAssigned,
    required this.totalContributions,
    required this.assignedContributions,
    required this.unassignedContributions,
    required this.statementsProcessed,
  });

  final int totalMembers;
  final int unassignedTransactions;
  final int draftAssignments;
  final int autoAssigned;
  final double totalContributions;
  final double assignedContributions;
  final double unassignedContributions;
  final int statementsProcessed;

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    return DashboardStats(
      totalMembers: json['total_members'] as int? ?? 0,
      unassignedTransactions: json['unassigned_transactions'] as int? ?? 0,
      draftAssignments: json['draft_assignments'] as int? ?? 0,
      autoAssigned: json['auto_assigned'] as int? ?? 0,
      totalContributions:
          (json['total_contributions'] as num?)?.toDouble() ?? 0,
      assignedContributions:
          (json['assigned_contributions'] as num?)?.toDouble() ?? 0,
      unassignedContributions:
          (json['unassigned_contributions'] as num?)?.toDouble() ?? 0,
      statementsProcessed: json['statements_processed'] as int? ?? 0,
    );
  }
}

class ContributionPoint {
  const ContributionPoint({
    required this.label,
    required this.amount,
  });

  final String label;
  final double amount;

  factory ContributionPoint.fromJson(Map<String, dynamic> json,
      {String? labelKey}) {
    return ContributionPoint(
      label: json[labelKey ?? 'week']?.toString() ??
          json['month_name']?.toString() ??
          '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
    );
  }
}

