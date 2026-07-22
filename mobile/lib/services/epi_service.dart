import '../config/api_config.dart';
import '../models/epi.dart';
import 'api_service.dart';

/// Serviço de EPIs (Equipamentos de Proteção Individual).
class EpiService {
  final ApiService _api = ApiService();

  /// Busca EPIs de um funcionário.
  Future<List<EmployeeEPI>> getEmployeeEpis(String employeeId) async {
    final uri = '${ApiConfig.epis}/employee/$employeeId';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => EmployeeEPI.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }
}
