import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../../providers/auth_provider.dart';
import '../../utils/validators.dart';

class PasswordResetScreen extends HookConsumerWidget {
  const PasswordResetScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final emailController = useTextEditingController();
    final formKey = useMemoized(GlobalKey<FormState>.new);
    final notifier = ref.read(authControllerProvider.notifier);
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    Future<void> submit() async {
      if (!(formKey.currentState?.validate() ?? false)) return;
      try {
        await notifier.requestPasswordReset(emailController.text);
        if (!context.mounted) return;
        scaffoldMessenger.showSnackBar(
          const SnackBar(content: Text('Reset instructions sent if account exists.')),
        );
        Navigator.of(context).pop();
      } catch (_) {}
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Password reset')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: formKey,
          child: Column(
            children: [
              TextFormField(
                controller: emailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                ),
                validator: validateEmail,
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: submit,
                  child: const Text('Send reset link'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

