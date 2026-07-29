import '../config/api_config.dart';
import '../models/performance_evaluation.dart';
import 'api_service.dart';

/// Serviço de Avaliações de Desempenho.
///
/// Consulta o endpoint REST /api/performance-evaluations/employee/{id}
/// para obter as avaliações de desempenho de um funcionário.
class EvaluationService {
  final ApiService _api = ApiService();

  /// Busca avaliações de desempenho de um funcionário pelo ID.
  Future<List<PerformanceEvaluation>> getByEmployeeId(
      String employeeId) async {
    final uri = '${ApiConfig.performanceEvaluations}/employee/$employeeId';
    final response = await _api.get(uri, silent: true);

    if (!response.success || response.data == null) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => PerformanceEvaluation.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    // Caso venha como Map com conteúdo (ex: paginação futura)
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => PerformanceEvaluation.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }
}
