import '../config/api_config.dart';
import '../models/supervisor_visit.dart';
import '../models/supervisor_visit_preview.dart';
import 'api_service.dart';

/// Serviço de Controle de Visitas do Supervisor.
///
/// Mantém compatibilidade com o sistema legado [VisitControlController]
/// e adiciona o novo fluxo [SupervisorVisitController] (preview + checkin).
class SupervisorVisitService {
  final ApiService _api = ApiService();

  // ═══════════════════════════════════════════════
  // NOVO FLUXO: SupervisorVisit (preview + checkin)
  // ═══════════════════════════════════════════════

  /// Preview: confirma posto + funcionário + vínculo SEM gravar.
  ///
  /// Retorna [SupervisorVisitCheckinResponse] com os dados do posto,
  /// funcionário identificado e tipo de alocação (efetivo/remanejado/cobertura).
  Future<SupervisorVisitCheckinResponse?> previewCheckin(
      SupervisorVisitCheckinRequest request) async {
    final response = await _api.post(
      ApiConfig.supervisorVisitPreview,
      body: request.toJson(),
    );

    if (!response.success || response.data == null) return null;

    // O backend retorna { success: true, data: { ... } }
    final raw = response.data;
    if (raw is Map<String, dynamic>) {
      final nested = raw['data'];
      if (nested is Map<String, dynamic>) {
        return SupervisorVisitCheckinResponse.fromJson(nested);
      }
    }
    return null;
  }

  /// Check-in: grava a visita com geolocalização e endereço.
  ///
  /// Retorna [SupervisorVisitCheckinResponse] com visitId preenchido.
  Future<SupervisorVisitCheckinResponse?> doCheckin(
      SupervisorVisitCheckinRequest request) async {
    final response = await _api.post(
      ApiConfig.supervisorVisitCheckin,
      body: request.toJson(),
    );

    if (!response.success || response.data == null) return null;

    // O backend retorna { success: true, message: "...", data: { ... } }
    final raw = response.data;
    if (raw is Map<String, dynamic>) {
      final nested = raw['data'];
      if (nested is Map<String, dynamic>) {
        return SupervisorVisitCheckinResponse.fromJson(nested);
      }
    }
    return null;
  }

  // ═══════════════════════════════════════════════
  // FLUXO LEGADO: VisitControl (listar/gerenciar visitas)
  // ═══════════════════════════════════════════════

  /// Busca visitas do dia de hoje.
  Future<List<SupervisorVisit>> getTodayVisits() async {
    final response = await _api.get(ApiConfig.visitControlsToday, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => SupervisorVisit.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => SupervisorVisit.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca visitas recentes.
  Future<List<SupervisorVisit>> getRecentVisits() async {
    final response =
        await _api.get(ApiConfig.visitControlsRecent, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => SupervisorVisit.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca visitas de um supervisor específico.
  Future<List<SupervisorVisit>> getVisitsBySupervisor(
      String supervisorId) async {
    final uri = '${ApiConfig.visitControlsBySupervisor}/$supervisorId';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => SupervisorVisit.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca estatísticas de visitas.
  Future<VisitStats> getVisitStats() async {
    final response =
        await _api.get(ApiConfig.visitControlsStats, silent: true);

    if (response.success && response.data != null) {
      return VisitStats.fromJson(response.data!);
    }
    return VisitStats();
  }

  /// Busca visitas filtradas.
  Future<List<SupervisorVisit>> getFilteredVisits({
    String? workPostId,
    VisitStatus? status,
    String? startDate,
    String? endDate,
  }) async {
    final params = <String, String>{};
    if (workPostId != null) params['workPostId'] = workPostId;
    if (status != null) params['status'] = status.name;
    if (startDate != null) params['startDate'] = startDate;
    if (endDate != null) params['endDate'] = endDate;

    final response = await _api.get(
      ApiConfig.visitControlsFiltered,
      queryParams: params.isNotEmpty ? params : null,
      silent: true,
    );

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => SupervisorVisit.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Cria uma nova visita (legado).
  Future<SupervisorVisit?> createVisit(
      Map<String, dynamic> visitData) async {
    final response = await _api.post(
      ApiConfig.visitControls,
      body: visitData,
    );

    if (response.success && response.data != null) {
      return SupervisorVisit.fromJson(response.data!);
    }
    return null;
  }

  /// Inicia uma visita (check-in no posto) — legado.
  Future<SupervisorVisit?> startVisit(String visitId) async {
    final uri = '${ApiConfig.visitControls}/$visitId/start';
    final response = await _api.put(uri);

    if (response.success && response.data != null) {
      return SupervisorVisit.fromJson(response.data!);
    }
    return null;
  }

  /// Completa uma visita — legado.
  Future<SupervisorVisit?> completeVisit(
    String visitId, {
    String? findings,
    bool? isSuccessful,
  }) async {
    final params = <String, String>{};
    if (findings != null) params['findings'] = findings;
    if (isSuccessful != null) params['isSuccessful'] = isSuccessful.toString();

    var uri = '${ApiConfig.visitControls}/$visitId/complete';
    if (params.isNotEmpty) {
      uri += '?${params.entries.map((e) => '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}').join('&')}';
    }
    final response = await _api.put(uri);

    if (response.success && response.data != null) {
      return SupervisorVisit.fromJson(response.data!);
    }
    return null;
  }

  /// Busca funcionário no posto de trabalho (por CPF ou matrícula) — legado.
  Future<Map<String, dynamic>?> findEmployeeAtPost({
    String? cpf,
    String? registrationNumber,
    required String workPostId,
  }) async {
    final params = <String, String>{
      'workPostId': workPostId,
    };
    if (cpf != null) params['cpf'] = cpf;
    if (registrationNumber != null) {
      params['registrationNumber'] = registrationNumber;
    }

    final response = await _api.get(
      ApiConfig.visitControlsFindEmployee,
      queryParams: params,
      silent: true,
    );

    if (response.success && response.data != null) {
      return response.data;
    }
    return null;
  }
}

