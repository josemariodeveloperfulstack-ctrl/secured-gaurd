/// Modelo de Mensagem.
class EmployeeMessage {
  final String id;
  final String title;
  final String content;
  final String? type;
  final String? priority;
  final MessageStatus status;
  final String? senderId;
  final String? senderName;
  final String? sentAt;
  final String? readAt;

  EmployeeMessage({
    required this.id,
    required this.title,
    required this.content,
    this.type,
    this.priority,
    this.status = MessageStatus.unread,
    this.senderId,
    this.senderName,
    this.sentAt,
    this.readAt,
  });

  factory EmployeeMessage.fromJson(Map<String, dynamic> json) {
    return EmployeeMessage(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      content: json['content'] as String? ?? '',
      type: json['type'] as String?,
      priority: json['priority'] as String?,
      status: _parseStatus(json['status'] as String? ?? 'UNREAD'),
      senderId: json['sender'] is Map ? json['sender']['id'] as String? : null,
      senderName: json['sender'] is Map ? json['sender']['name'] as String? : null,
      sentAt: json['sentAt'] as String? ?? json['createdAt'] as String?,
      readAt: json['readAt'] as String?,
    );
  }

  static MessageStatus _parseStatus(String value) {
    switch (value.toUpperCase()) {
      case 'UNREAD':
        return MessageStatus.unread;
      case 'READ':
        return MessageStatus.read;
      case 'ARCHIVED':
        return MessageStatus.archived;
      default:
        return MessageStatus.unread;
    }
  }

  String get displayStatus {
    switch (status) {
      case MessageStatus.unread:
        return 'Não lida';
      case MessageStatus.read:
        return 'Lida';
      case MessageStatus.archived:
        return 'Arquivada';
    }
  }

  String get formattedDate {
    if (sentAt == null) return '--';
    try {
      final dt = DateTime.parse(sentAt!);
      final now = DateTime.now();
      if (dt.day == now.day && dt.month == now.month && dt.year == now.year) {
        return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
      }
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}';
    } catch (_) {
      return sentAt!;
    }
  }

  String get preview => content.length > 80 ? '${content.substring(0, 80)}...' : content;
}

enum MessageStatus {
  unread,
  read,
  archived;
}
