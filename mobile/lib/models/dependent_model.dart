/// Modelo de Dependente.
class EmployeeDependent {
  final String id;
  final String? employeeId;
  final String? employeeName;
  final String name;
  final String relationship;
  final String? birthDate;
  final String? cpf;
  final String? rg;
  final String? gender;
  final String? phone;
  final String? email;
  final String? address;
  final String? city;
  final String? state;
  final bool isStudent;
  final String? schoolName;
  final bool isBeneficiary;
  final String? notes;
  final String? createdAt;

  EmployeeDependent({
    required this.id,
    this.employeeId,
    this.employeeName,
    required this.name,
    required this.relationship,
    this.birthDate,
    this.cpf,
    this.rg,
    this.gender,
    this.phone,
    this.email,
    this.address,
    this.city,
    this.state,
    this.isStudent = false,
    this.schoolName,
    this.isBeneficiary = false,
    this.notes,
    this.createdAt,
  });

  factory EmployeeDependent.fromJson(Map<String, dynamic> json) {
    return EmployeeDependent(
      id: json['id'] as String? ?? '',
      employeeId: json['employeeId'] as String?,
      employeeName: json['employeeName'] as String?,
      name: json['name'] as String? ?? '',
      relationship: json['relationship'] as String? ?? '',
      birthDate: json['birthDate'] as String?,
      cpf: json['cpf'] as String?,
      rg: json['rg'] as String?,
      gender: json['gender'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      address: json['address'] as String?,
      city: json['city'] as String?,
      state: json['state'] as String?,
      isStudent: json['isStudent'] as bool? ?? false,
      schoolName: json['schoolName'] as String?,
      isBeneficiary: json['isBeneficiary'] as bool? ?? false,
      notes: json['notes'] as String?,
      createdAt: json['createdAt'] as String?,
    );
  }

  String get displayRelationship {
    switch (relationship.toLowerCase()) {
      case 'spouse':
      case 'conjuge':
      case 'cônjuge':
        return 'Cônjuge';
      case 'son':
      case 'filho':
      case 'filha':
        return 'Filho(a)';
      case 'father':
      case 'pai':
        return 'Pai';
      case 'mother':
      case 'mãe':
      case 'mae':
        return 'Mãe';
      case 'brother':
      case 'irmao':
      case 'irmão':
        return 'Irmão(ã)';
      case 'other':
      case 'outro':
        return 'Outro';
      default:
        return relationship;
    }
  }

  String get displayGender {
    switch (gender?.toUpperCase()) {
      case 'M':
        return 'Masculino';
      case 'F':
        return 'Feminino';
      default:
        return gender ?? '--';
    }
  }

  String get formattedBirthDate {
    if (birthDate == null) return '--';
    try {
      final dt = DateTime.parse(birthDate!);
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return birthDate!;
    }
  }

  String get formattedCpf {
    if (cpf == null || cpf!.length != 11) return cpf ?? '--';
    return '${cpf!.substring(0, 3)}.${cpf!.substring(3, 6)}.${cpf!.substring(6, 9)}-${cpf!.substring(9, 11)}';
  }
}
