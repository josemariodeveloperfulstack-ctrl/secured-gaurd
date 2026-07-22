import '../models/training.dart';
import 'api_service.dart';

/// Serviço de Treinamentos.
class TrainingService {
  final ApiService _api = ApiService();

  /// Busca todos os treinamentos.
  Future<List<EmployeeTraining>> getAllTrainings() async {
    final response = await _api.get('/api/trainings', silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => EmployeeTraining.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => EmployeeTraining.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }
}
