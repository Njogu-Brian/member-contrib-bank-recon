import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../../models/kyc_profile.dart';
import '../../providers/auth_provider.dart';
import '../../providers/kyc_form_provider.dart';
import '../../utils/validators.dart';
import '../../widgets/loading_overlay.dart';

class KycWizardScreen extends HookConsumerWidget {
  const KycWizardScreen({super.key});

  static const routeName = '/kyc';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);
    final authNotifier = ref.read(authControllerProvider.notifier);
    final kycState = ref.watch(kycFormProvider);
    final kycNotifier = ref.read(kycFormProvider.notifier);
    final formKey = useMemoized(GlobalKey<FormState>.new);

    ref.listen(authControllerProvider, (previous, next) {
      if (next.errorMessage != null &&
          next.errorMessage != previous?.errorMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(next.errorMessage!)),
        );
      }
    });

    Future<void> pickDocument(String type) async {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
      );
      if (!context.mounted) return;
      if (result == null) return;
      final filePath = result.files.single.path;
      if (filePath == null) {
        if (kIsWeb) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('File upload on web not supported in this demo.'),
            ),
          );
        }
        return;
      }
      kycNotifier.attachDocument(type, File(filePath));
    }

    Future<void> submit() async {
      if (kycState.step == 0) {
        if (formKey.currentState?.validate() ?? false) {
          kycNotifier.nextStep();
        }
        return;
      }

      if (kycState.documents.values.any((file) => file == null)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Attach all required documents.')),
        );
        return;
      }

      final profile = KycProfile(
        nationalId: kycState.nationalId,
        phone: kycState.phone,
        address: kycState.address,
        dateOfBirth: kycState.dateOfBirth,
        status: 'in_review',
        bankAccount: kycState.bankAccount,
      );

      await authNotifier.updateProfile(profile);
      for (final entry in kycState.documents.entries) {
        final file = entry.value;
        if (file != null) {
          await authNotifier.uploadDocument(entry.key, file);
        }
      }
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('KYC submitted successfully.')),
        );
        Navigator.of(context).pop();
      }
      kycNotifier.reset();
    }

    Widget buildStepIndicator() {
      return Row(
        children: List.generate(2, (index) {
          final isActive = index == kycState.step;
          return Expanded(
            child: Container(
              height: 6,
              margin: const EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(
                color: isActive ? Colors.teal : Colors.grey.shade300,
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          );
        }),
      );
    }

    Widget buildPersonalForm() {
      return Form(
        key: formKey,
        child: Column(
          children: [
            TextFormField(
              initialValue: kycState.nationalId,
              decoration: const InputDecoration(labelText: 'National ID'),
              onChanged: (value) =>
                  kycNotifier.updatePersonalInfo(nationalId: value),
              validator: (value) =>
                  validateRequired(value, field: 'National ID'),
            ),
            const SizedBox(height: 16),
            TextFormField(
              initialValue: kycState.phone,
              decoration: const InputDecoration(labelText: 'Phone number'),
              onChanged: (value) =>
                  kycNotifier.updatePersonalInfo(phone: value),
              validator: (value) => validateRequired(value, field: 'Phone'),
            ),
            const SizedBox(height: 16),
            TextFormField(
              initialValue: kycState.address,
              decoration: const InputDecoration(labelText: 'Address'),
              onChanged: (value) =>
                  kycNotifier.updatePersonalInfo(address: value),
              validator: (value) => validateRequired(value, field: 'Address'),
            ),
            const SizedBox(height: 16),
            TextFormField(
              initialValue: kycState.bankAccount,
              decoration:
                  const InputDecoration(labelText: 'Bank account number'),
              onChanged: (value) =>
                  kycNotifier.updatePersonalInfo(bankAccount: value),
              validator: (value) =>
                  validateRequired(value, field: 'Bank account'),
            ),
            const SizedBox(height: 16),
            InputDatePickerFormField(
              firstDate: DateTime(1950),
              lastDate: DateTime.now(),
              initialDate: kycState.dateOfBirth ?? DateTime(1990, 1, 1),
              onDateSubmitted: (value) =>
                  kycNotifier.updatePersonalInfo(dateOfBirth: value),
            ),
          ],
        ),
      );
    }

    Widget buildDocumentUpload() {
      final entries = {
        'id': 'Government ID',
        'income': 'Proof of income',
        'bank': 'Bank statement',
      };

      return Column(
        children: entries.entries.map((entry) {
          final file = kycState.documents[entry.key];
          return Card(
            child: ListTile(
              title: Text(entry.value),
              subtitle: Text(
                file != null ? file.path.split(Platform.pathSeparator).last : 'No file selected',
              ),
              trailing: FilledButton(
                onPressed: () => pickDocument(entry.key),
                child: Text(file == null ? 'Upload' : 'Replace'),
              ),
            ),
          );
        }).toList(),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('KYC verification'),
        actions: [
          if (kycState.step > 0)
            TextButton(
              onPressed: () => kycNotifier.previousStep(),
              child: const Text('Back'),
            ),
        ],
      ),
      body: LoadingOverlay(
        isLoading: authState.isLoading,
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              buildStepIndicator(),
              const SizedBox(height: 24),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: kycState.step == 0
                      ? buildPersonalForm()
                      : buildDocumentUpload(),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: submit,
                  child: Text(kycState.step == 0 ? 'Next' : 'Submit'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

