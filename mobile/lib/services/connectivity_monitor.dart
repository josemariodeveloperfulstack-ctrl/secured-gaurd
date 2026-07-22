import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

/// Monitora a conectividade com o servidor backend através de pings
/// periódicos ao endpoint de health check.
///
/// Dispara callbacks quando o estado de conexão muda (online ↔ offline).
class ConnectivityMonitor {
  static final ConnectivityMonitor _instance = ConnectivityMonitor._();
  factory ConnectivityMonitor() => _instance;
  ConnectivityMonitor._();

  Timer? _timer;

  /// Callback disparado quando o servidor fica offline.
  void Function()? onOffline;

  /// Callback disparado quando o servidor volta a ficar online.
  void Function()? onOnline;

  /// Estado atual da conectividade.
  bool _isOnline = true;
  bool get isOnline => _isOnline;

  bool _isRunning = false;

  /// Inicia o monitoramento periódico do servidor.
  void start() {
    if (_isRunning) return;
    _isRunning = true;

    _checkNow(); // verificação imediata
    _timer = Timer.periodic(
      Duration(seconds: ApiConfig.healthCheckIntervalSec),
      (_) => _checkNow(),
    );

    debugPrint('[ConnectivityMonitor] Monitoramento iniciado '
        '(intervalo: ${ApiConfig.healthCheckIntervalSec}s)');
  }

  /// Para o monitoramento.
  void stop() {
    _timer?.cancel();
    _timer = null;
    _isRunning = false;
    debugPrint('[ConnectivityMonitor] Monitoramento parado');
  }

  /// Força uma verificação imediata.
  Future<void> _checkNow() async {
    final wasOnline = _isOnline;
    final nowOnline = await _pingServer();

    if (wasOnline && !nowOnline) {
      _isOnline = false;
      debugPrint('[ConnectivityMonitor] 🔴 Servidor OFFLINE');
      onOffline?.call();
    } else if (!wasOnline && nowOnline) {
      _isOnline = true;
      debugPrint('[ConnectivityMonitor] 🟢 Servidor ONLINE');
      onOnline?.call();
    }
  }

  /// Pinga o endpoint de health check do servidor.
  /// Retorna `true` se o servidor respondeu com sucesso.
  Future<bool> _pingServer() async {
    try {
      final uri = ApiConfig.uri(ApiConfig.authHealth);
      final response = await http
          .get(uri, headers: {'accept': 'application/json'})
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        // Validar que a resposta é JSON com status "ok"
        try {
          final body = jsonDecode(response.body);
          if (body is Map && body['status'] == 'ok') {
            return true;
          }
        } catch (_) {
          // Resposta não-JSON ou formato inesperado — ainda assim conta como online
          return true;
        }
      }
      return false;
    } on SocketException {
      return false;
    } on HttpException {
      return false;
    } on TimeoutException {
      return false;
    } catch (e) {
      debugPrint('[ConnectivityMonitor] Erro ao pingar servidor: $e');
      return false;
    }
  }

  /// Reinicia o monitoramento (útil após reconexão de rede).
  void restart() {
    stop();
    start();
  }

  /// Dispara uma verificação manual e retorna o resultado.
  Future<bool> checkNow() async {
    final online = await _pingServer();
    final wasOnline = _isOnline;

    _isOnline = online;

    if (wasOnline && !online) {
      onOffline?.call();
    } else if (!wasOnline && online) {
      onOnline?.call();
    }

    return online;
  }
}
