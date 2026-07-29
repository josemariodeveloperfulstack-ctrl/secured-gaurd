/// Modelo de Visita de Supervisor (VisitControl).
///
/// Mapeia o DTO `VisitControlDTO` do backend.
class SupervisorVisit {
  final String id;
  final String? location;
  final String? assignedTo;
  final String? supervisorId;
  final String? supervisorName;
  final String? workPostId;
  final String? workPostName;
  final String? workPostCode;
  final String visitDate;
  final String? scheduledAt;
  final String? startedAt;
  final String? completedAt;
  final VisitStatus status;
  final String? observations;
  final String? findings;
  final bool? isSuccessful;
  final String? createdBy;
  final String? createdByName;
  final String? createdAt;
  final String? updatedAt;

  SupervisorVisit({
    required this.id,
    this.location,
    this.assignedTo,
    this.supervisorId,
    this.supervisorName,
    this.workPostId,
    this.workPostName,
    this.workPostCode,
    required this.visitDate,
    this.scheduledAt,
    this.startedAt,
    this.completedAt,
    required this.status,
    this.observations,
    this.findings,
    this.isSuccessful,
    this.createdBy,
    this.createdByName,
    this.createdAt,
    this.updatedAt,
  });

  factory SupervisorVisit.fromJson(Map<String, dynamic> json) {
    return SupervisorVisit(
      id: json['id'] as String? ?? '',
      location: json['location'] as String?,
      assignedTo: json['assignedTo'] as String?,
      supervisorId: json['supervisorId'] as String?,
      supervisorName: json['supervisorName'] as String?,
      workPostId: json['workPostId'] as String?,
      workPostName: json['workPostName'] as String?,
      workPostCode: json['workPostCode'] as String? ??
          (json['workPost'] is Map ? json['workPost']['postCode'] as String? : null),
      visitDate: json['visitDate'] as String? ?? '',
      scheduledAt: json['scheduledAt'] as String?,
      startedAt: json['startedAt'] as String?,
      completedAt: json['completedAt'] as String?,
      status: _parseStatus(json['status'] as String? ?? 'SCHEDULED'),
      observations: json['observations'] as String?,
      findings: json['findings'] as String?,
      isSuccessful: json['isSuccessful'] as bool?,
      createdBy: json['createdBy'] as String?,
      createdByName: json['createdByName'] as String?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'location': location,
        'assignedTo': assignedTo,
        'supervisorId': supervisorId,
        'supervisorName': supervisorName,
        'workPostId': workPostId,
        'workPostName': workPostName,
        'workPostCode': workPostCode,
        'visitDate': visitDate,
        'scheduledAt': scheduledAt,
        'startedAt': startedAt,
        'completedAt': completedAt,
        'status': status.name,
        'observations': observations,
        'findings': findings,
        'isSuccessful': isSuccessful,
        'createdBy': createdBy,
        'createdByName': createdByName,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };

  static VisitStatus _parseStatus(String value) {
    switch (value.toUpperCase()) {
      case 'SCHEDULED':
        return VisitStatus.scheduled;
      case 'IN_PROGRESS':
        return VisitStatus.inProgress;
      case 'COMPLETED':
        return VisitStatus.completed;
      case 'CANCELLED':
        return VisitStatus.cancelled;
      case 'PENDING':
        return VisitStatus.pending;
      default:
        return VisitStatus.scheduled;
    }
  }

  /// Status formatado em português.
  String get displayStatus {
    switch (status) {
      case VisitStatus.scheduled:
        return 'Agendada';
      case VisitStatus.inProgress:
        return 'Em Andamento';
      case VisitStatus.completed:
        return 'Concluída';
      case VisitStatus.cancelled:
        return 'Cancelada';
      case VisitStatus.pending:
        return 'Pendente';
    }
  }
}

enum VisitStatus {
  scheduled,
  inProgress,
  completed,
  cancelled,
  pending;

  String get name {
    switch (this) {
      case VisitStatus.scheduled:
        return 'SCHEDULED';
      case VisitStatus.inProgress:
        return 'IN_PROGRESS';
      case VisitStatus.completed:
        return 'COMPLETED';
      case VisitStatus.cancelled:
        return 'CANCELLED';
      case VisitStatus.pending:
        return 'PENDING';
    }
  }
}

/// Estatísticas de visitas (VisitControlStatsDTO).
///
/// Mapeia os campos retornados pelo backend:
/// - `today` → total de visitas de hoje
/// - `completed` → visitas concluídas
/// - `pending` → visitas pendentes (não concluídas)
/// - `successRate` → taxa de sucesso (0.0 a 1.0)
/// - `activeSupervisors` → supervisores ativos
class VisitStats {
  /// Total de visitas hoje (campo `today` do backend).
  final int todayVisits;

  /// Visitas concluídas (campo `completed` do backend).
  final int completed;

  /// Visitas pendentes/não concluídas (campo `pending` do backend).
  /// Exibe como "Em Andamento" no dashboard.
  final int pending;

  /// Taxa de sucesso das visitas (0.0 a 1.0).
  final double successRate;

  /// Número de supervisores ativos.
  final int activeSupervisors;

  /// Total geral (soma de completed + pending).
  int get totalVisits => completed + pending;

  /// Sinônimo de [pending] para compatibilidade com o dashboard.
  int get inProgress => pending;

  /// Sinônimo de [pending] para compatibilidade com o dashboard.
  int get scheduled => pending;

  /// Não fornecido pelo backend — sempre 0.
  int get cancelled => 0;

  VisitStats({
    this.todayVisits = 0,
    this.completed = 0,
    this.pending = 0,
    this.successRate = 0.0,
    this.activeSupervisors = 0,
  });

  factory VisitStats.fromJson(Map<String, dynamic> json) {
    final today = (json['today'] as num?)?.toInt() ?? 0;
    final completed = (json['completed'] as num?)?.toInt() ?? 0;
    final pending = (json['pending'] as num?)?.toInt() ?? 0;

    return VisitStats(
      todayVisits: today,
      completed: completed,
      pending: pending,
      successRate: (json['successRate'] as num?)?.toDouble() ?? 0.0,
      activeSupervisors: (json['activeSupervisors'] as num?)?.toInt() ?? 0,
    );
  }
}
