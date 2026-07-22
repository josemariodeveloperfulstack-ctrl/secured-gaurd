/// Tipos de registro de ponto.
enum RecordType {
  entrada,
  saidaAlmoco,
  retornoAlmoco,
  saida;

  String get apiValue {
    switch (this) {
      case RecordType.entrada:
        return 'ENTRADA';
      case RecordType.saidaAlmoco:
        return 'SAIDA_ALMOCO';
      case RecordType.retornoAlmoco:
        return 'RETORNO_ALMOCO';
      case RecordType.saida:
        return 'SAIDA';
    }
  }

  static RecordType fromApi(String value) {
    switch (value) {
      case 'ENTRADA':
        return RecordType.entrada;
      case 'SAIDA_ALMOCO':
        return RecordType.saidaAlmoco;
      case 'RETORNO_ALMOCO':
        return RecordType.retornoAlmoco;
      case 'SAIDA':
        return RecordType.saida;
      default:
        return RecordType.entrada;
    }
  }

  String get displayName {
    switch (this) {
      case RecordType.entrada:
        return 'Entrada';
      case RecordType.saidaAlmoco:
        return 'Saída (Intervalo)';
      case RecordType.retornoAlmoco:
        return 'Retorno (Intervalo)';
      case RecordType.saida:
        return 'Saída';
    }
  }
}

/// Status do registro de ponto.
enum RecordStatus {
  pending,
  approved,
  rejected;

  static RecordStatus fromApi(String value) {
    switch (value) {
      case 'PENDING':
        return RecordStatus.pending;
      case 'APPROVED':
        return RecordStatus.approved;
      case 'REJECTED':
        return RecordStatus.rejected;
      default:
        return RecordStatus.pending;
    }
  }
}

/// Modelo de registro de ponto eletrônico.
class TimeRecord {
  final String id;
  final String employeeId;
  final RecordType recordType;
  final DateTime recordedAt;
  final String? location;
  final double? latitude;
  final double? longitude;
  final String? ipAddress;
  final String? userAgent;
  final String? qrCodeUsed;
  final bool isManual;
  final RecordStatus status;
  final String? employeeName;

  TimeRecord({
    required this.id,
    required this.employeeId,
    required this.recordType,
    required this.recordedAt,
    this.location,
    this.latitude,
    this.longitude,
    this.ipAddress,
    this.userAgent,
    this.qrCodeUsed,
    this.isManual = false,
    this.status = RecordStatus.approved,
    this.employeeName,
  });

  factory TimeRecord.fromJson(Map<String, dynamic> json) {
    final employee = json['employee'] as Map<String, dynamic>?;
    return TimeRecord(
      id: json['id']?.toString() ?? '',
      employeeId: employee?['id']?.toString() ?? json['employeeId']?.toString() ?? '',
      recordType: RecordType.fromApi(json['recordType'] as String? ?? 'ENTRADA'),
      recordedAt: DateTime.parse(json['recordedAt'] as String? ?? json['createdAt'] as String? ?? DateTime.now().toIso8601String()),
      location: json['location'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      ipAddress: json['ipAddress'] as String?,
      userAgent: json['userAgent'] as String?,
      qrCodeUsed: json['qrCodeUsed'] as String?,
      isManual: json['isManual'] as bool? ?? false,
      status: RecordStatus.fromApi(json['status'] as String? ?? 'PENDING'),
      employeeName: employee?['name'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'employeeId': employeeId,
    'recordType': recordType.apiValue,
    'location': location,
    'latitude': latitude,
    'longitude': longitude,
    'ipAddress': ipAddress,
    'userAgent': userAgent,
    'qrCode': qrCodeUsed,
  };

  /// Retorna hora formatada (HH:mm).
  String get formattedTime =>
      '${recordedAt.hour.toString().padLeft(2, '0')}:${recordedAt.minute.toString().padLeft(2, '0')}';

  /// Retorna data formatada (dd/MM/yyyy).
  String get formattedDate =>
      '${recordedAt.day.toString().padLeft(2, '0')}/${recordedAt.month.toString().padLeft(2, '0')}/${recordedAt.year}';
}
