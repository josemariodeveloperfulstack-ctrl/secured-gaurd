import '../config/api_config.dart';
import '../models/work_post.dart';
import 'api_service.dart';

/// Serviço de Postos de Trabalho para o Supervisor.
class WorkPostService {
  final ApiService _api = ApiService();

  /// Busca todos os postos de trabalho.
  Future<List<WorkPost>> getAllWorkPosts() async {
    final response = await _api.get(ApiConfig.workPostsAll, silent: true);

    if (!response.success) return [];

    final dynamic rawData = response.data;
    final List<dynamic> list;

    if (rawData is List) {
      list = rawData;
    } else if (rawData is Map && rawData['content'] is List) {
      list = rawData['content'] as List<dynamic>;
    } else {
      return [];
    }

    return list
        .map((e) => WorkPost.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Busca Posto de Trabalho pelo código (usado no QR Code).
  Future<WorkPost?> getWorkPostByCode(String postCode) async {
    final uri = '${ApiConfig.workPostsByCode}/${Uri.encodeComponent(postCode)}';
    final response = await _api.get(uri, silent: true);

    if (response.success && response.data != null) {
      return WorkPost.fromJson(response.data!);
    }
    return null;
  }

  /// Busca Posto de Trabalho pelo ID.
  Future<WorkPost?> getWorkPostById(String id) async {
    final uri = '${ApiConfig.workPosts}/$id';
    final response = await _api.get(uri, silent: true);

    if (response.success && response.data != null) {
      return WorkPost.fromJson(response.data!);
    }
    return null;
  }

  /// Busca estatísticas de postos (contadores por status).
  Future<Map<String, int>> getWorkPostStats() async {
    final response = await _api.get(ApiConfig.workPostsStats, silent: true);

    if (response.success && response.data != null) {
      final data = response.data!;
      return {
        'ativo': data['ativo'] as int? ?? 0,
        'inativo': data['inativo'] as int? ?? 0,
        'emImplantacao': data['emImplantacao'] as int? ?? 0,
        'suspenso': data['suspenso'] as int? ?? 0,
        'cancelado': data['cancelado'] as int? ?? 0,
        'emAnalise': data['emAnalise'] as int? ?? 0,
        'pendente': data['pendente'] as int? ?? 0,
      };
    }
    return {};
  }
}
