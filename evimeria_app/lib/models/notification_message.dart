class NotificationMessage {
  const NotificationMessage({
    required this.id,
    required this.type,
    required this.channel,
    required this.status,
    this.message,
    this.sentAt,
  });

  final int id;
  final String type;
  final String channel;
  final String status;
  final String? message;
  final DateTime? sentAt;

  factory NotificationMessage.fromJson(Map<String, dynamic> json) {
    return NotificationMessage(
      id: json['id'] as int? ?? 0,
      type: json['type']?.toString() ?? 'announcement',
      channel: json['channel']?.toString() ?? 'email',
      status: json['status']?.toString() ?? 'queued',
      message: json['message']?.toString() ?? json['payload']?.toString(),
      sentAt: json['sent_at'] != null
          ? DateTime.tryParse(json['sent_at'].toString())
          : null,
    );
  }
}

