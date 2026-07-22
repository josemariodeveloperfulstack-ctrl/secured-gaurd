/// Roles do sistema Secured Guard.
enum UserRole {
  superAdmin,
  administrador,
  admin,
  supervisor,
  rh,
  assistenciaRh,
  departamentoPessoal,
  financeiro,
  operacional,
  gestorOperacional,
  gestaoSupervisao,
  vigilante,
  auxiAdministrativo,
  auxDep,
  tiSuporte,
  auditor,
  colaborador,
  gestor,
  comercial,
  gestorComercial,
  assistenteComercial,
  assistenteAdministrativo,
  analistaSuprimentos,
  estoque,
  suprimentos,
  compras,
  almoxarifado;

  static UserRole fromString(String value) {
    final sanitized = value.replaceAll('ROLE_', '').toUpperCase();
    switch (sanitized) {
      case 'SUPER_ADMIN':
        return UserRole.superAdmin;
      case 'ADMINISTRADOR':
        return UserRole.administrador;
      case 'ADMIN':
        return UserRole.admin;
      case 'SUPERVISOR':
        return UserRole.supervisor;
      case 'RH':
        return UserRole.rh;
      case 'ASSISTENCIA_RH':
        return UserRole.assistenciaRh;
      case 'DEPARTAMENTO_PESSOAL':
        return UserRole.departamentoPessoal;
      case 'FINANCEIRO':
        return UserRole.financeiro;
      case 'OPERACIONAL':
        return UserRole.operacional;
      case 'GESTOR_OPERACIONAL':
        return UserRole.gestorOperacional;
      case 'GESTAO_SUPERVISAO':
        return UserRole.gestaoSupervisao;
      case 'VIGILANTE':
        return UserRole.vigilante;
      case 'AUXI_ADMINISTRATIVO':
        return UserRole.auxiAdministrativo;
      case 'AUX_DEP':
        return UserRole.auxDep;
      case 'TI_SUPORTE':
        return UserRole.tiSuporte;
      case 'AUDITOR':
        return UserRole.auditor;
      case 'COLABORADOR':
        return UserRole.colaborador;
      case 'GESTOR':
        return UserRole.gestor;
      case 'COMERCIAL':
        return UserRole.comercial;
      case 'GESTOR_COMERCIAL':
        return UserRole.gestorComercial;
      case 'ASSISTENTE_COMERCIAL':
        return UserRole.assistenteComercial;
      case 'ASSISTENTE_ADMINISTRATIVO':
        return UserRole.assistenteAdministrativo;
      case 'ANALISTA_SUPRIMENTOS':
        return UserRole.analistaSuprimentos;
      case 'ESTOQUE':
        return UserRole.estoque;
      case 'SUPRIMENTOS':
        return UserRole.suprimentos;
      case 'COMPRAS':
        return UserRole.compras;
      case 'ALMOXARIFADO':
        return UserRole.almoxarifado;
      default:
        return UserRole.colaborador;
    }
  }

  /// Retorna a string no formato usado pela API (ex: SUPER_ADMIN, GESTOR_COMERCIAL).
  String toUpperCaseString() {
    switch (this) {
      case UserRole.superAdmin:
        return 'SUPER_ADMIN';
      case UserRole.administrador:
        return 'ADMINISTRADOR';
      case UserRole.admin:
        return 'ADMIN';
      case UserRole.supervisor:
        return 'SUPERVISOR';
      case UserRole.rh:
        return 'RH';
      case UserRole.assistenciaRh:
        return 'ASSISTENCIA_RH';
      case UserRole.departamentoPessoal:
        return 'DEPARTAMENTO_PESSOAL';
      case UserRole.financeiro:
        return 'FINANCEIRO';
      case UserRole.operacional:
        return 'OPERACIONAL';
      case UserRole.gestorOperacional:
        return 'GESTOR_OPERACIONAL';
      case UserRole.gestaoSupervisao:
        return 'GESTAO_SUPERVISAO';
      case UserRole.vigilante:
        return 'VIGILANTE';
      case UserRole.auxiAdministrativo:
        return 'AUXI_ADMINISTRATIVO';
      case UserRole.auxDep:
        return 'AUX_DEP';
      case UserRole.tiSuporte:
        return 'TI_SUPORTE';
      case UserRole.auditor:
        return 'AUDITOR';
      case UserRole.colaborador:
        return 'COLABORADOR';
      case UserRole.gestor:
        return 'GESTOR';
      case UserRole.comercial:
        return 'COMERCIAL';
      case UserRole.gestorComercial:
        return 'GESTOR_COMERCIAL';
      case UserRole.assistenteComercial:
        return 'ASSISTENTE_COMERCIAL';
      case UserRole.assistenteAdministrativo:
        return 'ASSISTENTE_ADMINISTRATIVO';
      case UserRole.analistaSuprimentos:
        return 'ANALISTA_SUPRIMENTOS';
      case UserRole.estoque:
        return 'ESTOQUE';
      case UserRole.suprimentos:
        return 'SUPRIMENTOS';
      case UserRole.compras:
        return 'COMPRAS';
      case UserRole.almoxarifado:
        return 'ALMOXARIFADO';
    }
  }
}

/// Modelo de usuário do sistema.
class User {
  final String id;
  final String name;
  final String email;
  final String? username;
  final UserRole role;
  final List<String> roles;
  final String? phone;
  final String? whatsapp;
  final String? avatar;
  final String? department;
  final String? position;
  final String? employeeCode;
  final bool firstAccessCompleted;
  final bool lgpdAccepted;
  final bool active;
  final String? employeeId;

  User({
    required this.id,
    required this.name,
    required this.email,
    this.username,
    required this.role,
    this.roles = const [],
    this.phone,
    this.whatsapp,
    this.avatar,
    this.department,
    this.position,
    this.employeeCode,
    this.firstAccessCompleted = false,
    this.lgpdAccepted = false,
    this.active = true,
    this.employeeId,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    final roleStr = json['role'] as String?;
    final rolesRaw = json['roles'] as List<dynamic>?;
    List<String> rolesList;
    if (rolesRaw != null) {
      rolesList = rolesRaw
              .map((r) => r is String ? r : (r as Map)['name'] as String?)
              .whereType<String>()
              .toList();
    } else {
      rolesList = [];
    }
    // Extrair papel principal da lista roles[] se 'role' não veio isolado
    final effectiveRoleStr = roleStr ?? 
        rolesList.where((r) => !r.startsWith('ROLE_')).firstOrNull ??
        rolesList.firstOrNull?.replaceAll('ROLE_', '') ??
        'COLABORADOR';

    return User(
      id: json['id']?.toString() ?? '',
      name: json['fullName'] as String? ?? json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      username: json['username'] as String?,
      role: UserRole.fromString(effectiveRoleStr),
      roles: rolesList.map((r) => r.replaceAll('ROLE_', '')).toList(),
      phone: json['phone'] as String?,
      whatsapp: json['whatsapp'] as String?,
      avatar: json['avatar'] as String?,
      department: json['department'] as String?,
      position: json['position'] as String?,
      employeeCode: json['employeeCode'] as String?,
      firstAccessCompleted:
          json['firstAccessCompleted'] as bool? ?? false,
      lgpdAccepted: json['lgpdAccepted'] as bool? ?? false,
      active: json['active'] as bool? ?? true,
      employeeId: json['employeeId']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'username': username,
        'role': role.toUpperCaseString(),
        'roles': roles,
        'phone': phone,
        'whatsapp': whatsapp,
        'avatar': avatar,
        'department': department,
        'position': position,
        'employeeCode': employeeCode,
        'firstAccessCompleted': firstAccessCompleted,
        'lgpdAccepted': lgpdAccepted,
        'active': active,
        'employeeId': employeeId,
      };

  /// Converte o role para string no formato usado pela API (ex: SUPER_ADMIN).
  String get roleApiString => role.toUpperCaseString();

  User copyWith({
    String? name,
    String? email,
    String? phone,
    String? whatsapp,
    String? avatar,
    bool? firstAccessCompleted,
    bool? lgpdAccepted,
    bool? active,
    String? employeeId,
  }) {
    return User(
      id: id,
      name: name ?? this.name,
      email: email ?? this.email,
      username: username,
      role: role,
      roles: roles,
      phone: phone ?? this.phone,
      whatsapp: whatsapp ?? this.whatsapp,
      avatar: avatar ?? this.avatar,
      department: department,
      position: position,
      employeeCode: employeeCode,
      firstAccessCompleted: firstAccessCompleted ?? this.firstAccessCompleted,
      lgpdAccepted: lgpdAccepted ?? this.lgpdAccepted,
      active: active ?? this.active,
      employeeId: employeeId ?? this.employeeId,
    );
  }
}
