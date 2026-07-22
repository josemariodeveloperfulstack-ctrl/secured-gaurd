import '../config/api_config.dart';
import '../models/message.dart';
import 'api_service.dart';

/// Serviço de Mensagens.
class MessageService {
  final ApiService _api = ApiService();

  /// Busca mensagens recebidas.
  Future<List<EmployeeMessage>> getReceivedMessages({int page = 0, int size = 20}) async {
    final response = await _api.get(
      '${ApiConfig.messages}/received',
      queryParams: {'page': '$page', 'size': '$size'},
      silent: true,
    );

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => EmployeeMessage.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => EmployeeMessage.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca mensagens enviadas.
  Future<List<EmployeeMessage>> getSentMessages({int page = 0, int size = 20}) async {
    final response = await _api.get(
      '${ApiConfig.messages}/sent',
      queryParams: {'page': '$page', 'size': '$size'},
      silent: true,
    );

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => EmployeeMessage.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .map((e) => EmployeeMessage.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca mensagens não lidas.
  Future<List<EmployeeMessage>> getUnreadMessages() async {
    final response = await _api.get(
      '${ApiConfig.messages}/unread',
      silent: true,
    );

    if (!response.success) return [];

    final dynamic data = response.data;
    if (data is List) {
      return data
          .map((e) => EmployeeMessage.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Busca contagem de mensagens não lidas.
  Future<int> getUnreadCount() async {
    final response = await _api.get(
      '${ApiConfig.messages}/unread/count',
      silent: true,
    );
    if (response.success && response.data != null) {
      return (response.data!['data'] as int?) ?? 0;
    }
    return 0;
  }

  /// Marca mensagem como lida.
  Future<bool> markAsRead(String messageId) async {
    final uri = '${ApiConfig.messages}/$messageId/read';
    final response = await _api.put(uri, silent: true);
    return response.success;
  }

  /// Envia uma mensagem.
  Future<bool> sendMessage(String title, String content, String type) async {
    final response = await _api.post(
      ApiConfig.messages,
      body: {
        'title': title,
        'content': content,
        'type': type,
      },
    );
    return response.success;
  }
}
