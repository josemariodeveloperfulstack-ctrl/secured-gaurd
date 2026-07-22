/// Modelo de Escala/Rota Semanal de Visitas (VisitSchedule).
class VisitSchedule {
  final String id;
  final String? supervisorId;
  final String? supervisorName;
  final String? clientId;
  final String? clientName;
  final String scheduleDate;
  final String? startTime;
  final String? endTime;
  final ScheduleStatus status;
  final List<String> unitIds;
  final List<String> unitNames;
  final String? observations;
  final String? createdAt;
  final String? updatedAt;

  VisitSchedule({
    required this.id,
    this.supervisorId,
    this.supervisorName,
    this.clientId,
    this.clientName,
    required this.scheduleDate,
    this.startTime,
    this.endTime,
    required this.status,
    this.unitIds = const [],
    this.unitNames = const [],
    this.observations,
    this.createdAt,
    this.updatedAt,
  });

  factory VisitSchedule.fromJson(Map<String, dynamic> json) {
    return VisitSchedule(
      id: json['id'] as String? ?? '',
      supervisorId: json['supervisorId'] as String?,
      supervisorName: json['supervisorName'] as String?,
      clientId: json['clientId'] as String?,
      clientName: json['clientName'] as String?,
      scheduleDate: json['scheduleDate'] as String? ?? '',
      startTime: json['startTime'] as String?,
      endTime: json['endTime'] as String?,
      status: _parseStatus(json['status'] as String? ?? 'SCHEDULED'),
      unitIds: _parseStringList(json['unitIds']),
      unitNames: _parseStringList(json['unitNames']),
      observations: json['observations'] as String?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );
  }

  static List<String> _parseStringList(dynamic value) {
    if (value is List) {
      return value.map((e) => e.toString()).toList();
    }
    return [];
  }

  static ScheduleStatus _parseStatus(String value) {
    switch (value.toUpperCase()) {
      case 'SCHEDULED':
        return ScheduleStatus.scheduled;
      case 'IN_PROGRESS':
        return ScheduleStatus.inProgress;
      case 'COMPLETED':
        return ScheduleStatus.completed;
      case 'CANCELLED':
        return ScheduleStatus.cancelled;
      default:
        return ScheduleStatus.scheduled;
    }
  }

  /// Data formatada para exibição.
  String get formattedDate {
    try {
      final date = DateTime.parse(scheduleDate);
      final months = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ];
      final weekdays = [
        'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'
      ];
      return '${weekdays[date.weekday - 1]}, ${date.day} ${months[date.month - 1]}';
    } catch (_) {
      return scheduleDate;
    }
  }

  String get displayStatus {
    switch (status) {
      case ScheduleStatus.scheduled:
        return 'Agendada';
      case ScheduleStatus.inProgress:
        return 'Em Andamento';
      case ScheduleStatus.completed:
        return 'Concluída';
      case ScheduleStatus.cancelled:
        return 'Cancelada';
    }
  }
}

enum ScheduleStatus {
  scheduled,
  inProgress,
  completed,
  cancelled;
}

/// Relatório de eficiência das visitas.
class EfficiencyReport {
  final double efficiency;
  final int totalVisits;
  final int completedVisits;
  final int cancelledVisits;
  final double averageTimePerVisit;
  final double totalTimeSpent;

  EfficiencyReport({
    this.efficiency = 0,
    this.totalVisits = 0,
    this.completedVisits = 0,
    this.cancelledVisits = 0,
    this.averageTimePerVisit = 0,
    this.totalTimeSpent = 0,
  });

  factory EfficiencyReport.fromJson(Map<String, dynamic> json) {
    return EfficiencyReport(
      efficiency: (json['efficiency'] as num?)?.toDouble() ?? 0,
      totalVisits: json['totalVisits'] as int? ?? 0,
      completedVisits: json['completedVisits'] as int? ?? 0,
      cancelledVisits: json['cancelledVisits'] as int? ?? 0,
      averageTimePerVisit: (json['averageTimePerVisit'] as num?)?.toDouble() ?? 0,
      totalTimeSpent: (json['totalTimeSpent'] as num?)?.toDouble() ?? 0,
    );
  }
}
