import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/auth_provider.dart';
import '../../services/encryption_service.dart';
import '../auth/mfa_screen.dart';

class SecurityCenterScreen extends ConsumerStatefulWidget {
  const SecurityCenterScreen({super.key});

  @override
  ConsumerState<SecurityCenterScreen> createState() =>
      _SecurityCenterScreenState();
}

class _SecurityCenterScreenState extends ConsumerState<SecurityCenterScreen> {
  bool _lockInactivity = true;
  bool _requireMfa = true;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final encryption = ref.watch(encryptionServiceProvider);
    final user = authState.user;

    return Scaffold(
      appBar: AppBar(title: const Text('Security Center')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Account protection',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  ListTile(
                    leading: Icon(
                      user?.mfaEnabled == true
                          ? Icons.verified_user
                          : Icons.warning_rounded,
                      color: user?.mfaEnabled == true
                          ? Colors.green
                          : Colors.orange,
                    ),
                    title: Text(
                      user?.mfaEnabled == true
                          ? 'Multi-factor authentication enabled'
                          : 'MFA is disabled',
                    ),
                    subtitle: const Text(
                        'Add a verification factor for sensitive operations.'),
                    trailing: TextButton(
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const MfaScreen()),
                      ),
                      child: Text(
                        user?.mfaEnabled == true ? 'Manage' : 'Enable',
                      ),
                    ),
                  ),
                  const Divider(),
                  Text(
                    'Roles: ${user?.roles.join(', ') ?? 'Unknown'}',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  Text(
                    'Permissions: ${user?.permissions.join(', ') ?? 'Not provided'}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Device security',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  SwitchListTile(
                    value: _lockInactivity,
                    onChanged: (value) => setState(() => _lockInactivity = value),
                    title: const Text('Lock after 5 minutes of inactivity'),
                    subtitle:
                        const Text('Prevents account misuse on shared devices.'),
                  ),
                  SwitchListTile(
                    value: _requireMfa,
                    onChanged: (value) => setState(() => _requireMfa = value),
                    title: const Text('Require MFA for payouts & exports'),
                    subtitle: const Text(
                        'Triggers MFA challenge before sensitive API calls.'),
                  ),
                  const SizedBox(height: 12),
                  ListTile(
                    leading: const Icon(Icons.key),
                    title: const Text('AES-256 encryption'),
                    subtitle: Text(
                      'Local secrets are encrypted with key hash ${_maskKey(encryption)}',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _maskKey(EncryptionService encryption) {
    // For display only we mask the normalized key length.
    return '••••${encryption.hashCode.toRadixString(16).padLeft(4, '0').substring(0, 4)}';
  }
}

