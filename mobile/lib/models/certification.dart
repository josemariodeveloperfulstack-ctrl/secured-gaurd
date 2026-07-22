/// Modelo de Certificação/Treinamento do Funcionário.
class Certification {
  final String id;
  final String? employeeId;
  final String? employeeName;
  final String? employeeDocument;
  final String? employeePosition;
  final String? employeeDepartment;
  final String? employeeHireDate;
  final String? trainingId;
  final String? trainingName;
  final int? renewalPeriodMonths;
  final String? workPostId;
  final String? workPostName;
  final String? certificationNumber;
  final String? issueDate;
  final String? expirationDate;
  final String status;
  final String? documentUrl;

  Certification({
    required this.id,
    this.employeeId,
    this.employeeName,
    this.employeeDocument,
    this.employeePosition,
    this.employeeDepartment,
    this.employeeHireDate,
    this.trainingId,
    this.trainingName,
    this.renewalPeriodMonths,
    this.workPostId,
    this.workPostName,
    this.certificationNumber,
    this.issueDate,
    this.expirationDate,
    this.status = 'ACTIVE',
    this.documentUrl,
  });

  factory Certification.fromJson(Map<String, dynamic> json) {
    return Certification(
      id: json['id'] as String? ?? '',
      employeeId: json['employeeId'] as String?,
      employeeName: json['employeeName'] as String?,
      employeeDocument: json['employeeDocument'] as String?,
      employeePosition: json['employeePosition'] as String?,
      employeeDepartment: json['employeeDepartment'] as String?,
      employeeHireDate: json['employeeHireDate'] as String?,
      trainingId: json['trainingId'] as String?,
      trainingName: json['trainingName'] as String?,
      renewalPeriodMonths: json['renewalPeriodMonths'] as int?,
      workPostId: json['workPostId'] as String?,
      workPostName: json['workPostName'] as String?,
      certificationNumber: json['certificationNumber'] as String?,
      issueDate: json['issueDate'] as String?,
      expirationDate: json['expirationDate'] as String?,
      status: json['status'] as String? ?? 'ACTIVE',
      documentUrl: json['documentUrl'] as String?,
    );
  }

  String get displayStatus {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'Ativa';
      case 'EXPIRED':
        return 'Vencida';
      case 'RENEWED':
        return 'Renovada';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status;
    }
  }

  bool get isExpired {
    if (expirationDate == null) return false;
    try {
      final dt = DateTime.parse(expirationDate!);
      return dt.isBefore(DateTime.now());
    } catch (_) {
      return false;
    }
  }

  bool get isExpiringSoon {
    if (expirationDate == null) return false;
    try {
      final dt = DateTime.parse(expirationDate!);
      final diff = dt.difference(DateTime.now()).inDays;
      return diff >= 0 && diff <= 30;
    } catch (_) {
      return false;
    }
  }

  String get formattedIssueDate {
    if (issueDate == null) return '--';
    try {
      final dt = DateTime.parse(issueDate!);
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return issueDate!;
    }
  }

  String get formattedExpirationDate {
    if (expirationDate == null) return '--';
    try {
      final dt = DateTime.parse(expirationDate!);
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return expirationDate!;
    }
  }
}
