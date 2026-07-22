import 'dart:convert';
import '../config/api_config.dart';
import '../models/auth_response.dart';
import '../models/user.dart';
import 'api_service.dart';

/// Serviço de autenticação que gerencia login padrão e login de supervisor.
class AuthService {
  final ApiService _api = ApiService();

  /// Login padrão do sistema (POST /api/auth/login).
  ///
  /// [username] pode ser email ou CPF.
  /// Retorna [AuthResponse] com token, refresh token e dados do usuário.
  Future<AuthResponse> login(String username, String password) async {
    final response = await _api.post(
      ApiConfig.authLogin,
      body: {
        'username': username,
        'password': password,
      },
    );

    if (!response.success || response.data == null) {
      throw AuthException(
        response.error ?? 'Erro ao fazer login. Verifique suas credenciais.',
      );
    }

    final authResponse = AuthResponse.fromJson(response.data!);
    await _persistSession(authResponse);
    return authResponse;
  }

  /// Login do supervisor via CPF (POST /api/supervisor-auth/login-cpf?cpf=...).
  /// O backend usa @RequestParam, não @RequestBody.
  Future<SupervisorAuthResponse> loginSupervisorByCpf(String cpf) async {
    final uri = '${ApiConfig.supervisorLoginCpf}?cpf=${Uri.encodeComponent(cpf)}';
    final response = await _api.post(uri);

    if (!response.success || response.data == null) {
      throw AuthException(
        response.error ?? 'Supervisor não encontrado ou inativo.',
      );
    }

    final authResponse = SupervisorAuthResponse.fromJson(response.data!);
    if (authResponse.success && authResponse.token != null) {
      await _api.saveToken(authResponse.token!);
      await _api.saveCachedUser(jsonEncode(authResponse.supervisor.toJson()));
    }
    return authResponse;
  }

  /// Login do supervisor via reconhecimento facial.
  /// [imageBytes] são os bytes da foto capturada.
  Future<SupervisorAuthResponse> loginSupervisorFacial(
    List<int> imageBytes,
  ) async {
    final response = await _api.uploadFile(
      ApiConfig.supervisorLoginFacial,
      fieldName: 'image',
      fileBytes: imageBytes,
      fileName: 'face.jpg',
    );

    if (!response.success || response.data == null) {
      throw AuthException(
        response.error ?? 'Reconhecimento facial falhou.',
      );
    }

    final authResponse = SupervisorAuthResponse.fromJson(response.data!);
    if (authResponse.success && authResponse.token != null) {
      await _api.saveToken(authResponse.token!);
      await _api.saveCachedUser(jsonEncode(authResponse.supervisor.toJson()));
    }
    return authResponse;
  }

  /// Aceita os termos LGPD para supervisor (POST /api/supervisor-auth/accept-terms?cpf=...).
  /// O backend usa @RequestParam, não @RequestBody.
  Future<SupervisorAuthResponse> acceptTerms(String cpf) async {
    final uri = '${ApiConfig.supervisorAcceptTerms}?cpf=${Uri.encodeComponent(cpf)}';
    final response = await _api.post(uri);

    if (!response.success || response.data == null) {
      throw AuthException(
        response.error ?? 'Erro ao aceitar termos.',
      );
    }

    final authResponse = SupervisorAuthResponse.fromJson(response.data!);
    if (authResponse.success && authResponse.token != null) {
      await _api.saveToken(authResponse.token!);
      await _api.saveCachedUser(jsonEncode(authResponse.supervisor.toJson()));
    }
    return authResponse;
  }

  /// Verifica se o supervisor precisa aceitar os termos LGPD (GET /api/supervisor-auth/check-terms/{cpf}).
  Future<bool> checkTermsRequired(String cpf) async {
    final uri = '${ApiConfig.supervisorCheckTerms}/$cpf';
    final response = await _api.get(uri);
    return response.data?['needsConsent'] as bool? ?? false;
  }

  /// Faz logout, limpando tokens e dados do usuário.
  Future<void> logout() async {
    await _api.clearTokens();
  }

  /// Tenta restaurar a sessão a partir do token salvo.
  /// Retorna o [User] se a sessão for válida, ou `null`.
  Future<User?> tryRestoreSession() async {
    final token = await _api.getToken();
    if (token == null || token.isEmpty) return null;

    // Se temos token, tenta validar com /api/auth/me
    final response = await _api.get(ApiConfig.authMe, silent: true);
    if (response.success && response.data != null) {
      final userJson = response.data!;
      // Pode vir em formatos diferentes
      final userData = userJson['user'] as Map<String, dynamic>? ?? userJson;
      return User.fromJson(userData);
    }

    // Fallback: se falhou mas temos cache do user, devolve o cache
    final cachedUser = await _api.getCachedUser();
    if (cachedUser != null) {
      return User.fromJson(jsonDecode(cachedUser) as Map<String, dynamic>);
    }

    return null;
  }

  /// Persiste a sessão no secure storage.
  Future<void> _persistSession(AuthResponse authResponse) async {
    await _api.saveToken(authResponse.token);
    if (authResponse.refreshToken != null) {
      await _api.saveRefreshToken(authResponse.refreshToken!);
    }
    await _api.saveCachedUser(jsonEncode(authResponse.user.toJson()));
  }
}

/// Exceção de autenticação.
class AuthException implements Exception {
  final String message;
  AuthException(this.message);

  @override
  String toString() => message;
}
