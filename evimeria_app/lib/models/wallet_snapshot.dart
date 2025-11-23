class WalletSnapshot {
  const WalletSnapshot({
    required this.id,
    required this.memberId,
    required this.balance,
    required this.lockedBalance,
    required this.memberName,
  });

  final int id;
  final int memberId;
  final double balance;
  final double lockedBalance;
  final String memberName;

  factory WalletSnapshot.fromJson(Map<String, dynamic> json) {
    final member = json['member'] as Map<String, dynamic>? ?? {};
    return WalletSnapshot(
      id: json['id'] as int? ?? 0,
      memberId: json['member_id'] as int? ?? 0,
      balance: (json['balance'] as num?)?.toDouble() ?? 0,
      lockedBalance: (json['locked_balance'] as num?)?.toDouble() ?? 0,
      memberName: member['name']?.toString() ?? 'Member',
    );
  }
}

