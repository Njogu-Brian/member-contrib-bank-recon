class Budget {
  const Budget({
    required this.id,
    required this.name,
    required this.total,
    required this.spent,
    required this.months,
    this.description,
  });

  final int id;
  final String name;
  final double total;
  final double spent;
  final String? description;
  final List<BudgetMonth> months;

  double get remaining => total - spent;
  double get utilization => total == 0 ? 0 : (spent / total).clamp(0, 1);

  factory Budget.fromJson(Map<String, dynamic> json) {
    final monthJson = json['months'] as List<dynamic>? ?? json['budget_months'] as List<dynamic>? ?? [];
    return Budget(
      id: json['id'] as int? ?? 0,
      name: json['name']?.toString() ?? 'Budget',
      description: json['description']?.toString(),
      total: (json['amount'] as num?)?.toDouble() ??
          (json['total_amount'] as num?)?.toDouble() ??
          0,
      spent: (json['spent_amount'] as num?)?.toDouble() ?? 0,
      months: monthJson
          .map((month) => BudgetMonth.fromJson(month as Map<String, dynamic>))
          .toList(),
    );
  }
}

class BudgetMonth {
  const BudgetMonth({
    required this.id,
    required this.label,
    required this.allocated,
    required this.spent,
    required this.status,
  });

  final int id;
  final String label;
  final double allocated;
  final double spent;
  final String status;

  double get remaining => allocated - spent;
  double get utilization => allocated == 0 ? 0 : (spent / allocated).clamp(0, 1);

  factory BudgetMonth.fromJson(Map<String, dynamic> json) {
    return BudgetMonth(
      id: json['id'] as int? ?? 0,
      label: json['month_label']?.toString() ??
          json['month']?.toString() ??
          'Month',
      allocated: (json['allocated_amount'] as num?)?.toDouble() ??
          (json['amount'] as num?)?.toDouble() ??
          0,
      spent: (json['spent_amount'] as num?)?.toDouble() ?? 0,
      status: json['status']?.toString() ?? 'on_track',
    );
  }
}

