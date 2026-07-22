import '../config/api_config.dart';
import '../models/ronda.dart';
import 'api_service.dart';

/// Serviço de Plantões/Rondas.
class RondaService {
  final ApiService _api = ApiService();

  /// Busca plantões de um funcionário.
  Future<List<Plantao>> getEmployeeRondas(String employeeId) async {
    final uri = '${ApiConfig.rondas}/employee/$employeeId';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => Plantao.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => Plantao.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca todos os plantões (fallback).
  Future<List<Plantao>> getAllRondas() async {
    final response = await _api.get(ApiConfig.rondas, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => Plantao.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => Plantao.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca plantões por status.
  Future<List<Plantao>> getRondasByStatus(String status) async {
    final uri = '${ApiConfig.rondas}/status/$status';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => Plantao.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }
}
