import '../config/api_config.dart';
import '../models/time_record.dart';
import 'api_service.dart';

/// Serviço de ponto eletrônico.
class TimeRecordService {
  final ApiService _api = ApiService();

  /// Busca os registros de hoje do funcionário.
  Future<List<TimeRecord>> getTodayRecords(String employeeId) async {
    final response =
        await _api.get('${ApiConfig.timeRecords}/today/$employeeId');
    if (response.success && response.data != null) {
      final recordsData = response.data!['data'] as List<dynamic>?;
      if (recordsData != null) {
        return recordsData
            .map((e) => TimeRecord.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    }
    return [];
  }

  /// Busca o próximo tipo de registro (ENTRADA, SAIDA_ALMOCO, etc).
  Future<RecordType> getNextRecordType(String employeeId) async {
    final response =
        await _api.get('${ApiConfig.timeRecords}/next-record-type/$employeeId');
    if (response.success && response.data != null) {
      final typeStr = response.data!['nextRecordType'] as String?;
      if (typeStr != null) {
        return RecordType.fromApi(typeStr);
      }
    }
    return RecordType.entrada;
  }

  /// Registra uma batida de ponto.
  Future<bool> registerTimeRecord({
    required String employeeId,
    required RecordType recordType,
    String? qrCode,
    String? location,
    double? latitude,
    double? longitude,
    String? ipAddress,
    String? userAgent,
  }) async {
    final response = await _api.post(
      '${ApiConfig.timeRecords}/register',
      body: {
        'employeeId': employeeId,
        'recordType': recordType.apiValue,
        if (qrCode != null) 'qrCode': qrCode,
        if (location != null) 'location': location,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        if (ipAddress != null) 'ipAddress': ipAddress,
        if (userAgent != null) 'userAgent': userAgent,
      },
    );

    if (response.success) {
      return true;
    }
    throw Exception(response.error ?? 'Erro ao registrar ponto');
  }

  /// Busca histórico de registros do funcionário.
  Future<List<TimeRecord>> getEmployeeRecords(
    String employeeId, {
    int page = 0,
    int size = 50,
  }) async {
    final response = await _api.get(
      '${ApiConfig.timeRecords}/employee/$employeeId',
      queryParams: {'page': page.toString(), 'size': size.toString()},
    );
    if (response.success && response.data != null) {
      final recordsData = response.data!['data'] as List<dynamic>?;
      if (recordsData != null) {
        return recordsData
            .map((e) => TimeRecord.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    }
    return [];
  }

  /// Busca registros por período.
  Future<List<TimeRecord>> getRecordsByPeriod(
    String employeeId,
    DateTime startDate,
    DateTime endDate,
  ) async {
    final response = await _api.get(
      '${ApiConfig.timeRecords}/period/$employeeId',
      queryParams: {
        'startDate': _formatDate(startDate),
        'endDate': _formatDate(endDate),
      },
    );
    if (response.success && response.data != null) {
      final recordsData = response.data!['data'] as List<dynamic>?;
      if (recordsData != null) {
        return recordsData
            .map((e) => TimeRecord.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    }
    return [];
  }

  /// Gera relatório PDF do ponto mensal.
  Future<List<int>> generateMonthlyReport(
    String employeeId,
    int month,
    int year,
  ) async {
    final response = await _api.get(
      '${ApiConfig.timeRecords}/report/$employeeId',
      queryParams: {
        'month': month.toString(),
        'year': year.toString(),
      },
    );
    if (response.rawBody != null) {
      return response.rawBody!.codeUnits;
    }
    throw Exception('Erro ao gerar relatório');
  }

  String _formatDate(DateTime date) =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
}
