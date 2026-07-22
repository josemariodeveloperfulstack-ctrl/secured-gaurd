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
      workPostCode: json['workPostCode'] as String?,
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
class VisitStats {
  final int totalVisits;
  final int todayVisits;
  final int inProgress;
  final int completed;
  final int scheduled;
  final int cancelled;

  VisitStats({
    this.totalVisits = 0,
    this.todayVisits = 0,
    this.inProgress = 0,
    this.completed = 0,
    this.scheduled = 0,
    this.cancelled = 0,
  });

  factory VisitStats.fromJson(Map<String, dynamic> json) {
    return VisitStats(
      totalVisits: json['totalVisits'] as int? ?? 0,
      todayVisits: json['todayVisits'] as int? ?? 0,
      inProgress: json['inProgress'] as int? ?? 0,
      completed: json['completed'] as int? ?? 0,
      scheduled: json['scheduled'] as int? ?? 0,
      cancelled: json['cancelled'] as int? ?? 0,
    );
  }
}
