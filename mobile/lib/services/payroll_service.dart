import '../config/api_config.dart';
import '../models/payroll.dart';
import 'api_service.dart';

/// Serviço de Folha de Pagamento.
class PayrollService {
  final ApiService _api = ApiService();

  /// Busca folhas de pagamento por funcionário.
  Future<List<Payroll>> getByEmployeeId(String employeeId) async {
    final uri = '${ApiConfig.payrolls}/employee/$employeeId';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => Payroll.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => Payroll.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca todas as folhas de pagamento.
  Future<List<Payroll>> getAll() async {
    final response = await _api.get(ApiConfig.payrolls, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => Payroll.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => Payroll.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca folhas de pagamento por mês.
  Future<List<Payroll>> getByMonth(String month) async {
    final uri = '${ApiConfig.payrolls}/month/$month';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => Payroll.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca folhas de pagamento por ano.
  Future<List<Payroll>> getByYear(int year) async {
    final uri = '${ApiConfig.payrolls}/year/$year';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => Payroll.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }
}
