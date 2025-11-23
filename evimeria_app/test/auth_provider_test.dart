import 'package:evimeria_app/models/auth_payload.dart';
import 'package:evimeria_app/models/kyc_profile.dart';
import 'package:evimeria_app/models/user.dart';
import 'package:evimeria_app/providers/auth_provider.dart';
import 'package:evimeria_app/services/api/auth_api_service.dart';
import 'package:evimeria_app/services/api/kyc_api_service.dart';
import 'package:evimeria_app/services/api_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockApiService extends Mock implements ApiService {}

class _MockAuthApiService extends Mock implements AuthApiService {}

class _MockKycApiService extends Mock implements KycApiService {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late _MockApiService apiService;
  late _MockAuthApiService authApiService;
  late _MockKycApiService kycApiService;
  late AuthNotifier notifier;

  setUp(() {
    apiService = _MockApiService();
    authApiService = _MockAuthApiService();
    kycApiService = _MockKycApiService();

    when(() => apiService.bootstrap()).thenAnswer((_) async {});
    when(() => apiService.persistToken(any())).thenAnswer((_) async {});
    when(() => authApiService.fetchUser()).thenThrow(Exception('no session'));

    notifier = AuthNotifier(
      apiService: apiService,
      authApiService: authApiService,
      kycApiService: kycApiService,
    );
  });

  test('login success updates state to authenticated', () async {
    final payload = AuthPayload(
      token: 'token',
      user: const EvUser(id: 1, name: 'Jane', email: 'jane@example.com'),
      profile: const KycProfile(
        nationalId: '12345678',
        phone: '0700000000',
        address: 'Nairobi',
        dateOfBirth: null,
        status: 'pending',
      ),
    );

    when(() => authApiService.login(
          email: any(named: 'email'),
          password: any(named: 'password'),
        )).thenAnswer((_) async => payload);
    when(() => apiService.persistToken('token')).thenAnswer((_) async {});
    when(() => kycApiService.fetchProfile()).thenAnswer(
      (_) async => payload.profile!,
    );

    await notifier.login(email: 'jane@example.com', password: 'password123');

    expect(notifier.state.isAuthenticated, true);
    expect(notifier.state.user?.name, 'Jane');
  });

  test('login failure captures error message', () async {
    when(() => authApiService.login(
          email: any(named: 'email'),
          password: any(named: 'password'),
        )).thenThrow(Exception('invalid credentials'));

    await notifier.login(email: 'bad@example.com', password: 'bad');

    expect(notifier.state.isAuthenticated, false);
    expect(notifier.state.errorMessage, contains('invalid credentials'));
  });
}

