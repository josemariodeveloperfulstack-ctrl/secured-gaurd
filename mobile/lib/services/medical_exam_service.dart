import '../config/api_config.dart';
import '../models/medical_exam.dart';
import 'api_service.dart';

/// Serviço de Exames Médicos (ASO) do RH/SST.
class MedicalExamService {
  final ApiService _api = ApiService();

  /// Busca exames por funcionário.
  Future<List<MedicalExam>> getByEmployeeId(String employeeId) async {
    final uri = '${ApiConfig.sstMedicalExams}/employee/$employeeId';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => MedicalExam.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => MedicalExam.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca todos os exames.
  Future<List<MedicalExam>> getAll() async {
    final response = await _api.get(ApiConfig.sstMedicalExams, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => MedicalExam.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => MedicalExam.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca exames vencidos.
  Future<List<MedicalExam>> getExpired() async {
    final uri = '${ApiConfig.sstMedicalExams}/expired';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => MedicalExam.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca exames próximos do vencimento.
  Future<List<MedicalExam>> getExpiring({int daysAhead = 30}) async {
    final uri = '${ApiConfig.sstMedicalExams}/expiring?daysAhead=$daysAhead';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => MedicalExam.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }
}
