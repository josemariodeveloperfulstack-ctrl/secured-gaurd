/// Modelo de Exame Médico (ASO).
class MedicalExam {
  final String id;
  final String? employeeId;
  final String? employeeName;
  final String? examTypeId;
  final String? examTypeName;
  final String? examTypeCategory;
  final String? scheduledDate;
  final String? examDate;
  final String? doctorName;
  final String? doctorCrm;
  final String? clinicName;
  final String status;
  final String? result;
  final String? restrictions;
  final String? documentUrl;
  final String? nextExamDate;
  final String? notes;
  final String? createdAt;

  MedicalExam({
    required this.id,
    this.employeeId,
    this.employeeName,
    this.examTypeId,
    this.examTypeName,
    this.examTypeCategory,
    this.scheduledDate,
    this.examDate,
    this.doctorName,
    this.doctorCrm,
    this.clinicName,
    this.status = 'PENDENTE',
    this.result,
    this.restrictions,
    this.documentUrl,
    this.nextExamDate,
    this.notes,
    this.createdAt,
  });

  factory MedicalExam.fromJson(Map<String, dynamic> json) {
    return MedicalExam(
      id: json['id'] as String? ?? '',
      employeeId: _extractId(json['employeeId'], json['employee']),
      employeeName: _extractName(json['employeeName'], json['employee']),
      examTypeId: json['examType'] is Map ? json['examType']['id'] as String? : null,
      examTypeName: json['examType'] is Map ? json['examType']['name'] as String? : null,
      examTypeCategory: json['examType'] is Map ? json['examType']['examCategory'] as String? : null,
      scheduledDate: json['scheduledDate'] as String?,
      examDate: json['examDate'] as String?,
      doctorName: json['doctorName'] as String?,
      doctorCrm: json['doctorCrm'] as String?,
      clinicName: json['clinicName'] as String?,
      status: json['status'] as String? ?? 'PENDENTE',
      result: json['result'] as String?,
      restrictions: json['restrictions'] as String?,
      documentUrl: json['documentUrl'] as String?,
      nextExamDate: json['nextExamDate'] as String?,
      notes: json['notes'] as String?,
      createdAt: json['createdAt'] as String?,
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

  String get displayStatus {
    switch (status.toUpperCase()) {
      case 'PENDENTE':
        return 'Pendente';
      case 'REALIZADO':
        return 'Realizado';
      case 'ATRASADO':
        return 'Atrasado';
      case 'CANCELADO':
        return 'Cancelado';
      default:
        return status;
    }
  }

  String get displayResult {
    switch (result?.toUpperCase()) {
      case 'APTO':
        return 'Apto';
      case 'INAPTO':
        return 'Inapto';
      case 'APTO_COM_RESTRICOES':
        return 'Apto c/ Restrições';
      default:
        return result ?? '--';
    }
  }

  String get formattedScheduledDate {
    if (scheduledDate == null) return '--';
    try {
      final dt = DateTime.parse(scheduledDate!);
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return scheduledDate!;
    }
  }

  String get formattedExamDate {
    if (examDate == null) return '--';
    try {
      final dt = DateTime.parse(examDate!);
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return examDate!;
    }
  }

  bool get isExpired {
    if (nextExamDate == null) return false;
    try {
      final dt = DateTime.parse(nextExamDate!);
      return dt.isBefore(DateTime.now());
    } catch (_) {
      return false;
    }
  }

  String get formattedNextExamDate {
    if (nextExamDate == null) return '--';
    try {
      final dt = DateTime.parse(nextExamDate!);
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return nextExamDate!;
    }
  }

  bool get isExpiringSoon {
    if (nextExamDate == null) return false;
    try {
      final dt = DateTime.parse(nextExamDate!);
      final diff = dt.difference(DateTime.now()).inDays;
      return diff >= 0 && diff <= 30;
    } catch (_) {
      return false;
    }
  }
}
