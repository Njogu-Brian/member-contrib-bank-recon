class AuditLogEntry {
  const AuditLogEntry({
    required this.id,
    required this.actor,
    required this.action,
    required this.module,
    required this.createdAt,
    this.metadata,
  });

  final int id;
  final String actor;
  final String action;
  final String module;
  final DateTime? createdAt;
  final Map<String, dynamic>? metadata;

  factory AuditLogEntry.fromJson(Map<String, dynamic> json) {
    return AuditLogEntry(
      id: json['id'] as int? ?? 0,
      actor: json['actor']?.toString() ??
          json['user_name']?.toString() ??
          'System',
      action: json['action']?.toString() ?? '',
      module: json['module']?.toString() ?? json['entity_type']?.toString() ?? '',
      metadata: json['metadata'] is Map<String, dynamic>
          ? json['metadata'] as Map<String, dynamic>
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }
}

