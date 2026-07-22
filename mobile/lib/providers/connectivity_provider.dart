import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../services/connectivity_monitor.dart';
import '../services/notification_service.dart';
import '../services/offline_queue_service.dart';

/// Provider que gerencia o estado de conectividade com o servidor.
///
/// Notifica a UI quando o servidor fica offline/online,
/// permitindo que widgets exibam banners ou SnackBars.
class ConnectivityProvider extends ChangeNotifier {
  final ConnectivityMonitor _monitor = ConnectivityMonitor();
  final ApiService _apiService = ApiService();
  final OfflineQueueService _queueService = OfflineQueueService();

  bool _isOnline = true;
  bool get isOnline => _isOnline;

  /// Timestamp da última vez que o servidor ficou offline.
  DateTime? _lastOfflineAt;
  DateTime? get lastOfflineAt => _lastOfflineAt;

  /// Número de quedas de conexão desde que o monitor foi iniciado.
  int _offlineCount = 0;
  int get offlineCount => _offlineCount;

  /// Número de itens pendentes na fila offline.
  int _pendingQueueCount = 0;
  int get pendingQueueCount => _pendingQueueCount;

  ConnectivityProvider() {
    _setupCallbacks();
    // Wire do callback de mudança na fila offline
    _queueService.onQueueChanged = (count) {
      if (_pendingQueueCount != count) {
        _pendingQueueCount = count;
        notifyListeners();
      }
    };
  }

  void _setupCallbacks() {
    // Callback do monitor periódico de health check
    _monitor.onOffline = () {
      _isOnline = false;
      _lastOfflineAt = DateTime.now();
      _offlineCount++;
      debugPrint('[ConnectivityProvider] 🔴 Notificando UI: OFFLINE');
      notifyListeners();
    };

    _monitor.onOnline = () {
      _isOnline = true;
      debugPrint('[ConnectivityProvider] 🟢 Notificando UI: ONLINE');
      notifyListeners();
      // Reproduzir fila offline quando o servidor voltar
      _replayOfflineQueue();
    };

    // Callback do ApiService (disparado por SocketException/HttpException)
    _apiService.onOffline = () {
      if (_isOnline) {
        _isOnline = false;
        _lastOfflineAt = DateTime.now();
        _offlineCount++;
        debugPrint('[ConnectivityProvider] 🔴 ApiService detectou OFFLINE');
        notifyListeners();
      }
    };

    _apiService.onOnline = () {
      if (!_isOnline) {
        _isOnline = true;
        debugPrint('[ConnectivityProvider] 🟢 ApiService detectou ONLINE');
        notifyListeners();
        // Reproduzir fila offline quando o servidor voltar
        _replayOfflineQueue();
      }
    };
  }

  /// Inicia o monitoramento periódico e carrega a fila offline.
  Future<void> start() async {
    await OfflineQueueService().loadQueue();
    _monitor.start();
    // Se há itens pendentes de sessão anterior, tenta reproduzir
    if (OfflineQueueService().pendingCount > 0) {
      _replayOfflineQueue();
    }
  }

  /// Para o monitoramento.
  void stop() {
    _monitor.stop();
  }

  /// Força uma verificação manual da conectividade.
  Future<bool> checkNow() async {
    final online = await _monitor.checkNow();
    if (online != _isOnline) {
      _isOnline = online;
      if (!online) {
        _lastOfflineAt = DateTime.now();
        _offlineCount++;
      }
      notifyListeners();
    }
    return online;
  }

  /// Reproduz a fila de requisições offline.
  Future<void> _replayOfflineQueue() async {
    final queue = OfflineQueueService();
    if (queue.pendingCount > 0) {
      final total = queue.pendingCount;
      debugPrint('[ConnectivityProvider] ▶️ Reproduzindo fila offline ($total itens)...');
      final success = await queue.replayAll();
      final failure = total - success;
      debugPrint('[ConnectivityProvider] ✅ Fila reproduzida: $success sucesso, $failure falha');
      notifyListeners();

      // Notificar o usuário mesmo com app em background
      NotificationService().showReplayComplete(
        successCount: success,
        failureCount: failure,
        total: total,
      );
    }
  }

  @override
  void dispose() {
    _monitor.stop();
    super.dispose();
  }
}
