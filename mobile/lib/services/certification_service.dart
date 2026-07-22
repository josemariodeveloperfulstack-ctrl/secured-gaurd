import '../config/api_config.dart';
import '../models/certification.dart';
import 'api_service.dart';

/// Serviço de Certificações / Treinamentos do RH.
class CertificationService {
  final ApiService _api = ApiService();

  /// Busca certificações do funcionário autenticado.
  Future<List<Certification>> getMyCertifications() async {
    final uri = '${ApiConfig.employeeCertifications}/me';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => Certification.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => Certification.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca estatísticas de certificações do funcionário autenticado.
  Future<Map<String, dynamic>?> getMyStats() async {
    final uri = '${ApiConfig.employeeCertifications}/me/stats';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return null;
    if (response.data is Map) {
      return response.data;
    }
    return null;
  }

  /// Busca certificações por ID de funcionário (uso administrativo).
  Future<List<Certification>> getByEmployeeId(String employeeId) async {
    final uri = '${ApiConfig.employeeCertifications}?employeeId=$employeeId';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => Certification.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }
}
