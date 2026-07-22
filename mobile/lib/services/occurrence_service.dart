import '../config/api_config.dart';
import '../models/operational_occurrence.dart';
import 'api_service.dart';

/// Serviço de Ocorrências Operacionais.
class OccurrenceService {
  final ApiService _api = ApiService();

  /// Busca todas as ocorrências.
  Future<List<OperationalOccurrence>> getAll() async {
    final response = await _api.get(ApiConfig.occurrences, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => OperationalOccurrence.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => OperationalOccurrence.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca ocorrências por funcionário.
  Future<List<OperationalOccurrence>> getByEmployeeId(String employeeId) async {
    final uri = '${ApiConfig.occurrences}/employee/$employeeId';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => OperationalOccurrence.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca ocorrências por tipo.
  Future<List<OperationalOccurrence>> getByType(String type) async {
    final uri = '${ApiConfig.operationalOccurrences}/type/$type';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => OperationalOccurrence.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca ocorrências por status.
  Future<List<OperationalOccurrence>> getByStatus(String status) async {
    final uri = '${ApiConfig.occurrences}/status/$status';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => OperationalOccurrence.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca ocorrências por prioridade.
  Future<List<OperationalOccurrence>> getByPriority(String priority) async {
    final uri = '${ApiConfig.operationalOccurrences}/priority/$priority';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => OperationalOccurrence.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca ocorrências pendentes.
  Future<List<OperationalOccurrence>> getPending() async {
    final uri = '${ApiConfig.operationalOccurrences}/pending';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => OperationalOccurrence.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca ocorrências por período.
  Future<List<OperationalOccurrence>> getByPeriod(
      String startDate, String endDate) async {
    final uri =
        '${ApiConfig.operationalOccurrences}/period?startDate=${Uri.encodeComponent(startDate)}&endDate=${Uri.encodeComponent(endDate)}';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => OperationalOccurrence.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca uma ocorrência por ID.
  Future<OperationalOccurrence?> getById(String id) async {
    final uri = '${ApiConfig.occurrences}/$id';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return null;

    if (response.data is Map) {
      return OperationalOccurrence.fromJson(
          response.data as Map<String, dynamic>);
    }
    return null;
  }

  /// Cria uma nova ocorrência.
  Future<bool> create(OperationalOccurrence occurrence) async {
    final response = await _api.post(
      ApiConfig.occurrences,
      body: occurrence.toJson(),
    );
    return response.success;
  }

  /// Atualiza uma ocorrência existente.
  Future<bool> update(String id, OperationalOccurrence occurrence) async {
    final uri = '${ApiConfig.occurrences}/$id';
    final response = await _api.put(uri, body: occurrence.toJson());
    return response.success;
  }

  /// Atualiza o status de uma ocorrência.
  Future<bool> updateStatus(String id, String newStatus) async {
    final uri =
        '${ApiConfig.operationalOccurrences}/$id/status?newStatus=$newStatus';
    final response = await _api.patch(uri);
    return response.success;
  }

  /// Atualiza a prioridade de uma ocorrência.
  Future<bool> updatePriority(String id, String newPriority) async {
    final uri =
        '${ApiConfig.operationalOccurrences}/$id/priority?newPriority=$newPriority';
    final response = await _api.patch(uri);
    return response.success;
  }

  /// Exclui uma ocorrência.
  Future<bool> delete(String id) async {
    final uri = '${ApiConfig.occurrences}/$id';
    final response = await _api.delete(uri);
    return response.success;
  }
}
