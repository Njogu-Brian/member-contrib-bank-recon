import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../providers/audit_provider.dart';
import '../../providers/report_provider.dart';

class ComplianceScreen extends ConsumerStatefulWidget {
  const ComplianceScreen({super.key});

  @override
  ConsumerState<ComplianceScreen> createState() => _ComplianceScreenState();
}

class _ComplianceScreenState extends ConsumerState<ComplianceScreen> {
  bool _gdprAcknowledged = true;
  bool _dataRetentionEnabled = true;

  @override
  Widget build(BuildContext context) {
    final logs = ref.watch(auditLogsProvider);
    final reportNotifier = ref.read(reportProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Compliance & Audit')),
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
                    'Policies',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  CheckboxListTile(
                    value: _gdprAcknowledged,
                    onChanged: (value) =>
                        setState(() => _gdprAcknowledged = value ?? false),
                    title: const Text('GDPR compliance statement'),
                    subtitle: const Text(
                        'We only store the minimum personal data required.'),
                  ),
                  CheckboxListTile(
                    value: _dataRetentionEnabled,
                    onChanged: (value) =>
                        setState(() => _dataRetentionEnabled = value ?? false),
                    title: const Text('90-day data retention'),
                    subtitle: const Text(
                        'Records older than 90 days are anonymized automatically.'),
                  ),
                  const SizedBox(height: 8),
                  FilledButton.icon(
                    onPressed: () =>
                        reportNotifier.requestExport('audits', 'csv'),
                    icon: const Icon(Icons.file_download),
                    label: const Text('Export audit trail'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          logs.when(
            data: (entries) => Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Audit timeline',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    if (entries.isEmpty)
                      const Text('No audit entries recorded yet.')
                    else
                      ...entries.map(
                        (entry) => ListTile(
                          leading: const Icon(Icons.history),
                          title: Text('${entry.actor} • ${entry.module}'),
                          subtitle: Text(entry.action),
                          trailing: Text(
                            entry.createdAt != null
                                ? DateFormat('dd MMM HH:mm')
                                    .format(entry.createdAt!)
                                : '',
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => Text('Failed to load audit logs: $error'),
          ),
        ],
      ),
    );
  }
}

