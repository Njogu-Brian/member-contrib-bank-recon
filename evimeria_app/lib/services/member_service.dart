import '../models/member.dart';
import '../utils/constants.dart';
import 'api_service.dart';

class MemberService {
  MemberService({ApiService? apiService}) : _api = apiService ?? ApiService();

  final ApiService _api;

  Future<List<Member>> fetchMembers() async {
    final dynamic response = await _api.get(AppConstants.membersPath);
    final List<dynamic> data;
    if (response is List<dynamic>) {
      data = response;
    } else if (response is Map<String, dynamic>) {
      data = response['data'] as List<dynamic>? ?? [];
    } else {
      data = const [];
    }
    return data
        .map((json) => Member.fromJson(json as Map<String, dynamic>))
        .toList();
  }
}
