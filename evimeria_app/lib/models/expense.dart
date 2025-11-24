class Expense {
  const Expense({
    required this.id,
    required this.category,
    required this.amount,
    required this.incurredOn,
    required this.status,
    this.description,
    this.receiptUrl,
    this.budgetMonthId,
  });

  final int id;
  final String category;
  final double amount;
  final DateTime? incurredOn;
  final String status;
  final String? description;
  final String? receiptUrl;
  final int? budgetMonthId;

  factory Expense.fromJson(Map<String, dynamic> json) {
    return Expense(
      id: json['id'] as int? ?? 0,
      category: json['category']?.toString() ??
          json['expense_category']?['name']?.toString() ??
          'General',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      incurredOn: json['incurred_on'] != null
          ? DateTime.tryParse(json['incurred_on'].toString())
          : null,
      description: json['description']?.toString(),
      status: json['status']?.toString() ?? 'pending',
      receiptUrl: json['receipt_url']?.toString(),
      budgetMonthId: json['budget_month_id'] as int?,
    );
  }

  Map<String, dynamic> toPayload() {
    return {
      'category': category,
      'amount': amount,
      if (description != null) 'description': description,
      if (incurredOn != null) 'incurred_on': incurredOn!.toIso8601String(),
      if (budgetMonthId != null) 'budget_month_id': budgetMonthId,
    };
  }
}

