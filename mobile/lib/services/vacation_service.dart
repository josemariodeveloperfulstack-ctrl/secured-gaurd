import '../config/api_config.dart';
import '../models/vacation.dart';
import 'api_service.dart';

/// Serviço de férias.
class VacationService {
  final ApiService _api = ApiService();

  /// Busca férias pelo ID do funcionário.
  Future<List<Vacation>> getVacationsByEmployee(String employeeId) async {
    final response =
        await _api.get('${ApiConfig.vacations}/employee/$employeeId');
    if (response.success && response.data != null) {
      final list = _extractList(response.data!);
      return list.map((e) => Vacation.fromJson(e)).toList();
    }
    return [];
  }

  /// Busca todas as férias (admin).
  Future<List<Vacation>> getAllVacations() async {
    final response = await _api.get(ApiConfig.vacations);
    if (response.success && response.data != null) {
      final list = _extractList(response.data!);
      return list.map((e) => Vacation.fromJson(e)).toList();
    }
    return [];
  }

  /// Cria uma nova solicitação de férias.
  Future<Vacation> createVacation(Vacation vacation) async {
    final response = await _api.post(
      ApiConfig.vacations,
      body: vacation.toJson(),
    );
    if (response.success && response.data != null) {
      return Vacation.fromJson(response.data!);
    }
    throw Exception(response.error ?? 'Erro ao criar solicitação de férias');
  }

  /// Cancela uma solicitação de férias.
  Future<Vacation> cancelVacation(String id) async {
    final response = await _api.put('${ApiConfig.vacations}/$id/cancel');
    if (response.success && response.data != null) {
      return Vacation.fromJson(response.data!);
    }
    throw Exception(response.error ?? 'Erro ao cancelar férias');
  }

  /// Extrai lista de dados da resposta.
  List<Map<String, dynamic>> _extractList(Map<String, dynamic> json) {
    if (json.containsKey('data') && json['data'] is List) {
      return (json['data'] as List)
          .map((e) => e as Map<String, dynamic>)
          .toList();
    }
    if (json.containsKey('content') && json['content'] is List) {
      return (json['content'] as List)
          .map((e) => e as Map<String, dynamic>)
          .toList();
    }
    final values = json.values.whereType<List>();
    for (final list in values) {
      if (list.isNotEmpty && list.first is Map<String, dynamic>) {
        return list.cast<Map<String, dynamic>>();
      }
    }
    return [];
  }
}
