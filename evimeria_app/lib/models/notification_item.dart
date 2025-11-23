class NotificationItem {
  const NotificationItem({
    required this.id,
    required this.type,
    required this.channel,
    required this.status,
    required this.sentAt,
  });

  final int id;
  final String type;
  final String channel;
  final String status;
  final DateTime? sentAt;

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id'] as int? ?? 0,
      type: json['type']?.toString() ?? '',
      channel: json['channel']?.toString() ?? '',
      status: json['status']?.toString() ?? 'queued',
      sentAt: json['sent_at'] != null
          ? DateTime.tryParse(json['sent_at'].toString())
          : null,
    );
  }
}

