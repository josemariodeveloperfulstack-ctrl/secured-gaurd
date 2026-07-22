import '../config/api_config.dart';
import '../models/support_ticket.dart';
import 'api_service.dart';

/// Serviço de Suporte RH.
class SupportService {
  final ApiService _api = ApiService();

  /// Busca tickets de suporte do funcionário.
  Future<List<SupportTicket>> getMyTickets() async {
    final response = await _api.get(ApiConfig.supportTickets, silent: true);

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => SupportTicket.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => SupportTicket.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Cria um novo ticket de suporte.
  Future<bool> createTicket(SupportTicket ticket) async {
    final response = await _api.post(
      ApiConfig.supportTickets,
      body: ticket.toJson(),
    );
    return response.success;
  }
}
