import 'dart:convert';
import 'dart:io';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class ApiService {
  ApiService({
    http.Client? client,
    FlutterSecureStorage? storage,
  })  : _client = client ?? http.Client(),
        _storage = storage ?? const FlutterSecureStorage();

  final http.Client _client;
  final FlutterSecureStorage _storage;
  String? _token;

  String get _baseUrl =>
      (dotenv.env['API_BASE_URL'] ?? 'http://127.0.0.1:8000/api')
          .trim()
          .replaceFirst(RegExp(r'/*$'), '');

  Future<void> bootstrap() async {
    _token ??= await _storage.read(key: _tokenKey);
  }

  static const _tokenKey = 'auth_token';

  Future<void> persistToken(String? token) async {
    _token = token;
    if (token == null || token.isEmpty) {
      await _storage.delete(key: _tokenKey);
    } else {
      await _storage.write(key: _tokenKey, value: token);
    }
  }

  Uri _buildUri(String path, [Map<String, dynamic>? queryParameters]) {
    final normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    return Uri.parse('$_baseUrl/$normalizedPath').replace(
      queryParameters: queryParameters?.map(
        (key, value) => MapEntry(key, value.toString()),
      ),
    );
  }

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? query,
    Map<String, String>? headers,
  }) async {
    final response = await _client.get(
      _buildUri(path, query),
      headers: _composeHeaders(headers),
    );
    _throwIfError(response);
    return _decode(response);
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) async {
    final response = await _client.post(
      _buildUri(path),
      headers: _composeHeaders(headers),
      body: jsonEncode(body ?? {}),
    );
    _throwIfError(response);
    return _decode(response);
  }

  Future<Map<String, dynamic>> put(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) async {
    final response = await _client.put(
      _buildUri(path),
      headers: _composeHeaders(headers),
      body: jsonEncode(body ?? {}),
    );
    _throwIfError(response);
    return _decode(response);
  }

  Future<Map<String, dynamic>> delete(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) async {
    final response = await _client.delete(
      _buildUri(path),
      headers: _composeHeaders(headers),
      body: body == null ? null : jsonEncode(body),
    );
    _throwIfError(response);
    return _decode(response);
  }

  Future<Map<String, dynamic>> multipart(
    String path, {
    required Map<String, String> fields,
    required File file,
    required String fileField,
    Map<String, String>? headers,
  }) async {
    final request = http.MultipartRequest('POST', _buildUri(path))
      ..headers.addAll(_composeHeaders(headers))
      ..fields.addAll(fields)
      ..files.add(await http.MultipartFile.fromPath(fileField, file.path));

    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);
    _throwIfError(response);
    return _decode(response);
  }

  Map<String, dynamic> _decode(http.Response response) {
    if (response.body.isEmpty) return {};
    final decoded = jsonDecode(response.body);
    if (decoded is Map<String, dynamic>) return decoded;
    return {'data': decoded};
  }

  Map<String, String> _composeHeaders(Map<String, String>? headers) {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if ((_token ?? '').isNotEmpty) 'Authorization': 'Bearer $_token',
      ...?headers,
    };
  }

  void _throwIfError(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return;
    }
    final body = response.body.isEmpty ? '{}' : response.body;
    final decoded = jsonDecode(body);
    final message = decoded is Map<String, dynamic>
        ? decoded['message']?.toString() ?? body
        : body;
    throw ApiException(response.statusCode, message);
  }
}

class ApiException implements Exception {
  ApiException(this.statusCode, this.message);

  final int statusCode;
  final String message;

  @override
  String toString() => 'ApiException($statusCode): $message';
}
