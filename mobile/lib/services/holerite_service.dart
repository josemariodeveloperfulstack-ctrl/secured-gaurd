import '../config/api_config.dart';
import '../models/holerite.dart';
import 'api_service.dart';

/// Serviço de holerites (contracheques).
class HoleriteService {
  final ApiService _api = ApiService();

  /// Busca holerites do usuário autenticado.
  Future<List<Holerite>> getMyHolerites() async {
    final response = await _api.get('${ApiConfig.payslips}/me');
    if (response.success && response.data != null) {
      // Pode vir como lista direta ou dentro de 'data'
      final list = _extractList(response.data!);
      return list.map((e) => Holerite.fromJson(e)).toList();
    }
    return [];
  }

  /// Busca todos os holerites (admin/rh).
  Future<List<Holerite>> getAllHolerites() async {
    final response = await _api.get(ApiConfig.payslips);
    if (response.success && response.data != null) {
      final list = _extractList(response.data!);
      return list.map((e) => Holerite.fromJson(e)).toList();
    }
    return [];
  }

  /// Busca holerites por ano.
  Future<List<Holerite>> getHoleritesByYear(int year) async {
    final response = await _api.get('${ApiConfig.payslips}/year/$year');
    if (response.success && response.data != null) {
      final list = _extractList(response.data!);
      return list.map((e) => Holerite.fromJson(e)).toList();
    }
    return [];
  }

  /// Busca holerites por ano e mês.
  Future<List<Holerite>> getHoleritesByYearAndMonth(
      int year, int month) async {
    final response =
        await _api.get('${ApiConfig.payslips}/year/$year/month/$month');
    if (response.success && response.data != null) {
      final list = _extractList(response.data!);
      return list.map((e) => Holerite.fromJson(e)).toList();
    }
    return [];
  }

  /// Download de holerite por ID. Retorna bytes do PDF.
  Future<List<int>> downloadHoleriteById(String id) async {
    final response =
        await _api.get('${ApiConfig.payslips}/download-by-id/$id');
    if (response.rawBody != null) {
      return response.rawBody!.codeUnits;
    }
    throw Exception('Erro ao baixar holerite');
  }

  /// Download de holerite por nome de arquivo. Retorna bytes do PDF.
  Future<List<int>> downloadHolerite(String fileName) async {
    final response =
        await _api.get('${ApiConfig.payslips}/download/$fileName');
    if (response.rawBody != null) {
      return response.rawBody!.codeUnits;
    }
    throw Exception('Erro ao baixar holerite');
  }

  /// Extrai lista de dados da resposta, que pode vir em formatos diferentes.
  List<Map<String, dynamic>> _extractList(Map<String, dynamic> json) {
    // Tentar como array direto
    if (json.containsKey('data') && json['data'] is List) {
      return (json['data'] as List)
          .map((e) => e as Map<String, dynamic>)
          .toList();
    }
    // Tentar como array em 'content' (paginação)
    if (json.containsKey('content') && json['content'] is List) {
      return (json['content'] as List)
          .map((e) => e as Map<String, dynamic>)
          .toList();
    }
    // Tentar converter valores
    final values = json.values.whereType<List>();
    for (final list in values) {
      if (list.isNotEmpty && list.first is Map<String, dynamic>) {
        return list.cast<Map<String, dynamic>>();
      }
    }
    return [];
  }
}
