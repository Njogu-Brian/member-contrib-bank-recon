import 'package:evimeria_app/providers/meeting_provider.dart';
import 'package:evimeria_app/services/api/meeting_api_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockMeetingApi extends Mock implements MeetingApiService {}

void main() {
  test('vote forwards to API', () async {
    final api = _MockMeetingApi();
    final notifier = MeetingNotifier(api);
    when(() => api.voteOnMotion(1, 'yes')).thenAnswer((_) async {});

    await notifier.vote(1, 'yes');

    verify(() => api.voteOnMotion(1, 'yes')).called(1);
  });
}

