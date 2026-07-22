import '../config/api_config.dart';
import '../models/performance_evaluation.dart';
import 'api_service.dart';

/// Serviço de Avaliações de Desempenho.
///
/// Nota: Este serviço consulta funcionários via /api/employees/{id}
/// para obter dados contextuais. As avaliações de desempenho
/// atualmente não possuem um controller REST próprio. 
/// Quando implementado, os endpoints devem ser atualizados.
class EvaluationService {
  final ApiService _api = ApiService();

  /// Busca avaliações de um funcionário.
  /// Atualmente retorna dados mockados até o endpoint ser implementado.
  Future<List<PerformanceEvaluation>> getByEmployeeId(
      String employeeId) async {
    // Tentar buscar dados do funcionário como fallback
    final employeeUri = '${ApiConfig.employees}/$employeeId';
    final employeeResponse = await _api.get(employeeUri, silent: true);

    // Retornar lista vazia se não conseguir
    if (!employeeResponse.success) return [];

    // Aguardar implementação do endpoint de avaliações
    // TODO: Substituir quando /api/performance-evaluations/employee/{id} for criado
    return [];
  }
}
