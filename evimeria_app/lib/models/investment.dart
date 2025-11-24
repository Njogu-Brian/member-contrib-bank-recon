class Investment {
  const Investment({
    required this.id,
    required this.memberId,
    required this.name,
    required this.principalAmount,
    required this.status,
    this.description,
    this.expectedRoiRate,
    this.startDate,
    this.endDate,
    this.metadata,
    this.payouts = const [],
  });

  final int id;
  final int memberId;
  final String name;
  final String status;
  final String? description;
  final double principalAmount;
  final double? expectedRoiRate;
  final DateTime? startDate;
  final DateTime? endDate;
  final Map<String, dynamic>? metadata;
  final List<InvestmentPayout> payouts;

  factory Investment.fromJson(Map<String, dynamic> json) {
    final payoutJson = json['payouts'] as List<dynamic>? ?? [];
    return Investment(
      id: json['id'] as int? ?? 0,
      memberId: json['member_id'] as int? ?? 0,
      name: json['name']?.toString() ?? 'Investment',
      description: json['description']?.toString(),
      principalAmount: (json['amount'] as num?)?.toDouble() ??
          (json['principal_amount'] as num?)?.toDouble() ??
          0,
      expectedRoiRate:
          (json['expected_roi_rate'] as num?)?.toDouble(),
      startDate: json['investment_date'] != null
          ? DateTime.tryParse(json['investment_date'].toString())
          : (json['start_date'] != null
              ? DateTime.tryParse(json['start_date'].toString())
              : null),
      endDate: json['maturity_date'] != null
          ? DateTime.tryParse(json['maturity_date'].toString())
          : (json['end_date'] != null
              ? DateTime.tryParse(json['end_date'].toString())
              : null),
      status: json['status']?.toString() ?? 'active',
      metadata: json['metadata'] is Map<String, dynamic>
          ? json['metadata'] as Map<String, dynamic>
          : null,
      payouts: payoutJson
          .map((entry) =>
              InvestmentPayout.fromJson(entry as Map<String, dynamic>))
          .toList(),
    );
  }

  Investment copyWith({
    String? name,
    String? description,
    double? principalAmount,
    double? expectedRoiRate,
    DateTime? startDate,
    DateTime? endDate,
    String? status,
    List<InvestmentPayout>? payouts,
  }) {
    return Investment(
      id: id,
      memberId: memberId,
      name: name ?? this.name,
      description: description ?? this.description,
      principalAmount: principalAmount ?? this.principalAmount,
      expectedRoiRate: expectedRoiRate ?? this.expectedRoiRate,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      status: status ?? this.status,
      metadata: metadata,
      payouts: payouts ?? this.payouts,
    );
  }
}

class InvestmentPayout {
  const InvestmentPayout({
    required this.id,
    required this.amount,
    required this.payoutDate,
    required this.status,
    this.notes,
  });

  final int id;
  final double amount;
  final DateTime? payoutDate;
  final String status;
  final String? notes;

  factory InvestmentPayout.fromJson(Map<String, dynamic> json) {
    return InvestmentPayout(
      id: json['id'] as int? ?? 0,
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      payoutDate: json['payout_date'] != null
          ? DateTime.tryParse(json['payout_date'].toString())
          : null,
      status: json['status']?.toString() ?? 'scheduled',
      notes: json['notes']?.toString(),
    );
  }
}

