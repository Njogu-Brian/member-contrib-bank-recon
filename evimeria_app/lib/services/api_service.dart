import 'dart:convert';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

class ApiService {
  ApiService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  String get _baseUrl =>
      (dotenv.env['API_BASE_URL'] ?? 'http://127.0.0.1:8000/api')
          .trim()
          .replaceFirst(RegExp(r'/*$'), '');

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
    Map<String, String>? headers,
    String? token,
    Map<String, dynamic>? query,
  }) async {
    final response = await _client.get(
      _buildUri(path, query),
      headers: _composeHeaders(headers, token),
    );
    _throwIfError(response);
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
    String? token,
  }) async {
    final response = await _client.post(
      _buildUri(path),
      headers: _composeHeaders(headers, token),
      body: jsonEncode(body ?? {}),
    );
    _throwIfError(response);
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Map<String, String> _composeHeaders(
    Map<String, String>? headers,
    String? token,
  ) {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
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
