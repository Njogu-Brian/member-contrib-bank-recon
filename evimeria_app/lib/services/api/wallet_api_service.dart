import 'package:evimeria_app/models/wallet.dart';

import '../../models/member.dart';
import '../../services/member_service.dart';
import '../../utils/constants.dart';
import '../api_service.dart';

class WalletApiService {
  WalletApiService(this._api);

  final ApiService _api;

  Future<List<Wallet>> fetchWallets() async {
    final dynamic response = await _api.get(AppConstants.walletsPath);
    final List<dynamic> list;
    if (response is List<dynamic>) {
      list = response;
    } else if (response is Map<String, dynamic>) {
      list = response['data'] as List<dynamic>? ?? [];
    } else {
      list = const [];
    }
    return list
        .map((json) => Wallet.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<ContributionRecord> createContribution({
    required int walletId,
    required double amount,
    required String source,
    String? reference,
    DateTime? contributedAt,
  }) async {
    final payload = {
      'amount': amount,
      'source': source,
      if (reference != null && reference.isNotEmpty) 'reference': reference,
      if (contributedAt != null) 'contribution_date': contributedAt.toIso8601String(),
    };
    final response = await _api.post(
      '${AppConstants.walletsPath}/$walletId/contributions',
      body: payload,
    );
    return ContributionRecord.fromJson(response);
  }

  Future<List<Member>> fetchMembersNeedingAttention(MemberService service) {
    return service.fetchMembers().then(
      (members) => members
          .where(
            (member) =>
                member.status.toLowerCase() == 'behind' ||
                member.status.toLowerCase() == 'deficit',
          )
          .toList(),
    );
  }
}

