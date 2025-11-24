import 'package:evimeria_app/models/investment.dart';

import '../../utils/constants.dart';
import '../api_service.dart';

class InvestmentApiService {
  InvestmentApiService(this._api);

  final ApiService _api;

  Future<List<Investment>> fetchInvestments() async {
    final response = await _api.get(AppConstants.investmentsPath);
    final list = response['data'] as List<dynamic>? ?? response as List<dynamic>? ?? [];
    return list
        .map((json) => Investment.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<Investment> createInvestment(Map<String, dynamic> payload) async {
    final response = await _api.post(AppConstants.investmentsPath, body: payload);
    return Investment.fromJson(response);
  }

  Future<Investment> updateInvestment(int id, Map<String, dynamic> payload) async {
    final response = await _api.put('${AppConstants.investmentsPath}/$id', body: payload);
    return Investment.fromJson(response);
  }

  Future<void> deleteInvestment(int id) async {
    await _api.delete('${AppConstants.investmentsPath}/$id');
  }

  Future<double> fetchRoi(int id) async {
    final response = await _api.get('${AppConstants.investmentsPath}/$id/roi');
    return (response['roi'] as num?)?.toDouble() ?? 0;
  }
}

