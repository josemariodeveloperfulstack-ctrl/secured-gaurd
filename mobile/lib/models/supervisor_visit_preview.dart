/// Modelos para o fluxo Preview + Check-in do SupervisorVisitController (preview + checkin).
///
/// Mapeia os DTOs:
/// - SupervisorVisitCheckinRequest → requisição de preview/checkin
/// - SupervisorVisitResponse → resposta do preview/checkin
/// - EmployeeIdentificationDTO → funcionário identificado
/// - PostAllocationDTO → vínculo do funcionário com o posto
// ignore_for_file: dangling_library_doc_comments

/// Requisição de preview/check-in da visita do supervisor.
class SupervisorVisitCheckinRequest {
  /// Conteúdo lido do QR Code do posto de trabalho.
  final String? qrCode;

  /// Alternativa ao QR Code: id do posto selecionado manualmente.
  final String? workPostId;

  /// Valor lido do crachá (token QR), CPF ou matrícula digitados.
  final String employeeValue;

  /// Geolocalização capturada no momento do check-in.
  final double? latitude;
  final double? longitude;

  /// Nome do endereço onde o QR foi lido (reverse geocoding feito no cliente).
  final String? locationAddress;

  final String? description;
  final String? observations;

  /// Opcional: força o supervisor (quando o usuário logado não tem vínculo de funcionário).
  final String? supervisorId;

  SupervisorVisitCheckinRequest({
    this.qrCode,
    this.workPostId,
    required this.employeeValue,
    this.latitude,
    this.longitude,
    this.locationAddress,
    this.description,
    this.observations,
    this.supervisorId,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{};
    if (qrCode != null) map['qrCode'] = qrCode;
    if (workPostId != null) map['workPostId'] = workPostId;
    map['employeeValue'] = employeeValue;
    if (latitude != null) map['latitude'] = latitude;
    if (longitude != null) map['longitude'] = longitude;
    if (locationAddress != null) map['locationAddress'] = locationAddress;
    if (description != null) map['description'] = description;
    if (observations != null) map['observations'] = observations;
    if (supervisorId != null) map['supervisorId'] = supervisorId;
    return map;
  }
}

/// Identificação do funcionário retornada após escaneamento de QR Code
/// ou fallback manual (CPF/Matrícula).
class EmployeeIdentification {
  final String? id;
  final String? name;
  final String? cpf;
  final String? registrationNumber;
  final String? email;
  final String? phone;
  final String? positionName;
  final String? departmentName;
  final String? workPostName;
  final String? workPostId;
  final String? unitName;
  final String? companySigla;
  final String? hireDate;
  final String? status;
  final bool? hasPendingTraining;
  final String? matchedBy;

  EmployeeIdentification({
    this.id,
    this.name,
    this.cpf,
    this.registrationNumber,
    this.email,
    this.phone,
    this.positionName,
    this.departmentName,
    this.workPostName,
    this.workPostId,
    this.unitName,
    this.companySigla,
    this.hireDate,
    this.status,
    this.hasPendingTraining,
    this.matchedBy,
  });

  factory EmployeeIdentification.fromJson(Map<String, dynamic> json) {
    return EmployeeIdentification(
      id: json['id'] as String?,
      name: json['name'] as String?,
      cpf: json['cpf'] as String?,
      registrationNumber: json['registrationNumber'] as String?,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      positionName: json['positionName'] as String?,
      departmentName: json['departmentName'] as String?,
      workPostName: json['workPostName'] as String?,
      workPostId: json['workPostId'] as String?,
      unitName: json['unitName'] as String?,
      companySigla: json['companySigla'] as String?,
      hireDate: json['hireDate'] as String?,
      status: json['status'] as String?,
      hasPendingTraining: json['hasPendingTraining'] as bool?,
      matchedBy: json['matchedBy'] as String?,
    );
  }

  /// Formata o CPF com máscara (XXX.XXX.XXX-XX).
  String get cpfMasked {
    if (cpf == null || cpf!.length != 11) return cpf ?? '';
    return '${cpf!.substring(0, 3)}.${cpf!.substring(3, 6)}.${cpf!.substring(6, 9)}-${cpf!.substring(9, 11)}';
  }
}

/// Vínculo do funcionário com o posto de trabalho (efetivo, remanejado, cobertura).
class PostAllocation {
  final String? type;
  final String? typeDescription;
  final String? message;
  final String? effectiveWorkPostName;
  final String? coveredEmployeeName;
  final String? coverageStartDate;
  final String? coverageEndDate;

  PostAllocation({
    this.type,
    this.typeDescription,
    this.message,
    this.effectiveWorkPostName,
    this.coveredEmployeeName,
    this.coverageStartDate,
    this.coverageEndDate,
  });

  factory PostAllocation.fromJson(Map<String, dynamic> json) {
    return PostAllocation(
      type: json['type'] as String?,
      typeDescription: json['typeDescription'] as String?,
      message: json['message'] as String?,
      effectiveWorkPostName: json['effectiveWorkPostName'] as String?,
      coveredEmployeeName: json['coveredEmployeeName'] as String?,
      coverageStartDate: json['coverageStartDate'] as String?,
      coverageEndDate: json['coverageEndDate'] as String?,
    );
  }

  /// Label amigável do tipo de alocação.
  String get typeLabel {
    switch (type?.toUpperCase()) {
      case 'EFFECTIVE':
        return 'Efetivo';
      case 'REMANEJADO':
        return 'Remanejado';
      case 'COBERTURA_FERIAS':
        return 'Cobertura de Férias';
      default:
        return type ?? 'Desconhecido';
    }
  }

  /// Cor para o tipo de alocação.
  int get typeColor {
    switch (type?.toUpperCase()) {
      case 'EFFECTIVE':
        return 0xFF4CAF50; // green
      case 'REMANEJADO':
        return 0xFFFF9800; // orange
      case 'COBERTURA_FERIAS':
        return 0xFF2196F3; // blue
      default:
        return 0xFF9E9E9E; // grey
    }
  }
}

/// Resposta do preview/check-in da visita do supervisor.
class SupervisorVisitCheckinResponse {
  /// Preenchido apenas após o check-in ser gravado.
  final String? visitId;

  // Posto de trabalho
  final String? workPostId;
  final String? workPostName;
  final String? workPostCode;
  final String? workPostAddress;
  final String? clientName;

  /// Funcionário identificado no posto.
  final EmployeeIdentification? employee;

  /// Vínculo do funcionário com o posto.
  final PostAllocation? allocation;

  // Dados do check-in
  final double? latitude;
  final double? longitude;
  final String? locationAddress;
  final bool? qrCodeVerified;

  final String? visitDate;
  final String? visitTime;
  final String? createdAt;

  SupervisorVisitCheckinResponse({
    this.visitId,
    this.workPostId,
    this.workPostName,
    this.workPostCode,
    this.workPostAddress,
    this.clientName,
    this.employee,
    this.allocation,
    this.latitude,
    this.longitude,
    this.locationAddress,
    this.qrCodeVerified,
    this.visitDate,
    this.visitTime,
    this.createdAt,
  });

  factory SupervisorVisitCheckinResponse.fromJson(Map<String, dynamic> json) {
    return SupervisorVisitCheckinResponse(
      visitId: json['visitId'] as String?,
      workPostId: json['workPostId'] as String?,
      workPostName: json['workPostName'] as String?,
      workPostCode: json['workPostCode'] as String?,
      workPostAddress: json['workPostAddress'] as String?,
      clientName: json['clientName'] as String?,
      employee: json['employee'] != null
          ? EmployeeIdentification.fromJson(
              json['employee'] as Map<String, dynamic>)
          : null,
      allocation: json['allocation'] != null
          ? PostAllocation.fromJson(
              json['allocation'] as Map<String, dynamic>)
          : null,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      locationAddress: json['locationAddress'] as String?,
      qrCodeVerified: json['qrCodeVerified'] as bool?,
      visitDate: json['visitDate'] as String?,
      visitTime: json['visitTime'] as String?,
      createdAt: json['createdAt'] as String?,
    );
  }
}
