import 'package:evimeria_app/models/auth_payload.dart';
import 'package:evimeria_app/models/user.dart';

import '../../utils/constants.dart';
import '../api_service.dart';

class AuthApiService {
  AuthApiService(this._api);

  final ApiService _api;

  Future<AuthPayload> login({
    required String email,
    required String password,
  }) async {
    final response = await _api.post(AppConstants.loginPath, body: {
      'email': email,
      'password': password,
    });
    return AuthPayload.fromJson(response);
  }

  Future<AuthPayload> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final response = await _api.post(AppConstants.registerPath, body: {
      'name': name,
      'email': email,
      'password': password,
      'password_confirmation': password,
    });
    return AuthPayload.fromJson(response);
  }

  Future<EvUser> fetchUser() async {
    final response = await _api.get('/mobile/auth/me');
    return EvUser.fromJson(response);
  }

  Future<void> logout() async {
    await _api.post('/mobile/auth/logout');
    await _api.persistToken(null);
  }

  Future<void> requestPasswordReset(String email) async {
    await _api.post(AppConstants.passwordResetPath, body: {
      'email': email,
    });
  }

  Future<void> enableMfa(String code) async {
    await _api.post('/mobile/mfa/enable', body: {'code': code});
  }

  Future<void> disableMfa() async {
    await _api.post('/mobile/mfa/disable');
  }
}

