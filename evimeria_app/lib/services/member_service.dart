import '../models/member.dart';
import '../utils/constants.dart';
import 'api_service.dart';

class MemberService {
  MemberService({ApiService? apiService}) : _api = apiService ?? ApiService();

  final ApiService _api;

  Future<List<Member>> fetchMembers() async {
    final response = await _api.get(AppConstants.membersPath);
    final data = response['data'] as List<dynamic>? ?? [];
    return data
        .map((json) => Member.fromJson(json as Map<String, dynamic>))
        .toList();
  }
}
