import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/auth_payload.dart';
import '../models/kyc_profile.dart';
import '../models/user.dart';
import '../services/api/auth_api_service.dart';
import '../services/api/kyc_api_service.dart';
import '../services/api_service.dart';

final apiServiceProvider = Provider<ApiService>((ref) {
  final api = ApiService();
  api.bootstrap();
  return api;
});

final authApiServiceProvider = Provider<AuthApiService>(
  (ref) => AuthApiService(ref.watch(apiServiceProvider)),
);

final kycApiServiceProvider = Provider<KycApiService>(
  (ref) => KycApiService(ref.watch(apiServiceProvider)),
);

final authControllerProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    apiService: ref.watch(apiServiceProvider),
    authApiService: ref.watch(authApiServiceProvider),
    kycApiService: ref.watch(kycApiServiceProvider),
  );
});

class AuthState {
  const AuthState({
    required this.isAuthenticated,
    required this.isLoading,
    required this.bootstrapComplete,
    this.user,
    this.profile,
    this.errorMessage,
  });

  static const _sentinel = Object();

  factory AuthState.initial() {
    return const AuthState(
      isAuthenticated: false,
      isLoading: false,
      bootstrapComplete: false,
    );
  }

  final bool isAuthenticated;
  final bool isLoading;
  final bool bootstrapComplete;
  final EvUser? user;
  final KycProfile? profile;
  final String? errorMessage;

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    bool? bootstrapComplete,
    EvUser? user,
    KycProfile? profile,
    Object? errorMessage = _sentinel,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      bootstrapComplete: bootstrapComplete ?? this.bootstrapComplete,
      user: user ?? this.user,
      profile: profile ?? this.profile,
      errorMessage: identical(errorMessage, _sentinel)
          ? this.errorMessage
          : errorMessage as String?,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier({
    required ApiService apiService,
    required AuthApiService authApiService,
    required KycApiService kycApiService,
  })  : _api = apiService,
        _authApi = authApiService,
        _kycApi = kycApiService,
        super(AuthState.initial()) {
    _bootstrap();
  }

  final ApiService _api;
  final AuthApiService _authApi;
  final KycApiService _kycApi;

  Future<void> _bootstrap() async {
    await _api.bootstrap();
    try {
      final user = await _authApi.fetchUser();
      state = state.copyWith(
        user: user,
        isAuthenticated: true,
        bootstrapComplete: true,
        errorMessage: null,
      );
      await _loadProfile();
    } catch (_) {
      await _api.persistToken(null);
      state = state.copyWith(
        bootstrapComplete: true,
        isAuthenticated: false,
        user: null,
      );
    }
  }

  Future<void> _loadProfile() async {
    try {
      final profile = await _kycApi.fetchProfile();
      state = state.copyWith(profile: profile);
    } catch (_) {
      // ignore for now
    }
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final payload =
          await _authApi.login(email: email.trim(), password: password);
      await _cacheAuthPayload(payload);
      state = state.copyWith(
        isAuthenticated: true,
        isLoading: false,
        user: payload.user,
        profile: payload.profile ?? state.profile,
      );
      await _loadProfile();
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: error.toString(),
      );
    }
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final payload = await _authApi.register(
        name: name.trim(),
        email: email.trim(),
        password: password,
      );
      await _cacheAuthPayload(payload);
      state = state.copyWith(
        isAuthenticated: true,
        isLoading: false,
        user: payload.user,
        profile: payload.profile ?? state.profile,
      );
      await _loadProfile();
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: error.toString(),
      );
    }
  }

  Future<void> logout() async {
    await _authApi.logout();
    await _api.persistToken(null);
    state = AuthState.initial().copyWith(bootstrapComplete: true);
  }

  Future<void> requestPasswordReset(String email) async {
    try {
      await _authApi.requestPasswordReset(email);
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
      rethrow;
    }
  }

  Future<void> enableMfa(String code) async {
    try {
      await _authApi.enableMfa(code);
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
      rethrow;
    }
  }

  Future<void> disableMfa() async {
    try {
      await _authApi.disableMfa();
    } catch (error) {
      state = state.copyWith(errorMessage: error.toString());
      rethrow;
    }
  }

  Future<void> updateProfile(KycProfile profile) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final updated = await _kycApi.updateProfile(profile);
      state = state.copyWith(isLoading: false, profile: updated);
    } catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }

  Future<void> uploadDocument(String type, File file) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      await _kycApi.uploadDocument(type: type, file: file);
      state = state.copyWith(isLoading: false);
    } catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }

  Future<void> _cacheAuthPayload(AuthPayload payload) async {
    await _api.persistToken(payload.token);
  }
}

