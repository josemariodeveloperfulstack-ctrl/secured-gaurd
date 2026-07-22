import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';
import 'offline_queue_service.dart';

/// Cliente HTTP central com suporte a JWT, refresh token e retry.
///
/// Armazena o token de forma segura com [FlutterSecureStorage].
class ApiService {
  static const String _tokenKey = 'jwt_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userKey = 'cached_user';

  static final ApiService _instance = ApiService._();
  factory ApiService() => _instance;
  ApiService._();

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  final http.Client _client = http.Client();

  /// Token JWT atual (cache em memória, sem consultar secure storage a cada request).
  String? _token;

  /// Callback disparado quando o servidor retorna 401 e o refresh falha.
  void Function()? onUnauthorized;

  /// Callback disparado quando o servidor fica inacessível (offline).
  void Function()? onOffline;

  /// Callback disparado quando uma requisição é concluída com sucesso
  /// após ter detectado offline anteriormente.
  void Function()? onOnline;

  /// Flag interna para evitar notificações repetidas de offline.
  bool _wasOffline = false;

  /// Flag para evitar loop infinito de refresh em 401 consecutivos.
  bool _refreshingToken = false;

  /// Enfileira requisição mutante se o método for POST, PUT ou PATCH.
  void _enqueueIfMutating(
    String method,
    String path,
    Map<String, dynamic>? body,
  ) {
    if (method == 'POST' || method == 'PUT' || method == 'PATCH') {
      OfflineQueueService().enqueue(method, path, body: body);
    }
  }

  /// Notifica estado offline (com debounce para evitar spam).
  void _notifyOffline() {
    if (!_wasOffline) {
      _wasOffline = true;
      onOffline?.call();
    }
  }

  /// Notifica estado online (quando uma requisição sucede após offline).
  void _notifyOnline() {
    if (_wasOffline) {
      _wasOffline = false;
      onOnline?.call();
    }
  }

  // ──────────────────────────────────────────────
  // Gerenciamento de Token
  // ──────────────────────────────────────────────

  Future<void> saveToken(String token) async {
    _token = token;
    await _secureStorage.write(key: _tokenKey, value: token);
  }

  Future<void> saveRefreshToken(String token) async {
    await _secureStorage.write(key: _refreshTokenKey, value: token);
  }

  Future<String?> getToken() async {
    if (_token != null) return _token;
    _token = await _secureStorage.read(key: _tokenKey);
    return _token;
  }

  Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: _refreshTokenKey);
  }

  Future<void> clearTokens() async {
    _token = null;
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _refreshTokenKey);
    await _secureStorage.delete(key: _userKey);
  }

  /// Salva dados do usuário serializados (cache local).
  Future<void> saveCachedUser(String userJson) async {
    await _secureStorage.write(key: _userKey, value: userJson);
  }

  Future<String?> getCachedUser() async {
    return await _secureStorage.read(key: _userKey);
  }

  Future<void> clearCachedUser() async {
    await _secureStorage.delete(key: _userKey);
  }

  // ──────────────────────────────────────────────
  // Métodos HTTP
  // ──────────────────────────────────────────────

  /// GET com headers de autenticação.
  Future<ApiResponse> get(
    String path, {
    Map<String, String>? queryParams,
    bool silent = false,
  }) async {
    return _execute(
      () async {
        final uri = _buildUri(path, queryParams);
        final headers = await _buildHeaders();
        return _client.get(uri, headers: headers);
      },
      path,
      silent,
    );
  }

  /// POST com body JSON.
  Future<ApiResponse> post(
    String path, {
    Map<String, dynamic>? body,
    bool silent = false,
  }) async {
    return _execute(
      () async {
        final uri = _buildUri(path);
        final headers = await _buildHeaders(contentType: 'application/json');
        return _client.post(
          uri,
          headers: headers,
          body: body != null ? jsonEncode(body) : null,
        );
      },
      path,
      silent,
      method: 'POST',
      body: body,
    );
  }

  /// PUT com body JSON.
  Future<ApiResponse> put(
    String path, {
    Map<String, dynamic>? body,
    bool silent = false,
  }) async {
    return _execute(
      () async {
        final uri = _buildUri(path);
        final headers = await _buildHeaders(contentType: 'application/json');
        return _client.put(
          uri,
          headers: headers,
          body: body != null ? jsonEncode(body) : null,
        );
      },
      path,
      silent,
      method: 'PUT',
      body: body,
    );
  }

  /// PATCH com body JSON.
  Future<ApiResponse> patch(
    String path, {
    Map<String, dynamic>? body,
    bool silent = false,
  }) async {
    return _execute(
      () async {
        final uri = _buildUri(path);
        final headers = await _buildHeaders(contentType: 'application/json');
        return _client.patch(
          uri,
          headers: headers,
          body: body != null ? jsonEncode(body) : null,
        );
      },
      path,
      silent,
      method: 'PATCH',
      body: body,
    );
  }

  /// DELETE.
  Future<ApiResponse> delete(
    String path, {
    bool silent = false,
  }) async {
    return _execute(
      () async {
        final uri = _buildUri(path);
        final headers = await _buildHeaders();
        return _client.delete(uri, headers: headers);
      },
      path,
      silent,
      method: 'DELETE',
    );
  }

  /// POST multipart (upload de arquivos) com suporte a retry e refresh token.
  Future<ApiResponse> uploadFile(
    String path, {
    required String fieldName,
    required List<int> fileBytes,
    required String fileName,
    Map<String, String>? fields,
  }) async {
    return _uploadWithRetry(path,
        fieldName: fieldName,
        fileBytes: fileBytes,
        fileName: fileName,
        fields: fields);
  }

  // ──────────────────────────────────────────────
  // Privado
  // ──────────────────────────────────────────────

  Uri _buildUri(String path, [Map<String, String>? queryParams]) {
    final uri = ApiConfig.uri(path);
    if (queryParams != null && queryParams.isNotEmpty) {
      return uri.replace(queryParameters: queryParams);
    }
    return uri;
  }

  Future<Map<String, String>> _buildHeaders({
    String? contentType,
  }) async {
    final headers = <String, String>{
      'accept': 'application/json',
    };
    if (contentType != null) {
      headers['content-type'] = contentType;
    }

    final token = await getToken();
    if (token != null && token.isNotEmpty) {
      headers['authorization'] = 'Bearer $token';
    }

    return headers;
  }

  /// Executa a requisição com suporte a retry (522/timeout), refresh token (401)
  /// e fila offline para métodos mutantes (POST, PUT, PATCH).
  Future<ApiResponse> _execute(
    Future<http.Response> Function() request,
    String path,
    bool silent, {
    String method = 'GET',
    Map<String, dynamic>? body,
  }) async {
    const maxRetries = 2;

    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        final response = await request().timeout(
          const Duration(milliseconds: ApiConfig.receiveTimeoutMs),
        );

        // 401 → tentar refresh token (APENAS UMA vez)
        if (response.statusCode == 401 && !_refreshingToken) {
          _refreshingToken = true;
          final refreshed = await _tryRefreshToken();
          _refreshingToken = false;
          if (refreshed) {
            // Re-tentar com o novo token
            continue;
          } else {
            if (!silent) {
              debugPrint('[ApiService] 401 - Refresh falhou. Chamando onUnauthorized.');
            }
            onUnauthorized?.call();
            return ApiResponse(
              success: false,
              statusCode: 401,
              error: 'Sessão expirada. Faça login novamente.',
            );
          }
        }

        // 522 → retry automático
        if (response.statusCode == 522 && attempt < maxRetries) {
          if (!silent) {
            debugPrint('[ApiService] 522 - Timeout, tentativa $attempt/$maxRetries');
          }
          await Future.delayed(Duration(seconds: attempt));
          continue;
        }

        _notifyOnline();
        return _processResponse(response);
      } on SocketException {
        _notifyOffline();
        if (attempt < maxRetries) {
          await Future.delayed(Duration(seconds: attempt));
          continue;
        }
        // Enfileirar requisições mutantes que falharam por offline
        _enqueueIfMutating(method, path, body);
        return ApiResponse(
          success: false,
          statusCode: 0,
          error: 'Sem conexão com o servidor. Verifique sua internet.',
        );
      } on HttpException {
        _notifyOffline();
        _enqueueIfMutating(method, path, body);
        if (attempt < maxRetries) {
          await Future.delayed(Duration(seconds: attempt));
          continue;
        }
        return ApiResponse(
          success: false,
          statusCode: 0,
          error: 'Erro de conexão com o servidor.',
        );
      } on TimeoutException {
        _notifyOffline();
        _enqueueIfMutating(method, path, body);
        return ApiResponse(
          success: false,
          statusCode: 0,
          error: 'O servidor não respondeu a tempo. Verifique sua conexão.',
        );
      } catch (_) {
        // Outros erros inesperados
        _notifyOffline();
        _enqueueIfMutating(method, path, body);
        return ApiResponse(
          success: false,
          statusCode: 0,
          error: 'Erro inesperado de conexão.',
        );
      }
    }

    return ApiResponse(
      success: false,
      statusCode: 0,
      error: 'Falha na requisição após $maxRetries tentativas.',
    );
  }

  ApiResponse _processResponse(http.Response response) {
    Map<String, dynamic>? data;
    String? error;

    try {
      if (response.body.isNotEmpty) {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          data = decoded;
          error = data['error'] as String? ?? data['message'] as String?;
        }
      }
    } catch (_) {
      // Resposta não é JSON
    }

    final success = response.statusCode >= 200 && response.statusCode < 300;

    return ApiResponse(
      success: success,
      statusCode: response.statusCode,
      data: data,
      error: success ? null : (error ?? 'Erro ${response.statusCode}'),
      rawBody: response.body,
    );
  }

  /// POST multipart com suporte a refresh token, retry e fila offline.
  Future<ApiResponse> _uploadWithRetry(
    String path, {
    required String fieldName,
    required List<int> fileBytes,
    required String fileName,
    Map<String, String>? fields,
  }) async {
    const maxRetries = 2;

    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await _doUpload(path,
            fieldName: fieldName,
            fileBytes: fileBytes,
            fileName: fileName,
            fields: fields);
      } on SocketException {
        _notifyOffline();
        if (attempt < maxRetries) {
          await Future.delayed(Duration(seconds: attempt));
          continue;
        }
        // Enfileirar upload que falhou por offline
        OfflineQueueService().enqueueUpload(
          path,
          fieldName: fieldName,
          fileBytes: fileBytes,
          fileName: fileName,
          fields: fields,
        );
        return ApiResponse(
          success: false,
          statusCode: 0,
          error: 'Sem conexão com o servidor. Upload enfileirado.',
        );
      } on HttpException {
        _notifyOffline();
        if (attempt < maxRetries) {
          await Future.delayed(Duration(seconds: attempt));
          continue;
        }
        // Enfileirar upload que falhou por erro de conexão
        OfflineQueueService().enqueueUpload(
          path,
          fieldName: fieldName,
          fileBytes: fileBytes,
          fileName: fileName,
          fields: fields,
        );
        return ApiResponse(
          success: false,
          statusCode: 0,
          error: 'Erro de conexão com o servidor. Upload enfileirado.',
        );
      } on TimeoutException {
        _notifyOffline();
        if (attempt < maxRetries) {
          await Future.delayed(Duration(seconds: attempt));
          continue;
        }
        // Enfileirar upload que falhou por timeout
        OfflineQueueService().enqueueUpload(
          path,
          fieldName: fieldName,
          fileBytes: fileBytes,
          fileName: fileName,
          fields: fields,
        );
        return ApiResponse(
          success: false,
          statusCode: 0,
          error: 'O servidor não respondeu a tempo. Upload enfileirado.',
        );
      }
    }

    return ApiResponse(
      success: false,
      statusCode: 0,
      error: 'Falha no upload após $maxRetries tentativas.',
    );
  }

  Future<ApiResponse> _doUpload(
    String path, {
    required String fieldName,
    required List<int> fileBytes,
    required String fileName,
    Map<String, String>? fields,
  }) async {
    final uri = _buildUri(path);
    final headers = await _buildHeaders();
    headers.remove('content-type');

    final request = http.MultipartRequest('POST', uri);
    request.headers.addAll(headers);
    request.files.add(
      http.MultipartFile.fromBytes(
        fieldName,
        fileBytes,
        filename: fileName,
      ),
    );
    if (fields != null) {
      request.fields.addAll(fields);
    }

    final streamedResponse = await request.send().timeout(
          const Duration(milliseconds: ApiConfig.receiveTimeoutMs),
        );
    final response = await http.Response.fromStream(streamedResponse);

    // 401 → tentar refresh e re-upload
    if (response.statusCode == 401 && !_refreshingToken) {
      _refreshingToken = true;
      final refreshed = await _tryRefreshToken();
      _refreshingToken = false;
      if (refreshed) {
        return _doUpload(path,
            fieldName: fieldName,
            fileBytes: fileBytes,
            fileName: fileName,
            fields: fields);
      }
      onUnauthorized?.call();
      return ApiResponse(
        success: false,
        statusCode: 401,
        error: 'Sessão expirada.',
      );
    }

    return _processResponse(response);
  }

  /// Tenta renovar o token usando o refresh token.
  /// Retorna `true` se conseguiu renovar.
  Future<bool> _tryRefreshToken() async {
    try {
      final refreshToken = await getRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) {
        return false;
      }

      final uri = ApiConfig.uri(ApiConfig.authRefreshToken);
      final response = await _client
          .post(
            uri,
            headers: {
              'accept': 'application/json',
              'content-type': 'application/json',
            },
            body: jsonEncode({'refreshToken': refreshToken}),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        final newToken = body['token'] as String?;
        final newRefreshToken = body['refreshToken'] as String?;

        if (newToken != null && newToken.isNotEmpty) {
          await saveToken(newToken);
          if (newRefreshToken != null) {
            await saveRefreshToken(newRefreshToken);
          }
          return true;
        }
      }
      return false;
    } catch (e) {
      debugPrint('[ApiService] Erro no refresh token: $e');
      return false;
    }
  }
}

/// Resposta padronizada da API.
class ApiResponse {
  final bool success;
  final int statusCode;
  final Map<String, dynamic>? data;
  final String? error;
  final String? rawBody;

  ApiResponse({
    required this.success,
    required this.statusCode,
    this.data,
    this.error,
    this.rawBody,
  });
}
