import 'package:evimeria_app/services/api_service.dart';
import 'package:evimeria_app/utils/constants.dart';

class AuthResult {
  const AuthResult({required this.token, required this.user});

  final String token;
  final Map<String, dynamic> user;
}

class AuthService {
  AuthService({ApiService? apiService}) : _api = apiService ?? ApiService();

  final ApiService _api;

  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    final json = await _api.post(
      AppConstants.loginPath,
      body: {'email': email, 'password': password},
    );
    final token = json['token']?.toString();
    if (token == null) {
      throw ApiException(500, 'Token missing from response');
    }
    return AuthResult(
      token: token,
      user: (json['user'] as Map<String, dynamic>? ?? const {}),
    );
  }
}
