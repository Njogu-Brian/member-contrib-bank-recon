class ReportSummary {
  const ReportSummary({
    required this.totalWalletBalance,
    required this.monthlyContributions,
    required this.monthlyExpenses,
    required this.roiYearToDate,
    required this.contributionTrend,
    required this.expenseTrend,
  });

  final double totalWalletBalance;
  final double monthlyContributions;
  final double monthlyExpenses;
  final double roiYearToDate;
  final List<ReportDataPoint> contributionTrend;
  final List<ReportDataPoint> expenseTrend;

  factory ReportSummary.fromJson(Map<String, dynamic> json) {
    final contributions = json['contribution_trend'] as List<dynamic>? ?? [];
    final expenses = json['expense_trend'] as List<dynamic>? ?? [];
    return ReportSummary(
      totalWalletBalance:
          (json['total_wallet_balance'] as num?)?.toDouble() ?? 0,
      monthlyContributions:
          (json['monthly_contributions'] as num?)?.toDouble() ?? 0,
      monthlyExpenses: (json['monthly_expenses'] as num?)?.toDouble() ?? 0,
      roiYearToDate: (json['roi_ytd'] as num?)?.toDouble() ?? 0,
      contributionTrend: contributions
          .map((point) => ReportDataPoint.fromJson(point as Map<String, dynamic>))
          .toList(),
      expenseTrend: expenses
          .map((point) => ReportDataPoint.fromJson(point as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ReportDataPoint {
  const ReportDataPoint({required this.label, required this.value});

  final String label;
  final double value;

  factory ReportDataPoint.fromJson(Map<String, dynamic> json) {
    return ReportDataPoint(
      label: json['label']?.toString() ?? '',
      value: (json['value'] as num?)?.toDouble() ?? 0,
    );
  }
}

