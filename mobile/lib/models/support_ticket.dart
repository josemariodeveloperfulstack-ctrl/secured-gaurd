/// Modelo de Ticket de Suporte RH.
class SupportTicket {
  final String id;
  final String title;
  final String description;
  final String? priority;
  final TicketStatus status;
  final String? category;
  final String? customerName;
  final String? customerEmail;
  final String? createdAt;
  final String? updatedAt;

  SupportTicket({
    required this.id,
    required this.title,
    required this.description,
    this.priority,
    this.status = TicketStatus.open,
    this.category,
    this.customerName,
    this.customerEmail,
    this.createdAt,
    this.updatedAt,
  });

  factory SupportTicket.fromJson(Map<String, dynamic> json) {
    return SupportTicket(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      priority: json['priority'] as String?,
      status: _parseStatus(json['status'] as String? ?? 'OPEN'),
      category: json['category'] as String?,
      customerName: json['customerName'] as String?,
      customerEmail: json['customerEmail'] as String?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'title': title,
        'description': description,
        'priority': priority ?? 'NORMAL',
        'category': category ?? 'OUTROS',
        'customerName': customerName,
        'customerEmail': customerEmail,
      };

  static TicketStatus _parseStatus(String value) {
    switch (value.toUpperCase()) {
      case 'OPEN':
        return TicketStatus.open;
      case 'IN_PROGRESS':
        return TicketStatus.inProgress;
      case 'RESOLVED':
        return TicketStatus.resolved;
      case 'CLOSED':
        return TicketStatus.closed;
      default:
        return TicketStatus.open;
    }
  }

  String get displayStatus {
    switch (status) {
      case TicketStatus.open:
        return 'Aberto';
      case TicketStatus.inProgress:
        return 'Em Andamento';
      case TicketStatus.resolved:
        return 'Resolvido';
      case TicketStatus.closed:
        return 'Fechado';
    }
  }

  String get formattedDate {
    if (createdAt == null) return '--';
    try {
      final dt = DateTime.parse(createdAt!);
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return createdAt!;
    }
  }
}

enum TicketStatus {
  open,
  inProgress,
  resolved,
  closed;
}
