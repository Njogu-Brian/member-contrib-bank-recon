import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';

class KycFormState {
  const KycFormState({
    this.step = 0,
    this.nationalId = '',
    this.phone = '',
    this.address = '',
    this.bankAccount = '',
    this.dateOfBirth,
    this.documents = const {},
  });

  final int step;
  final String nationalId;
  final String phone;
  final String address;
  final String bankAccount;
  final DateTime? dateOfBirth;
  final Map<String, File?> documents;

  KycFormState copyWith({
    int? step,
    String? nationalId,
    String? phone,
    String? address,
    String? bankAccount,
    DateTime? dateOfBirth,
    Map<String, File?>? documents,
  }) {
    return KycFormState(
      step: step ?? this.step,
      nationalId: nationalId ?? this.nationalId,
      phone: phone ?? this.phone,
      address: address ?? this.address,
      bankAccount: bankAccount ?? this.bankAccount,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      documents: documents ?? this.documents,
    );
  }
}

final kycFormProvider =
    StateNotifierProvider<KycFormNotifier, KycFormState>((ref) {
  return KycFormNotifier();
});

class KycFormNotifier extends StateNotifier<KycFormState> {
  KycFormNotifier() : super(const KycFormState());

  void updatePersonalInfo({
    String? nationalId,
    String? phone,
    String? address,
    String? bankAccount,
    DateTime? dateOfBirth,
  }) {
    state = state.copyWith(
      nationalId: nationalId ?? state.nationalId,
      phone: phone ?? state.phone,
      address: address ?? state.address,
      bankAccount: bankAccount ?? state.bankAccount,
      dateOfBirth: dateOfBirth ?? state.dateOfBirth,
    );
  }

  void attachDocument(String type, File? file) {
    final docs = Map<String, File?>.from(state.documents);
    docs[type] = file;
    state = state.copyWith(documents: docs);
  }

  void nextStep() {
    state = state.copyWith(step: state.step + 1);
  }

  void previousStep() {
    state = state.copyWith(step: state.step > 0 ? state.step - 1 : 0);
  }

  void reset() {
    state = const KycFormState();
  }
}

