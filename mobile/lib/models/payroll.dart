/// Modelo de Folha de Pagamento.
class Payroll {
  final String id;
  final String? employeeId;
  final String? employeeName;
  final String? unitId;
  final String? unitName;
  final String? referenceMonth;
  final double baseSalary;
  final double grossSalary;
  final double netSalary;
  final double overtimeHours;
  final double overtimeValue;
  final double benefitsValue;
  final double deductionsValue;
  final String? documentUrl;
  final String status;
  final String? paymentDate;
  final String? notes;
  final String? createdAt;

  Payroll({
    required this.id,
    this.employeeId,
    this.employeeName,
    this.unitId,
    this.unitName,
    this.referenceMonth,
    this.baseSalary = 0,
    this.grossSalary = 0,
    this.netSalary = 0,
    this.overtimeHours = 0,
    this.overtimeValue = 0,
    this.benefitsValue = 0,
    this.deductionsValue = 0,
    this.documentUrl,
    this.status = 'PENDING',
    this.paymentDate,
    this.notes,
    this.createdAt,
  });

  factory Payroll.fromJson(Map<String, dynamic> json) {
    return Payroll(
      id: json['id'] as String? ?? '',
      employeeId: _extractId(json['employeeId'], json['employee']),
      employeeName: _extractName(json['employeeName'], json['employee']),
      unitId: json['unit'] is Map ? json['unit']['id'] as String? : null,
      unitName: json['unit'] is Map ? json['unit']['name'] as String? : null,
      referenceMonth: json['referenceMonth'] as String?,
      baseSalary: (json['baseSalary'] as num?)?.toDouble() ?? 0,
      grossSalary: (json['grossSalary'] as num?)?.toDouble() ?? 0,
      netSalary: (json['netSalary'] as num?)?.toDouble() ?? 0,
      overtimeHours: (json['overtimeHours'] as num?)?.toDouble() ?? 0,
      overtimeValue: (json['overtimeValue'] as num?)?.toDouble() ?? 0,
      benefitsValue: (json['benefitsValue'] as num?)?.toDouble() ?? 0,
      deductionsValue: (json['deductionsValue'] as num?)?.toDouble() ?? 0,
      documentUrl: json['documentUrl'] as String?,
      status: json['status'] as String? ?? 'PENDING',
      paymentDate: json['paymentDate'] as String?,
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
      case 'PENDING':
        return 'Pendente';
      case 'PROCESSING':
        return 'Processando';
      case 'APPROVED':
        return 'Aprovada';
      case 'PAID':
        return 'Paga';
      case 'CANCELLED':
        return 'Cancelada';
      case 'REOPENED':
        return 'Reaberta';
      default:
        return status;
    }
  }

  String get displayReferenceMonth {
    if (referenceMonth == null) return '--';
    try {
      final parts = referenceMonth!.split('-');
      if (parts.length != 2) return referenceMonth!;
      final months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril',
        'Maio', 'Junho', 'Julho', 'Agosto',
        'Setembro', 'Outubro', 'Novembro', 'Dezembro',
      ];
      final monthIndex = int.tryParse(parts[1]) ?? 1;
      return '${months[monthIndex - 1]}/${parts[0]}';
    } catch (_) {
      return referenceMonth!;
    }
  }

  String get formattedNetSalary {
    return 'R\$ ${netSalary.toStringAsFixed(2)}';
  }

  String get formattedGrossSalary {
    return 'R\$ ${grossSalary.toStringAsFixed(2)}';
  }

  String get formattedBenefitsValue {
    return 'R\$ ${benefitsValue.toStringAsFixed(2)}';
  }

  String get formattedDeductionsValue {
    return 'R\$ ${deductionsValue.toStringAsFixed(2)}';
  }
}
