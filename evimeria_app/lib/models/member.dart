class Member {
  const Member({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.status,
    this.memberCode,
    this.memberNumber,
    this.statusLabel,
    this.statusColor,
  });

  final int id;
  final String name;
  final String email;
  final String phone;
  final String status;
  final String? memberCode;
  final String? memberNumber;
  final String? statusLabel;
  final String? statusColor;

  factory Member.fromJson(Map<String, dynamic> json) {
    return Member(
      id: json['id'] as int? ?? 0,
      name: json['name']?.toString() ?? 'Unknown',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      status: json['contribution_status']?.toString() ??
          json['status']?.toString() ??
          'active',
      memberCode: json['member_code']?.toString(),
      memberNumber: json['member_number']?.toString(),
      statusLabel: json['contribution_status_label']?.toString(),
      statusColor: json['contribution_status_color']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'contribution_status': status,
      'member_code': memberCode,
      'member_number': memberNumber,
      'contribution_status_label': statusLabel,
      'contribution_status_color': statusColor,
    };
  }
}
