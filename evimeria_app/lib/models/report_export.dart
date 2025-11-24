class ReportExport {
  const ReportExport({
    required this.id,
    required this.type,
    required this.format,
    required this.status,
    this.downloadUrl,
    this.createdAt,
  });

  final int id;
  final String type;
  final String format;
  final String status;
  final String? downloadUrl;
  final DateTime? createdAt;

  bool get isReady => status.toLowerCase() == 'ready';

  factory ReportExport.fromJson(Map<String, dynamic> json) {
    return ReportExport(
      id: json['id'] as int? ?? 0,
      type: json['type']?.toString() ?? 'summary',
      format: json['format']?.toString() ?? 'pdf',
      status: json['status']?.toString() ?? 'pending',
      downloadUrl: json['download_url']?.toString() ?? json['url']?.toString(),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }
}

