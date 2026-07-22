import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_service.dart';

/// Entrada na fila de requisições offline.
///
/// Suporta tanto requisições JSON (POST/PUT/PATCH com [body])
/// quanto uploads multipart (UPLOAD com [uploadFieldName], [uploadFileBytes], etc.).
class OfflineQueueEntry {
  final String id;
  final String method; // POST, PUT, PATCH ou UPLOAD
  final String path;
  final Map<String, dynamic>? body;
  final DateTime queuedAt;
  int retryCount;

  // Campos específicos para upload multipart
  final String? uploadFieldName;
  final List<int>? uploadFileBytes;
  final String? uploadFileName;
  final Map<String, String>? uploadFields;

  OfflineQueueEntry({
    required this.id,
    required this.method,
    required this.path,
    this.body,
    DateTime? queuedAt,
    this.retryCount = 0,
    // Upload
    this.uploadFieldName,
    this.uploadFileBytes,
    this.uploadFileName,
    this.uploadFields,
  }) : queuedAt = queuedAt ?? DateTime.now();

  /// Indica se esta entrada é um upload de arquivo.
  bool get isUpload => method == 'UPLOAD';

  /// Rótulo amigável para exibição no dialog.
  String get displayMethodLabel {
    if (isUpload) return 'UPLOAD';
    return method;
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'method': method,
        'path': path,
        'body': body,
        'queuedAt': queuedAt.toIso8601String(),
        'retryCount': retryCount,
        if (uploadFieldName != null) 'uploadFieldName': uploadFieldName,
        if (uploadFileName != null) 'uploadFileName': uploadFileName,
        if (uploadFields != null) 'uploadFields': uploadFields,
        if (uploadFileBytes != null)
          'uploadFileBytes': base64Encode(uploadFileBytes!),
      };

  factory OfflineQueueEntry.fromJson(Map<String, dynamic> json) =>
      OfflineQueueEntry(
        id: json['id'] as String,
        method: json['method'] as String,
        path: json['path'] as String,
        body: json['body'] as Map<String, dynamic>?,
        queuedAt: DateTime.parse(json['queuedAt'] as String),
        retryCount: json['retryCount'] as int? ?? 0,
        uploadFieldName: json['uploadFieldName'] as String?,
        uploadFileName: json['uploadFileName'] as String?,
        uploadFields: (json['uploadFields'] as Map<String, dynamic>?)
            ?.map((k, v) => MapEntry(k, v.toString())),
        uploadFileBytes: json['uploadFileBytes'] != null
            ? base64Decode(json['uploadFileBytes'] as String)
            : null,
      );
}

/// Informações de progresso do replay.
/// Usado pelo callback [ReplayProgressCallback] para atualizar a UI em tempo real.
class ReplayProgress {
  /// Número de entradas já processadas.
  final int completed;

  /// Total de entradas na fila.
  final int total;

  /// Quantas foram reproduzidas com sucesso.
  final int successCount;

  /// Quantas falharam.
  final int failureCount;

  /// Entrada atualmente sendo processada (null se nenhuma).
  final OfflineQueueEntry? currentEntry;

  const ReplayProgress({
    required this.completed,
    required this.total,
    required this.successCount,
    required this.failureCount,
    this.currentEntry,
  });

  /// Indica se o replay foi concluído.
  bool get isDone => completed >= total;

  /// Percentual de progresso (0.0 a 1.0).
  double get percent => total > 0 ? completed / total : 0.0;
}

/// Callback de progresso do replay.
/// [onProgress] é chamado após cada entrada processada com o estado atual.
typedef ReplayProgressCallback = void Function(ReplayProgress progress);

/// Serviço de fila de requisições offline.
///
/// Armazena requisições POST/PUT/PATCH e uploads que falharam por falta de
/// conexão e as reproduz automaticamente quando o servidor volta a ficar online.
class OfflineQueueService {
  static const String _queueKey = 'offline_request_queue';

  static final OfflineQueueService _instance = OfflineQueueService._();
  factory OfflineQueueService() => _instance;
  OfflineQueueService._();

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final ApiService _api = ApiService();

  /// Máximo de tentativas de replay por entrada.
  static const int maxRetries = 5;

  /// Callback disparado quando o número de itens na fila muda.
  void Function(int count)? onQueueChanged;

  List<OfflineQueueEntry> _queue = [];
  bool _isReplaying = false;

  /// Retorna a fila atual.
  List<OfflineQueueEntry> get queue => List.unmodifiable(_queue);

  /// Número de itens na fila.
  int get pendingCount => _queue.length;

  /// Carrega a fila do storage.
  Future<void> loadQueue() async {
    try {
      final data = await _storage.read(key: _queueKey);
      if (data != null && data.isNotEmpty) {
        final list = jsonDecode(data) as List<dynamic>;
        _queue = list
            .map((e) => OfflineQueueEntry.fromJson(e as Map<String, dynamic>))
            .toList();
        debugPrint('[OfflineQueue] Fila carregada: ${_queue.length} itens');
        onQueueChanged?.call(_queue.length);
      }
    } catch (e) {
      debugPrint('[OfflineQueue] Erro ao carregar fila: $e');
      _queue = [];
    }
  }

  /// Persiste a fila no storage.
  Future<void> _saveQueue() async {
    try {
      final data = jsonEncode(_queue.map((e) => e.toJson()).toList());
      await _storage.write(key: _queueKey, value: data);
    } catch (e) {
      debugPrint('[OfflineQueue] Erro ao salvar fila: $e');
    }
  }

  /// Adiciona uma requisição JSON à fila.
  Future<void> enqueue(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final exists = _queue.any(
      (e) => e.method == method && e.path == path && _mapsEqual(e.body, body),
    );
    if (exists) return;

    final entry = OfflineQueueEntry(
      id: '${DateTime.now().millisecondsSinceEpoch}_${_queue.length}',
      method: method,
      path: path,
      body: body,
      queuedAt: DateTime.now(),
    );
    _queue.add(entry);
    await _saveQueue();
    onQueueChanged?.call(_queue.length);
    debugPrint(
        '[OfflineQueue] 📦 Enfileirado: $method $path (total: ${_queue.length})');
  }

  /// Adiciona um upload multipart à fila.
  Future<void> enqueueUpload(
    String path, {
    required String fieldName,
    required List<int> fileBytes,
    required String fileName,
    Map<String, String>? fields,
  }) async {
    // Evitar duplicatas: mesmo path + fieldName + fileName
    final exists = _queue.any(
      (e) =>
          e.method == 'UPLOAD' &&
          e.path == path &&
          e.uploadFieldName == fieldName &&
          e.uploadFileName == fileName,
    );
    if (exists) return;

    final entry = OfflineQueueEntry(
      id: '${DateTime.now().millisecondsSinceEpoch}_${_queue.length}',
      method: 'UPLOAD',
      path: path,
      queuedAt: DateTime.now(),
      uploadFieldName: fieldName,
      uploadFileBytes: fileBytes,
      uploadFileName: fileName,
      uploadFields: fields,
    );
    _queue.add(entry);
    await _saveQueue();
    onQueueChanged?.call(_queue.length);
    debugPrint(
        '[OfflineQueue] 📦 Upload enfileirado: $path/$fileName (total: ${_queue.length})');
  }

  /// Remove uma entrada da fila (após replay bem-sucedido).
  Future<void> dequeue(String id) async {
    _queue.removeWhere((e) => e.id == id);
    await _saveQueue();
    onQueueChanged?.call(_queue.length);
  }

  /// Remove todas as entradas da fila.
  Future<void> clear() async {
    _queue.clear();
    await _saveQueue();
    onQueueChanged?.call(0);
    debugPrint('[OfflineQueue] 🗑️ Fila limpa');
  }

  /// Reproduz todas as requisições enfileiradas.
  ///
  /// Se [onProgress] for fornecido, é chamado após cada entrada processada
  /// para atualizar a UI em tempo real.
  /// Retorna o número de requisições reproduzidas com sucesso.
  Future<int> replayAll({ReplayProgressCallback? onProgress}) async {
    if (_queue.isEmpty || _isReplaying) return 0;

    _isReplaying = true;
    int successCount = 0;
    int failureCount = 0;
    final snapshot = List<OfflineQueueEntry>.from(_queue);
    final total = snapshot.length;

    debugPrint('[OfflineQueue] ▶️ Reproduzindo $total requisições...');

    for (int i = 0; i < total; i++) {
      final entry = snapshot[i];

      // Notificar progresso (processando)
      onProgress?.call(ReplayProgress(
        completed: i,
        total: total,
        successCount: successCount,
        failureCount: failureCount,
        currentEntry: entry,
      ));

      if (entry.retryCount >= maxRetries) {
        debugPrint(
            '[OfflineQueue] ⏭️ Pulando (max retries): ${entry.displayMethodLabel} ${entry.path}');
        await dequeue(entry.id);
        successCount++;
        continue;
      }

      try {
        final success = await _replayEntry(entry);
        if (success) {
          await dequeue(entry.id);
          successCount++;
        } else {
          failureCount++;
          entry.retryCount++;
          await _saveQueue();
        }
      } catch (e) {
        debugPrint('[OfflineQueue] ❌ Erro no replay: $e');
        failureCount++;
        entry.retryCount++;
        await _saveQueue();
      }

      // Notificar progresso (processado)
      onProgress?.call(ReplayProgress(
        completed: i + 1,
        total: total,
        successCount: successCount,
        failureCount: failureCount,
      ));
    }

    _isReplaying = false;
    debugPrint(
        '[OfflineQueue] ✅ Replay concluído: $successCount/$total sucesso');
    return successCount;
  }

  /// Reproduz uma única entrada (JSON ou upload).
  Future<bool> _replayEntry(OfflineQueueEntry entry) async {
    if (entry.isUpload) {
      return _replayUpload(entry);
    }
    return _replayJson(entry);
  }

  /// Reproduz uma requisição JSON.
  Future<bool> _replayJson(OfflineQueueEntry entry) async {
    ApiResponse response;
    final body = entry.body;

    switch (entry.method.toUpperCase()) {
      case 'POST':
        response = await _api.post(entry.path, body: body, silent: true);
        break;
      case 'PUT':
        response = await _api.put(entry.path, body: body, silent: true);
        break;
      case 'PATCH':
        response = await _api.patch(entry.path, body: body, silent: true);
        break;
      default:
        return false;
    }

    return response.success;
  }

  /// Reproduz um upload multipart.
  Future<bool> _replayUpload(OfflineQueueEntry entry) async {
    if (entry.uploadFieldName == null || entry.uploadFileBytes == null) {
      return false;
    }

    final response = await _api.uploadFile(
      entry.path,
      fieldName: entry.uploadFieldName!,
      fileBytes: entry.uploadFileBytes!,
      fileName: entry.uploadFileName ?? 'arquivo.bin',
      fields: entry.uploadFields,
    );
    return response.success;
  }

  /// Compara dois maps para evitar duplicatas.
  bool _mapsEqual(Map<String, dynamic>? a, Map<String, dynamic>? b) {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;
    return a.entries.every((e) => b[e.key] == e.value);
  }
}
