class Meeting {
  const Meeting({
    required this.id,
    required this.title,
    required this.status,
    this.description,
    this.scheduledFor,
    this.location,
    this.motions = const [],
  });

  final int id;
  final String title;
  final String status;
  final String? description;
  final DateTime? scheduledFor;
  final String? location;
  final List<Motion> motions;

  factory Meeting.fromJson(Map<String, dynamic> json) {
    final motionJson = json['motions'] as List<dynamic>? ?? [];
    return Meeting(
      id: json['id'] as int? ?? 0,
      title: json['title']?.toString() ?? 'Meeting',
      description: json['description']?.toString(),
      status: json['status']?.toString() ?? 'scheduled',
      scheduledFor: json['scheduled_for'] != null
          ? DateTime.tryParse(json['scheduled_for'].toString())
          : null,
      location: json['location']?.toString(),
      motions: motionJson
          .map((entry) => Motion.fromJson(entry as Map<String, dynamic>))
          .toList(),
    );
  }
}

class Motion {
  const Motion({
    required this.id,
    required this.title,
    required this.status,
    this.description,
    this.votes = const [],
  });

  final int id;
  final String title;
  final String status;
  final String? description;
  final List<Vote> votes;

  factory Motion.fromJson(Map<String, dynamic> json) {
    final voteJson = json['votes'] as List<dynamic>? ?? [];
    return Motion(
      id: json['id'] as int? ?? 0,
      title: json['title']?.toString() ?? 'Motion',
      description: json['description']?.toString(),
      status: json['status']?.toString() ?? 'pending',
      votes: voteJson
          .map((entry) => Vote.fromJson(entry as Map<String, dynamic>))
          .toList(),
    );
  }
}

class Vote {
  const Vote({
    required this.id,
    required this.userId,
    required this.choice,
  });

  final int id;
  final int userId;
  final String choice;

  factory Vote.fromJson(Map<String, dynamic> json) {
    return Vote(
      id: json['id'] as int? ?? 0,
      userId: json['user_id'] as int? ?? 0,
      choice: json['choice']?.toString() ?? 'yes',
    );
  }
}

