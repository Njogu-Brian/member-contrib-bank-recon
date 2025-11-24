import '../../models/expense.dart';
import '../../utils/constants.dart';
import '../api_service.dart';

class ExpenseApiService {
  ExpenseApiService(this._api);

  final ApiService _api;

  Future<List<Expense>> fetchExpenses() async {
    final response = await _api.get(AppConstants.expensesPath);
    final data = response['data'] as List<dynamic>? ?? response as List<dynamic>? ?? [];
    return data.map((json) => Expense.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<Expense> createExpense(Map<String, dynamic> payload) async {
    final response = await _api.post(AppConstants.expensesPath, body: payload);
    return Expense.fromJson(response);
  }

  Future<Expense> updateExpense(int id, Map<String, dynamic> payload) async {
    final response = await _api.put('${AppConstants.expensesPath}/$id', body: payload);
    return Expense.fromJson(response);
  }

  Future<void> deleteExpense(int id) async {
    await _api.delete('${AppConstants.expensesPath}/$id');
  }
}

