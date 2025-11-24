import 'package:evimeria_app/models/meeting.dart';

import '../../utils/constants.dart';
import '../api_service.dart';

class MeetingApiService {
  MeetingApiService(this._api);

  final ApiService _api;

  Future<List<Meeting>> fetchMeetings() async {
    final response = await _api.get(AppConstants.meetingsPath);
    final list = response['data'] as List<dynamic>? ?? response as List<dynamic>? ?? [];
    return list
        .map((json) => Meeting.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<Meeting> createMeeting(Map<String, dynamic> payload) async {
    final response = await _api.post(AppConstants.meetingsPath, body: payload);
    return Meeting.fromJson(response);
  }

  Future<Motion> addMotion(int meetingId, Map<String, dynamic> payload) async {
    final response =
        await _api.post('${AppConstants.meetingsPath}/$meetingId/motions', body: payload);
    return Motion.fromJson(response);
  }

  Future<void> voteOnMotion(int motionId, String choice) async {
    await _api.post('/mobile/motions/$motionId/vote', body: {'choice': choice});
  }
}

