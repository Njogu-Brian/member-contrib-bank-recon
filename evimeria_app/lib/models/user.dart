class EvUser {
  const EvUser({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.status,
    this.roles = const [],
    this.permissions = const [],
    this.mfaEnabled = false,
  });

  final int id;
  final String name;
  final String email;
  final String? phone;
  final String? status;
  final List<String> roles;
  final List<String> permissions;
  final bool mfaEnabled;

  factory EvUser.fromJson(Map<String, dynamic> json) {
    final rawRoles = json['roles'];
    final rawPermissions = json['permissions'];
    return EvUser(
      id: json['id'] as int? ?? 0,
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString(),
      status: json['status']?.toString(),
      roles: rawRoles is List
          ? rawRoles.map((role) => role.toString().toLowerCase()).toList()
          : const [],
      permissions: rawPermissions is List
          ? rawPermissions.map((perm) => perm.toString().toLowerCase()).toList()
          : const [],
      mfaEnabled: json['mfa_enabled'] as bool? ??
          json['is_mfa_enabled'] as bool? ??
          false,
    );
  }

  bool hasRole(String role) => roles.contains(role.toLowerCase());
  bool hasPermission(String permission) =>
      permissions.contains(permission.toLowerCase());

  bool get canManageFinance =>
      hasRole('admin') || hasRole('treasurer') || hasPermission('manage-finance');
  bool get canViewReports => canManageFinance || hasRole('member');
  bool get canManageMeetings =>
      hasRole('admin') || hasPermission('manage-meetings');
}

