import '../config/api_config.dart';
import '../models/accounts_receivable.dart';
import 'api_service.dart';

/// Serviço de Contas a Receber.
class AccountsReceivableService {
  final ApiService _api = ApiService();

  /// Busca todas as contas a receber.
  Future<List<AccountsReceivable>> getAll() async {
    final uri = '${ApiConfig.accountsReceivable}/all';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => AccountsReceivable.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => AccountsReceivable.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca contas a receber por status.
  Future<List<AccountsReceivable>> getByStatus(String status) async {
    final uri = '${ApiConfig.accountsReceivable}/status/$status';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => AccountsReceivable.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca contas vencidas.
  Future<List<AccountsReceivable>> getOverdue() async {
    final uri = '${ApiConfig.accountsReceivable}/overdue';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => AccountsReceivable.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca contas vencendo em X dias.
  Future<List<AccountsReceivable>> getDueInDays(int days) async {
    final uri = '${ApiConfig.accountsReceivable}/due-in-days/$days';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => AccountsReceivable.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }
}
