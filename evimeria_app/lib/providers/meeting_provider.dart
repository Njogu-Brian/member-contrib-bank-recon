import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/meeting.dart';
import '../services/api/meeting_api_service.dart';
import 'auth_provider.dart';

final meetingApiServiceProvider = Provider<MeetingApiService>(
  (ref) => MeetingApiService(ref.watch(apiServiceProvider)),
);

final meetingProvider = StateNotifierProvider<MeetingNotifier, AsyncValue<List<Meeting>>>(
  (ref) => MeetingNotifier(ref.watch(meetingApiServiceProvider))..refresh(),
);

class MeetingNotifier extends StateNotifier<AsyncValue<List<Meeting>>> {
  MeetingNotifier(this._api) : super(const AsyncLoading());

  final MeetingApiService _api;

  Future<void> refresh() async {
    try {
      final meetings = await _api.fetchMeetings();
      state = AsyncData(meetings);
    } catch (error, stack) {
      state = AsyncError(error, stack);
    }
  }

  Future<void> createMeeting(Map<String, dynamic> payload) async {
    final previous = state.value ?? [];
    try {
      final created = await _api.createMeeting(payload);
      state = AsyncData([...previous, created]);
    } catch (error, stack) {
      state = AsyncError(error, stack);
      rethrow;
    }
  }

  Future<void> addMotion(int meetingId, Map<String, dynamic> payload) async {
    try {
      final motion = await _api.addMotion(meetingId, payload);
      final updated = (state.value ?? [])
          .map(
            (meeting) => meeting.id == meetingId
                ? Meeting(
                    id: meeting.id,
                    title: meeting.title,
                    status: meeting.status,
                    description: meeting.description,
                    scheduledFor: meeting.scheduledFor,
                    location: meeting.location,
                    motions: [...meeting.motions, motion],
                  )
                : meeting,
          )
          .toList();
      state = AsyncData(updated);
    } catch (error, stack) {
      state = AsyncError(error, stack);
      rethrow;
    }
  }

  Future<void> vote(int motionId, String choice) async {
    try {
      await _api.voteOnMotion(motionId, choice);
    } catch (error, stack) {
      state = AsyncError(error, stack);
      rethrow;
    }
  }
}

