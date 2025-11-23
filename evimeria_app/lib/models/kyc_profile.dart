class KycProfile {
  const KycProfile({
    required this.nationalId,
    required this.phone,
    required this.address,
    required this.dateOfBirth,
    required this.status,
    this.bankAccount = '',
  });

  final String nationalId;
  final String phone;
  final String address;
  final DateTime? dateOfBirth;
  final String status;
  final String bankAccount;

  factory KycProfile.fromJson(Map<String, dynamic> json) {
    return KycProfile(
      nationalId: json['national_id']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      address: json['address']?.toString() ?? '',
      dateOfBirth: json['date_of_birth'] != null
          ? DateTime.tryParse(json['date_of_birth'].toString())
          : null,
      status: json['kyc_status']?.toString() ?? 'pending',
      bankAccount: json['bank_account']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'national_id': nationalId,
      'phone': phone,
      'address': address,
      'bank_account': bankAccount,
      'date_of_birth': dateOfBirth?.toIso8601String(),
    };
  }
}

