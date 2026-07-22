/// Modelo de Escala de Trabalho.
class Schedule {
  final String id;
  final String? employeeId;
  final String? employeeName;
  final String? employeeDocument;
  final String? scheduleDate;
  final String shift;
  final String? locationId;
  final String? locationName;
  final String? workPostId;
  final String? workPostName;
  final String? workPostCode;
  final String? clientId;
  final String? clientName;
  final String status;
  final String? observations;
  final bool isMonitoria;
  final bool isHoraExtra;
  final String? sigla;
  final String? createdAt;
  final String? updatedAt;

  Schedule({
    required this.id,
    this.employeeId,
    this.employeeName,
    this.employeeDocument,
    this.scheduleDate,
    this.shift = 'DAY',
    this.locationId,
    this.locationName,
    this.workPostId,
    this.workPostName,
    this.workPostCode,
    this.clientId,
    this.clientName,
    this.status = 'PENDING',
    this.observations,
    this.isMonitoria = false,
    this.isHoraExtra = false,
    this.sigla,
    this.createdAt,
    this.updatedAt,
  });

  factory Schedule.fromJson(Map<String, dynamic> json) {
    return Schedule(
      id: json['id'] as String? ?? '',
      employeeId: _extractId(json['employeeId'], json['employee']),
      employeeName: _extractName(json['employeeName'], json['employee']),
      employeeDocument: json['employeeDocument'] as String?,
      scheduleDate: json['scheduleDate'] as String?,
      shift: json['shift'] as String? ?? 'DAY',
      locationId: json['locationId'] as String?,
      locationName: json['locationName'] as String?,
      workPostId: json['workPostId'] as String?,
      workPostName: json['workPostName'] as String?,
      workPostCode: json['workPostCode'] as String?,
      clientId: json['clientId'] as String?,
      clientName: json['clientName'] as String?,
      status: json['status'] as String? ?? 'PENDING',
      observations: json['observations'] as String?,
      isMonitoria: json['isMonitoria'] as bool? ?? false,
      isHoraExtra: json['isHoraExtra'] as bool? ?? false,
      sigla: json['sigla'] as String?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
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

  String get displayShift {
    switch (shift.toUpperCase()) {
      case 'DAY':
        return 'Diurno';
      case 'NIGHT':
        return 'Noturno';
      case 'MIXED':
        return 'Misto';
      default:
        return shift;
    }
  }

  String get displayStatus {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'Pendente';
      case 'CONFIRMED':
        return 'Confirmada';
      case 'CANCELLED':
        return 'Cancelada';
      case 'COMPLETED':
        return 'Concluída';
      default:
        return status;
    }
  }

  String get formattedDate {
    if (scheduleDate == null) return '--';
    try {
      final dt = DateTime.parse(scheduleDate!);
      final weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      final months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                       'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return '${weekdays[dt.weekday - 1]}, ${dt.day} ${months[dt.month - 1]} ${dt.year}';
    } catch (_) {
      return scheduleDate!;
    }
  }
}
