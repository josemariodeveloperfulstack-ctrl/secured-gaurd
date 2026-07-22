import '../config/api_config.dart';
import '../models/schedule.dart';
import 'api_service.dart';

/// Serviço de Escalas de Trabalho.
class ScheduleService {
  final ApiService _api = ApiService();

  /// Busca todas as escalas.
  Future<List<Schedule>> getAll() async {
    final response = await _api.get(ApiConfig.schedules, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => Schedule.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => Schedule.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca escalas por funcionário.
  Future<List<Schedule>> getByEmployeeId(String employeeId) async {
    final uri = '${ApiConfig.schedules}/employee/$employeeId';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => Schedule.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => Schedule.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca escalas por data.
  Future<List<Schedule>> getByDate(String date) async {
    final uri = '${ApiConfig.schedules}/date?date=${Uri.encodeComponent(date)}';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => Schedule.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca escala por ID.
  Future<Schedule?> getById(String id) async {
    final uri = '${ApiConfig.schedules}/$id';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return null;

    if (response.data is Map) {
      return Schedule.fromJson(response.data as Map<String, dynamic>);
    }
    return null;
  }


}
