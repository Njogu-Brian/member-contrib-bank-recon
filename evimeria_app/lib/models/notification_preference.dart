class NotificationPreference {
  const NotificationPreference({
    required this.emailEnabled,
    required this.smsEnabled,
    required this.pushEnabled,
  });

  final bool emailEnabled;
  final bool smsEnabled;
  final bool pushEnabled;

  factory NotificationPreference.fromJson(Map<String, dynamic> json) {
    return NotificationPreference(
      emailEnabled: json['email_enabled'] as bool? ?? true,
      smsEnabled: json['sms_enabled'] as bool? ?? false,
      pushEnabled: (json['app_enabled'] ?? json['push_enabled']) as bool? ?? true,
    );
  }

  NotificationPreference copyWith({
    bool? emailEnabled,
    bool? smsEnabled,
    bool? pushEnabled,
  }) {
    return NotificationPreference(
      emailEnabled: emailEnabled ?? this.emailEnabled,
      smsEnabled: smsEnabled ?? this.smsEnabled,
      pushEnabled: pushEnabled ?? this.pushEnabled,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'email_enabled': emailEnabled,
      'sms_enabled': smsEnabled,
      'app_enabled': pushEnabled,
    };
  }
}

