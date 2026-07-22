/// Modelo de Ocorrência Operacional.
class OperationalOccurrence {
  final String id;
  final String type;
  final String title;
  final String? description;
  final String? employeeId;
  final String? employeeName;
  final String? location;
  final String status;
  final String priority;
  final String? date;
  final String? responsible;
  final int? warningNumber;
  final String? createdAt;
  final String? updatedAt;
  final String? substituteId;
  final String? substituteName;
  final String? originalStartTime;
  final String? originalEndTime;
  final String? substituteStartTime;
  final String? substituteEndTime;
  final double? totalHours;
  final String? category;

  OperationalOccurrence({
    required this.id,
    required this.type,
    required this.title,
    this.description,
    this.employeeId,
    this.employeeName,
    this.location,
    this.status = 'PENDENTE',
    this.priority = 'MEDIA',
    this.date,
    this.responsible,
    this.warningNumber,
    this.createdAt,
    this.updatedAt,
    this.substituteId,
    this.substituteName,
    this.originalStartTime,
    this.originalEndTime,
    this.substituteStartTime,
    this.substituteEndTime,
    this.totalHours,
    this.category,
  });

  factory OperationalOccurrence.fromJson(Map<String, dynamic> json) {
    return OperationalOccurrence(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? 'OUTROS',
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      employeeId: _extractId(json['employeeId'], json['employee']),
      employeeName: _extractName(json['employeeName'], json['employee']),
      location: json['location'] as String?,
      status: json['status'] as String? ?? 'PENDENTE',
      priority: json['priority'] as String? ?? 'MEDIA',
      date: json['date'] as String?,
      responsible: json['responsible'] as String?,
      warningNumber: json['warningNumber'] as int?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
      substituteId: json['substituteId'] as String?,
      substituteName: json['substituteName'] as String?,
      originalStartTime: json['originalStartTime'] as String?,
      originalEndTime: json['originalEndTime'] as String?,
      substituteStartTime: json['substituteStartTime'] as String?,
      substituteEndTime: json['substituteEndTime'] as String?,
      totalHours: (json['totalHours'] as num?)?.toDouble(),
      category: json['category'] as String?,
    );
  }

  static String? _extractId(String? directId, dynamic employee) {
    if (directId != null && directId.isNotEmpty) return directId;
    if (employee is Map) return employee['id'] as String?;
    return null;
  }

  static String? _extractName(String? directName, dynamic employee) {
    if (directName != null && directName.isNotEmpty) return directName;
    if (employee is Map) return employee['name'] as String?;
    return null;
  }

  String get displayType {
    switch (type.toUpperCase()) {
      case 'SEGURANCA':
        return 'Segurança';
      case 'DISCIPLINAR':
        return 'Disciplinar';
      case 'EQUIPAMENTO':
        return 'Equipamento';
      case 'INCIDENTE':
        return 'Incidente';
      case 'MANUTENCAO':
        return 'Manutenção';
      case 'FALTA':
        return 'Falta';
      case 'TROCA':
        return 'Troca';
      case 'HE':
        return 'Hora Extra';
      case 'FREE_LANCE':
        return 'Free Lance';
      case 'PEDIDO_DEMISSAO':
        return 'Pedido Demissão';
      case 'FALTA_EFETIVO':
        return 'Falta Efetivo';
      case 'SOLICITACAO_CLIENTE':
        return 'Solicitação Cliente';
      default:
        return type;
    }
  }

  String get displayStatus {
    switch (status.toUpperCase()) {
      case 'PENDENTE':
        return 'Pendente';
      case 'EM_ANDAMENTO':
        return 'Em Andamento';
      case 'RESOLVIDO':
        return 'Resolvido';
      case 'CONCLUIDO':
        return 'Concluído';
      default:
        return status;
    }
  }

  String get displayPriority {
    switch (priority.toUpperCase()) {
      case 'ALTA':
      case 'HIGH':
        return 'Alta';
      case 'MEDIA':
      case 'MEDIUM':
        return 'Média';
      case 'BAIXA':
      case 'LOW':
        return 'Baixa';
      default:
        return priority;
    }
  }

  String get formattedDate {
    if (date == null) return '--';
    try {
      final dt = DateTime.parse(date!);
      final day = dt.day.toString().padLeft(2, '0');
      final month = dt.month.toString().padLeft(2, '0');
      final hour = dt.hour.toString().padLeft(2, '0');
      final min = dt.minute.toString().padLeft(2, '0');
      return '$day/$month/${dt.year} $hour:$min';
    } catch (_) {
      return date!;
    }
  }

  String get formattedCreatedAt {
    if (createdAt == null) return '--';
    try {
      final dt = DateTime.parse(createdAt!);
      final day = dt.day.toString().padLeft(2, '0');
      final month = dt.month.toString().padLeft(2, '0');
      return '${day}/${month}/${dt.year}';
    } catch (_) {
      return createdAt!;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'title': title,
      'description': description,
      'employeeId': employeeId,
      'location': location,
      'status': status,
      'priority': priority,
      'date': date,
      'responsible': responsible,
      'warningNumber': warningNumber,
      'category': category,
    };
  }
}
