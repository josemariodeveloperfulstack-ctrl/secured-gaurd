/// Modelo de Benefício.
class EmployeeBenefit {
  final String id;
  final String? employeeId;
  final String? employeeName;
  final String? type;
  final bool isActive;
  final String name;
  final String? description;
  final String? startDate;
  final String? endDate;
  final double value;
  final String? createdAt;

  EmployeeBenefit({
    required this.id,
    this.employeeId,
    this.employeeName,
    this.type,
    this.isActive = true,
    required this.name,
    this.description,
    this.startDate,
    this.endDate,
    this.value = 0,
    this.createdAt,
  });

  factory EmployeeBenefit.fromJson(Map<String, dynamic> json) {
    return EmployeeBenefit(
      id: json['id'] as String? ?? '',
      employeeId: _extractId(json['employeeId'], json['employee']),
      employeeName: _extractName(json['employeeName'], json['employee']),
      type: json['type'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      startDate: json['startDate'] as String?,
      endDate: json['endDate'] as String?,
      value: (json['value'] as num?)?.toDouble() ?? 0,
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

  String get displayType {
    switch (type?.toUpperCase()) {
      case 'TRANSPORT':
        return 'Vale Transporte';
      case 'MEAL':
        return 'Vale Refeição';
      case 'FOOD':
        return 'Cesta Básica';
      case 'HEALTH':
        return 'Plano de Saúde';
      case 'DENTAL':
        return 'Plano Odontológico';
      case 'LIFE_INSURANCE':
        return 'Seguro de Vida';
      case 'EDUCATION':
        return 'Auxílio Educação';
      case 'OTHER':
        return 'Outros';
      default:
        return type ?? '--';
    }
  }

  String get formattedValue {
    return 'R\$ ${value.toStringAsFixed(2)}';
  }

  String get formattedStartDate {
    if (startDate == null) return '--';
    try {
      final dt = DateTime.parse(startDate!);
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return startDate!;
    }
  }

  String get formattedEndDate {
    if (endDate == null) return '--';
    try {
      final dt = DateTime.parse(endDate!);
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return endDate!;
    }
  }
}
