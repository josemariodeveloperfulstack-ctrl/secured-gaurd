/// Status das férias.
enum VacationStatus {
  pending,
  approved,
  rejected,
  cancelled;

  String get apiValue {
    switch (this) {
      case VacationStatus.pending:
        return 'PENDING';
      case VacationStatus.approved:
        return 'APPROVED';
      case VacationStatus.rejected:
        return 'REJECTED';
      case VacationStatus.cancelled:
        return 'CANCELLED';
    }
  }

  static VacationStatus fromApi(String value) {
    switch (value.toUpperCase()) {
      case 'PENDING':
        return VacationStatus.pending;
      case 'APPROVED':
        return VacationStatus.approved;
      case 'REJECTED':
        return VacationStatus.rejected;
      case 'CANCELLED':
        return VacationStatus.cancelled;
      default:
        return VacationStatus.pending;
    }
  }

  String get displayName {
    switch (this) {
      case VacationStatus.pending:
        return 'Pendente';
      case VacationStatus.approved:
        return 'Aprovado';
      case VacationStatus.rejected:
        return 'Rejeitado';
      case VacationStatus.cancelled:
        return 'Cancelado';
    }
  }
}

/// Modelo de férias.
class Vacation {
  final String id;
  final String employeeId;
  final String? employeeName;
  final DateTime startDate;
  final DateTime endDate;
  final int daysTaken;
  final VacationStatus status;
  final String? vacationType;
  final String? notes;
  final String? createdAt;
  final String? updatedAt;

  Vacation({
    required this.id,
    required this.employeeId,
    this.employeeName,
    required this.startDate,
    required this.endDate,
    this.daysTaken = 30,
    this.status = VacationStatus.pending,
    this.vacationType,
    this.notes,
    this.createdAt,
    this.updatedAt,
  });

  factory Vacation.fromJson(Map<String, dynamic> json) {
    final employee = json['employee'] as Map<String, dynamic>?;

    return Vacation(
      id: json['id']?.toString() ?? '',
      employeeId: json['employeeId']?.toString() ??
          employee?['id']?.toString() ?? '',
      employeeName: json['employeeName'] as String? ??
          employee?['name'] as String?,
      startDate: DateTime.parse(
          json['startDate'] as String? ?? DateTime.now().toIso8601String()),
      endDate: DateTime.parse(
          json['endDate'] as String? ?? DateTime.now().toIso8601String()),
      daysTaken: json['daysTaken'] as int? ??
          _calculateDays(json['startDate'] as String?, json['endDate'] as String?),
      status: VacationStatus.fromApi(json['status'] as String? ?? 'PENDING'),
      vacationType: json['vacationType'] as String?,
      notes: json['notes'] as String? ?? json['observacoes'] as String?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );
  }

  static int _calculateDays(String? start, String? end) {
    if (start == null || end == null) return 30;
    try {
      final s = DateTime.parse(start);
      final e = DateTime.parse(end);
      return e.difference(s).inDays + 1;
    } catch (_) {
      return 30;
    }
  }

  Map<String, dynamic> toJson() => {
    'employeeId': employeeId,
    'startDate': _formatDate(startDate),
    'endDate': _formatDate(endDate),
    'daysTaken': daysTaken,
    'status': status.apiValue,
    'vacationType': vacationType ?? 'NORMAL',
    'notes': notes,
  };

  String _formatDate(DateTime date) =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  /// Período aquisitivo formatado (ex: "2024/2025").
  String get periodoAquisitivo => '${startDate.year}/${startDate.year + 1}';

  /// Data início formatada (dd/MM/yyyy).
  String get startDateFormatted =>
      '${startDate.day.toString().padLeft(2, '0')}/${startDate.month.toString().padLeft(2, '0')}/${startDate.year}';

  /// Data fim formatada (dd/MM/yyyy).
  String get endDateFormatted =>
      '${endDate.day.toString().padLeft(2, '0')}/${endDate.month.toString().padLeft(2, '0')}/${endDate.year}';
}
