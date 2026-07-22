import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

/// Provider de autenticação que gerencia o estado do usuário logado.
///
/// Usa [ChangeNotifier] para notificar a UI sobre mudanças no estado.
class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final ApiService _apiService = ApiService();

  User? _user;
  bool _isLoading = true;
  String? _error;

  // Getters
  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;
  String? get error => _error;

  /// Indica se o usuário logado é supervisor.
  bool get isSupervisor => _user?.role == UserRole.supervisor;

  /// Indica se o usuário logado é colaborador/funcionário.
  bool get isEmployee => _user != null && !isSupervisor;

  /// Tenta restaurar a sessão ao iniciar o app.
  Future<void> tryAutoLogin() async {
    _isLoading = true;
    notifyListeners();

    try {
      final user = await _authService.tryRestoreSession();
      if (user != null) {
        _user = user;
        _setupUnauthorizedHandler();
      }
    } catch (e) {
      debugPrint('[AuthProvider] Erro ao restaurar sessão: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Login padrão (colaborador/admin/etc).
  Future<bool> login(String username, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _authService.login(username, password);
      _user = response.user;
      _setupUnauthorizedHandler();
      _isLoading = false;
      notifyListeners();
      return true;
    } on AuthException catch (e) {
      _error = e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Erro inesperado: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Login de supervisor via CPF.
  Future<bool> loginSupervisorCpf(String cpf) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _authService.loginSupervisorByCpf(cpf);
      if (response.success && response.token != null) {
        _user = response.supervisor;
        _setupUnauthorizedHandler();
        _isLoading = false;
        notifyListeners();
        return true;
      } else if (response.needsConsent) {
        _error = 'Necessário aceitar os termos de uso.';
      } else {
        _error = response.message ?? 'Erro ao fazer login.';
      }
      _isLoading = false;
      notifyListeners();
      return false;
    } on AuthException catch (e) {
      _error = e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Erro inesperado: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Login de supervisor via reconhecimento facial.
  Future<bool> loginSupervisorFacial(List<int> imageBytes) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _authService.loginSupervisorFacial(imageBytes);
      if (response.success && response.token != null) {
        _user = response.supervisor;
        _setupUnauthorizedHandler();
        _isLoading = false;
        notifyListeners();
        return true;
      } else if (response.needsConsent) {
        _error = 'Necessário aceitar os termos de uso.';
      } else {
        _error = response.message ?? 'Face não reconhecida.';
      }
      _isLoading = false;
      notifyListeners();
      return false;
    } on AuthException catch (e) {
      _error = e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Erro inesperado: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Aceita os termos LGPD (supervisor).
  Future<bool> acceptTerms(String cpf) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _authService.acceptTerms(cpf);
      if (response.success && response.token != null) {
        _user = response.supervisor;
        _setupUnauthorizedHandler();
        _isLoading = false;
        notifyListeners();
        return true;
      }
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      _error = 'Erro ao aceitar termos.';
      notifyListeners();
      return false;
    }
  }

  /// Faz logout e limpa o estado.
  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _error = null;
    notifyListeners();
  }

  /// Configura o handler global para 401 (token expirado).
  void _setupUnauthorizedHandler() {
    _apiService.onUnauthorized = () {
      logout();
    };
  }
}
