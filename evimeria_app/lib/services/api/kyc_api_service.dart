import 'dart:io';

import '../../models/kyc_profile.dart';
import '../../utils/constants.dart';
import '../api_service.dart';

class KycApiService {
  KycApiService(this._api);

  final ApiService _api;

  Future<KycProfile> fetchProfile() async {
    final response = await _api.get(AppConstants.kycProfilePath);
    return KycProfile.fromJson(response);
  }

  Future<KycProfile> updateProfile(KycProfile profile) async {
    final response =
        await _api.put(AppConstants.kycProfilePath, body: profile.toJson());
    return KycProfile.fromJson(response);
  }

  Future<void> uploadDocument({
    required String type,
    required File file,
  }) async {
    await _api.multipart(
      AppConstants.kycDocumentPath,
      fields: {'document_type': type},
      fileField: 'document',
      file: file,
    );
  }
}

