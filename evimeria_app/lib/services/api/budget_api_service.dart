import '../../models/budget.dart';
import '../../utils/constants.dart';
import '../api_service.dart';

class BudgetApiService {
  BudgetApiService(this._api);

  final ApiService _api;

  Future<List<Budget>> fetchBudgets() async {
    final response = await _api.get(AppConstants.budgetsPath);
    final data = response['data'] as List<dynamic>? ?? response as List<dynamic>? ?? [];
    return data.map((json) => Budget.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<Budget> createBudget(Map<String, dynamic> payload) async {
    final response = await _api.post(AppConstants.budgetsPath, body: payload);
    return Budget.fromJson(response);
  }

  Future<Budget> updateBudget(int id, Map<String, dynamic> payload) async {
    final response = await _api.put('${AppConstants.budgetsPath}/$id', body: payload);
    return Budget.fromJson(response);
  }

  Future<BudgetMonth> updateBudgetMonth(int id, Map<String, dynamic> payload) async {
    final response =
        await _api.put('${AppConstants.budgetMonthsPath}/$id', body: payload);
    return BudgetMonth.fromJson(response);
  }
}

