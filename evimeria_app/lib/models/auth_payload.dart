import 'kyc_profile.dart';
import 'user.dart';

class AuthPayload {
  const AuthPayload({
    required this.token,
    required this.user,
    this.profile,
  });

  final String token;
  final EvUser user;
  final KycProfile? profile;

  factory AuthPayload.fromJson(Map<String, dynamic> json) {
    return AuthPayload(
      token: json['token']?.toString() ?? '',
      user: EvUser.fromJson(json['user'] as Map<String, dynamic>? ?? {}),
      profile: json['profile'] != null
          ? KycProfile.fromJson(json['profile'] as Map<String, dynamic>)
          : null,
    );
  }
}

