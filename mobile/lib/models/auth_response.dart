import 'user.dart';

/// Resposta do login padrão (POST /api/auth/login).
class AuthResponse {
  final String token;
  final String? refreshToken;
  final User user;
  final bool? requiresPasswordChange;
  final bool? firstAccessCompleted;
  final bool? requires2FA;
  final bool? requiresLgpdConsent;

  AuthResponse({
    required this.token,
    this.refreshToken,
    required this.user,
    this.requiresPasswordChange,
    this.firstAccessCompleted,
    this.requires2FA,
    this.requiresLgpdConsent,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      token: json['token'] as String? ?? '',
      refreshToken: json['refreshToken'] as String?,
      user: User.fromJson(json['user'] as Map<String, dynamic>? ?? {}),
      requiresPasswordChange:
          json['requiresPasswordChange'] as bool?,
      firstAccessCompleted: json['firstAccessCompleted'] as bool?,
      requires2FA: json['requires2FA'] as bool?,
      requiresLgpdConsent: json['requiresLgpdConsent'] as bool?,
    );
  }
}

/// Resposta do login do supervisor via CPF (POST /api/supervisor-auth/login-cpf).
class SupervisorAuthResponse {
  final bool success;
  final User supervisor;
  final String? token;
  final bool needsConsent;
  final String? message;
  final double? confidence;
  final String? quality;

  SupervisorAuthResponse({
    required this.success,
    required this.supervisor,
    this.token,
    this.needsConsent = false,
    this.message,
    this.confidence,
    this.quality,
  });

  factory SupervisorAuthResponse.fromJson(Map<String, dynamic> json) {
    return SupervisorAuthResponse(
      success: json['success'] as bool? ?? false,
      supervisor: User.fromJson(
        json['supervisor'] as Map<String, dynamic>? ?? {},
      ),
      token: json['token'] as String?,
      needsConsent: json['needsConsent'] as bool? ?? false,
      message: json['message'] as String?,
      confidence: (json['confidence'] as num?)?.toDouble(),
      quality: json['quality'] as String?,
    );
  }
}

/// Resposta de refresh token.
class RefreshTokenResponse {
  final String token;
  final String? refreshToken;
  final User? user;

  RefreshTokenResponse({
    required this.token,
    this.refreshToken,
    this.user,
  });

  factory RefreshTokenResponse.fromJson(Map<String, dynamic> json) {
    return RefreshTokenResponse(
      token: json['token'] as String? ?? '',
      refreshToken: json['refreshToken'] as String?,
      user: json['user'] != null
          ? User.fromJson(json['user'] as Map<String, dynamic>)
          : null,
    );
  }
}
