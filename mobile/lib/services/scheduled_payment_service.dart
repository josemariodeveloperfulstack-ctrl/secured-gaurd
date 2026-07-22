import '../config/api_config.dart';
import '../models/scheduled_payment.dart';
import 'api_service.dart';

/// Serviço de Pagamentos Agendados.
class ScheduledPaymentService {
  final ApiService _api = ApiService();

  /// Busca todos os pagamentos agendados.
  Future<List<ScheduledPayment>> getAll() async {
    final uri = '${ApiConfig.scheduledPayments}/all';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => ScheduledPayment.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => ScheduledPayment.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca pagamentos por status.
  Future<List<ScheduledPayment>> getByStatus(String status) async {
    final uri = '${ApiConfig.scheduledPayments}/status/$status';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => ScheduledPayment.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca pagamentos vencidos.
  Future<List<ScheduledPayment>> getOverdue() async {
    final uri = '${ApiConfig.scheduledPayments}/overdue';
    final response = await _api.get(uri, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => ScheduledPayment.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }
}
