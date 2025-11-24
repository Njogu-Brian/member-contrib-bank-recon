import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:encrypt/encrypt.dart' as encrypt;

class EncryptionService {
  EncryptionService({String? secret})
      : _key = encrypt.Key.fromUtf8(_normalizeSecret(secret)),
        _secureRandom = Random.secure();

  final encrypt.Key _key;
  final Random _secureRandom;
  static const _ivLength = 16;

  String encryptString(String value) {
    final ivBytes = _generateIvBytes();
    final iv = encrypt.IV(ivBytes);
    final encrypter = encrypt.Encrypter(encrypt.AES(_key, mode: encrypt.AESMode.cbc));
    final encrypted = encrypter.encrypt(value, iv: iv);
    final payload = Uint8List(_ivLength + encrypted.bytes.length)
      ..setAll(0, ivBytes)
      ..setAll(_ivLength, encrypted.bytes);
    return base64Encode(payload);
  }

  String? decryptString(String? cipherText) {
    if (cipherText == null || cipherText.isEmpty) return null;
    try {
      final raw = base64Decode(cipherText);
      if (raw.length <= _ivLength) return null;
      final ivBytes = raw.sublist(0, _ivLength);
      final dataBytes = raw.sublist(_ivLength);
      final encrypter = encrypt.Encrypter(
        encrypt.AES(_key, mode: encrypt.AESMode.cbc),
      );
      final decrypted = encrypter.decrypt(
        encrypt.Encrypted(dataBytes),
        iv: encrypt.IV(ivBytes),
      );
      return decrypted;
    } catch (_) {
      return null;
    }
  }

  Uint8List _generateIvBytes() {
    final bytes = Uint8List(_ivLength);
    for (var i = 0; i < bytes.length; i++) {
      bytes[i] = _secureRandom.nextInt(256);
    }
    return bytes;
  }

  static String _normalizeSecret(String? secret) {
    final fallback = 'EvimeriaLocalEncryptionKey';
    final base = (secret ?? fallback).padRight(32, '0');
    return base.substring(0, 32);
  }
}

