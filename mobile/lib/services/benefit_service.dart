import '../config/api_config.dart';
import '../models/benefit.dart';
import 'api_service.dart';

/// Serviço de Benefícios.
class BenefitService {
  final ApiService _api = ApiService();

  /// Busca benefícios por funcionário.
  Future<List<EmployeeBenefit>> getByEmployeeId(String employeeId) async {
    final uri = '${ApiConfig.benefits}/employee/$employeeId';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => EmployeeBenefit.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => EmployeeBenefit.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca todos os benefícios.
  Future<List<EmployeeBenefit>> getAll() async {
    final response = await _api.get(ApiConfig.benefits, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => EmployeeBenefit.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => EmployeeBenefit.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca benefícios ativos.
  Future<List<EmployeeBenefit>> getActive() async {
    final uri = '${ApiConfig.benefits}/active';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => EmployeeBenefit.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }
}
