class Announcement {
  const Announcement({
    required this.id,
    required this.title,
    required this.body,
    required this.publishedAt,
    required this.isPinned,
  });

  final int id;
  final String title;
  final String body;
  final DateTime? publishedAt;
  final bool isPinned;

  factory Announcement.fromJson(Map<String, dynamic> json) {
    return Announcement(
      id: json['id'] as int? ?? 0,
      title: json['title']?.toString() ?? '',
      body: json['body']?.toString() ?? '',
      publishedAt: json['published_at'] != null
          ? DateTime.tryParse(json['published_at'].toString())
          : null,
      isPinned: json['is_pinned'] as bool? ?? false,
    );
  }
}

