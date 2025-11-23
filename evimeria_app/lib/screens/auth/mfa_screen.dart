import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../../providers/auth_provider.dart';
import '../../widgets/loading_overlay.dart';

class MfaScreen extends HookConsumerWidget {
  const MfaScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final codeController = useTextEditingController();
    final formKey = useMemoized(GlobalKey<FormState>.new);
    final authState = ref.watch(authControllerProvider);
    final notifier = ref.read(authControllerProvider.notifier);

    ref.listen(authControllerProvider, (previous, next) {
      if (next.errorMessage != null &&
          next.errorMessage != previous?.errorMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(next.errorMessage!)),
        );
      }
    });

    return Scaffold(
      appBar: AppBar(title: const Text('Multi-factor authentication')),
      body: LoadingOverlay(
        isLoading: authState.isLoading,
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Enter the 6-digit code from your authenticator app to enable MFA. '
                'You can also disable MFA if it is already enabled.',
              ),
              const SizedBox(height: 24),
              Form(
                key: formKey,
                child: TextFormField(
                  controller: codeController,
                  maxLength: 6,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'One-time code',
                  ),
                  validator: (value) {
                    if (value == null || value.length != 6) {
                      return 'Enter the 6-digit code';
                    }
                    return null;
                  },
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  FilledButton(
                    onPressed: () {
                      if (formKey.currentState?.validate() ?? false) {
                        notifier.enableMfa(codeController.text);
                      }
                    },
                    child: const Text('Enable MFA'),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton(
                    onPressed: () => notifier.disableMfa(),
                    child: const Text('Disable MFA'),
                  )
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

