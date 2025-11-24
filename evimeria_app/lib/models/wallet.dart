import 'package:evimeria_app/models/member.dart';

class Wallet {
  const Wallet({
    required this.id,
    required this.memberId,
    required this.balance,
    required this.lockedBalance,
    required this.contributions,
    this.member,
  });

  final int id;
  final int memberId;
  final double balance;
  final double lockedBalance;
  final Member? member;
  final List<ContributionRecord> contributions;

  double get availableBalance => balance - lockedBalance;

  factory Wallet.fromJson(Map<String, dynamic> json) {
    final contributionJson = json['contributions'] as List<dynamic>? ?? [];
    return Wallet(
      id: json['id'] as int? ?? 0,
      memberId: json['member_id'] as int? ?? 0,
      balance: (json['balance'] as num?)?.toDouble() ?? 0,
      lockedBalance: (json['locked_balance'] as num?)?.toDouble() ?? 0,
      member: json['member'] is Map<String, dynamic>
          ? Member.fromJson(json['member'] as Map<String, dynamic>)
          : null,
      contributions: contributionJson
          .map((entry) =>
              ContributionRecord.fromJson(entry as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ContributionRecord {
  const ContributionRecord({
    required this.id,
    required this.amount,
    required this.source,
    required this.status,
    required this.createdAt,
    this.reference,
    this.receiptUrl,
    this.metadata,
  });

  final int id;
  final double amount;
  final String source;
  final String status;
  final DateTime? createdAt;
  final String? reference;
  final String? receiptUrl;
  final Map<String, dynamic>? metadata;

  factory ContributionRecord.fromJson(Map<String, dynamic> json) {
    return ContributionRecord(
      id: json['id'] as int? ?? 0,
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      source: json['source']?.toString() ?? 'manual',
      status: json['status']?.toString() ?? 'pending',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
      reference: json['reference']?.toString(),
      receiptUrl: json['receipt_url']?.toString(),
      metadata: json['metadata'] is Map<String, dynamic>
          ? json['metadata'] as Map<String, dynamic>
          : null,
    );
  }
}

