/// Modelo de Equipamento de Proteção Individual (EPI).
class EmployeeEPI {
  final String id;
  final String name;
  final String? description;
  final String? issueDate;
  final String? expirationDate;
  final String? returnDate;
  final EPIStatus status;
  final String? documentUrl;
  final String? employeeId;
  final String? employeeName;
  final String? createdAt;

  EmployeeEPI({
    required this.id,
    required this.name,
    this.description,
    this.issueDate,
    this.expirationDate,
    this.returnDate,
    this.status = EPIStatus.issued,
    this.documentUrl,
    this.employeeId,
    this.employeeName,
    this.createdAt,
  });

  factory EmployeeEPI.fromJson(Map<String, dynamic> json) {
    return EmployeeEPI(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      issueDate: json['issueDate'] as String?,
      expirationDate: json['expirationDate'] as String?,
      returnDate: json['returnDate'] as String?,
      status: _parseStatus(json['status'] as String? ?? 'ISSUED'),
      documentUrl: json['documentUrl'] as String?,
      employeeId: json['employee'] is Map ? json['employee']['id'] as String? : null,
      employeeName: json['employee'] is Map ? json['employee']['name'] as String? : null,
      createdAt: json['createdAt'] as String?,
    );
  }

  static EPIStatus _parseStatus(String value) {
    switch (value.toUpperCase()) {
      case 'ISSUED':
        return EPIStatus.issued;
      case 'RETURNED':
        return EPIStatus.returned;
      case 'EXPIRED':
        return EPIStatus.expired;
      case 'LOST':
        return EPIStatus.lost;
      case 'DAMAGED':
        return EPIStatus.damaged;
      default:
        return EPIStatus.issued;
    }
  }

  String get displayStatus {
    switch (status) {
      case EPIStatus.issued:
        return 'Em Uso';
      case EPIStatus.returned:
        return 'Devolvido';
      case EPIStatus.expired:
        return 'Vencido';
      case EPIStatus.lost:
        return 'Perdido';
      case EPIStatus.damaged:
        return 'Danificado';
    }
  }

  bool get isExpired {
    if (expirationDate == null) return false;
    try {
      final exp = DateTime.parse(expirationDate!);
      return exp.isBefore(DateTime.now());
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

enum EPIStatus {
  issued,
  returned,
  expired,
  lost,
  damaged;
}
