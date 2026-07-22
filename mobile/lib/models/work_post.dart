/// Modelo de Posto de Trabalho (WorkPost).
///
/// Mapeia o DTO `WorkPostDTO` do backend.
class WorkPost {
  final String id;
  final String postCode;
  final String name;
  final String? description;
  final String? address;
  final String? city;
  final String? state;
  final String? clientName;
  final String? clientCnpj;
  final String? companyName;
  final String? status;
  final String? type;
  final int? requiredVigilantes;
  final String? shiftStart;
  final String? shiftEnd;
  final double? latitude;
  final double? longitude;

  WorkPost({
    required this.id,
    required this.postCode,
    required this.name,
    this.description,
    this.address,
    this.city,
    this.state,
    this.clientName,
    this.clientCnpj,
    this.companyName,
    this.status,
    this.type,
    this.requiredVigilantes,
    this.shiftStart,
    this.shiftEnd,
    this.latitude,
    this.longitude,
  });

  factory WorkPost.fromJson(Map<String, dynamic> json) {
    return WorkPost(
      id: json['id'] as String? ?? '',
      postCode: json['postCode'] as String? ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      address: json['address'] as String?,
      city: json['city'] as String?,
      state: json['state'] as String?,
      clientName: json['clientName'] as String?,
      clientCnpj: json['clientCnpj'] as String?,
      companyName: json['companyName'] as String?,
      status: json['status'] as String?,
      type: json['type'] as String?,
      requiredVigilantes: json['requiredVigilantes'] as int?,
      shiftStart: json['shiftStart'] as String?,
      shiftEnd: json['shiftEnd'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'postCode': postCode,
        'name': name,
        'description': description,
        'address': address,
        'city': city,
        'state': state,
        'clientName': clientName,
        'clientCnpj': clientCnpj,
        'companyName': companyName,
        'status': status,
        'type': type,
        'requiredVigilantes': requiredVigilantes,
        'shiftStart': shiftStart,
        'shiftEnd': shiftEnd,
        'latitude': latitude,
        'longitude': longitude,
      };

  /// Nome curto para exibição.
  String get displayName => '$postCode - $name';

  /// Status formatado para exibição.
  String get displayStatus {
    switch (status?.toUpperCase()) {
      case 'ATIVO':
        return 'Ativo';
      case 'INATIVO':
        return 'Inativo';
      case 'EM_IMPLANTACAO':
      case 'EM_ANALISE':
        return 'Em Análise';
      case 'SUSPENSO':
        return 'Suspenso';
      case 'CANCELADO':
        return 'Cancelado';
      case 'PENDENTE':
        return 'Pendente';
      default:
        return status ?? 'Desconhecido';
    }
  }
}
