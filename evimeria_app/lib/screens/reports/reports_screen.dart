import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../models/audit_log.dart';
import '../../models/report_export.dart';
import '../../models/report_summary.dart';
import '../../providers/audit_provider.dart';
import '../../providers/report_provider.dart';
import '../../widgets/dashboard/stat_card.dart';
import '../compliance/compliance_screen.dart';
import '../security/security_center_screen.dart';

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(reportProvider);
    final notifier = ref.read(reportProvider.notifier);
    final audits = ref.watch(auditLogsProvider);
    final summary = state.summary;
    final currency = NumberFormat.currency(symbol: 'KES ');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Reports & Analytics'),
        actions: [
          IconButton(
            tooltip: 'Security Center',
            icon: const Icon(Icons.security),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const SecurityCenterScreen()),
            ),
          ),
          IconButton(
            tooltip: 'Compliance',
            icon: const Icon(Icons.privacy_tip_outlined),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const ComplianceScreen()),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: notifier.refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (state.isLoading && summary == null)
              const Center(child: CircularProgressIndicator())
            else if (summary != null)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 16,
                    runSpacing: 16,
                    children: [
                      SizedBox(
                        width: 220,
                        child: StatCard(
                          label: 'Wallet balance',
                          value: currency.format(summary.totalWalletBalance),
                          icon: Icons.account_balance_wallet_outlined,
                        ),
                      ),
                      SizedBox(
                        width: 220,
                        child: StatCard(
                          label: 'Monthly contributions',
                          value: currency.format(summary.monthlyContributions),
                          icon: Icons.savings_outlined,
                          color: Colors.indigo,
                        ),
                      ),
                      SizedBox(
                        width: 220,
                        child: StatCard(
                          label: 'Monthly expenses',
                          value: currency.format(summary.monthlyExpenses),
                          icon: Icons.money_off_csred_outlined,
                          color: Colors.redAccent,
                        ),
                      ),
                      SizedBox(
                        width: 220,
                        child: StatCard(
                          label: 'ROI year-to-date',
                          value: '${summary.roiYearToDate.toStringAsFixed(2)}%',
                          icon: Icons.percent,
                          color: Colors.green,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Financial trend',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            height: 220,
                            child: ReportTrendChart(summary: summary),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            const SizedBox(height: 24),
            _ExportList(
              exports: state.exports,
              onRequest: (type, format) =>
                  notifier.requestExport(type, format),
            ),
            const SizedBox(height: 24),
            audits.when(
              data: (logs) => _AuditPreview(logs: logs),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Text('Failed to load audit logs: $error'),
            ),
          ],
        ),
      ),
    );
  }
}

class ReportTrendChart extends StatelessWidget {
  const ReportTrendChart({super.key, required this.summary});

  final ReportSummary summary;

  @override
  Widget build(BuildContext context) {
    final expenseSpots = summary.expenseTrend
        .asMap()
        .entries
        .map((entry) => FlSpot(entry.key.toDouble(), entry.value.value))
        .toList();
    final contributionSpots = summary.contributionTrend
        .asMap()
        .entries
        .map((entry) => FlSpot(entry.key.toDouble(), entry.value.value))
        .toList();

    return LineChart(
      LineChartData(
        gridData: const FlGridData(show: false),
        titlesData: FlTitlesData(
          leftTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: true, reservedSize: 48),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                final index = value.toInt();
                if (index < 0 ||
                    index >= summary.contributionTrend.length) {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    summary.contributionTrend[index].label,
                    style: const TextStyle(fontSize: 11),
                  ),
                );
              },
            ),
          ),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        lineBarsData: [
          LineChartBarData(
            spots: contributionSpots,
            color: Colors.teal,
            barWidth: 3,
            isCurved: true,
            dotData: const FlDotData(show: false),
          ),
          LineChartBarData(
            spots: expenseSpots,
            color: Colors.redAccent,
            barWidth: 3,
            isCurved: true,
            dotData: const FlDotData(show: false),
          ),
        ],
        borderData: FlBorderData(show: false),
      ),
    );
  }
}

class _ExportList extends StatelessWidget {
  const _ExportList({
    required this.exports,
    required this.onRequest,
  });

  final List<ReportExport> exports;
  final Future<void> Function(String type, String format) onRequest;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Report exports',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
                FilledButton.icon(
                  onPressed: () => _openExportSheet(context),
                  icon: const Icon(Icons.file_download),
                  label: const Text('Request export'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (exports.isEmpty)
              const Text('No exports requested yet.')
            else
              ...exports.map(
                (export) => ListTile(
                  title: Text('${export.type.toUpperCase()} • ${export.format.toUpperCase()}'),
                  subtitle: Text(export.createdAt != null
                      ? 'Requested ${DateFormat('dd MMM yyyy HH:mm').format(export.createdAt!)}'
                      : 'Pending'),
                  trailing: Chip(
                    label: Text(export.status.toUpperCase()),
                    backgroundColor: export.isReady
                        ? Colors.green.withValues(alpha: .15)
                        : Colors.orange.withValues(alpha: .15),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _openExportSheet(BuildContext context) async {
    String type = 'summary';
    String format = 'pdf';
    final result = await showModalBottomSheet<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 16,
            bottom: 16 + MediaQuery.of(context).viewInsets.bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: type,
                decoration: const InputDecoration(labelText: 'Report type'),
                items: const [
                  DropdownMenuItem(value: 'summary', child: Text('Summary')),
                  DropdownMenuItem(value: 'expenses', child: Text('Expenses')),
                  DropdownMenuItem(value: 'contributions', child: Text('Contributions')),
                  DropdownMenuItem(value: 'audits', child: Text('Audit trail')),
                ],
                onChanged: (value) => setState(() => type = value ?? 'summary'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: format,
                decoration: const InputDecoration(labelText: 'Format'),
                items: const [
                  DropdownMenuItem(value: 'pdf', child: Text('PDF')),
                  DropdownMenuItem(value: 'csv', child: Text('CSV')),
                  DropdownMenuItem(value: 'xlsx', child: Text('Excel')),
                ],
                onChanged: (value) => setState(() => format = value ?? 'pdf'),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('Request export'),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    if (result == true) {
      await onRequest(type, format);
    }
  }
}

class _AuditPreview extends StatelessWidget {
  const _AuditPreview({required this.logs});

  final List<AuditLogEntry> logs;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Latest audit activity',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            if (logs.isEmpty)
              const Text('No audit events recorded.')
            else
              ...logs.take(5).map(
                (log) => ListTile(
                  leading: const Icon(Icons.verified_user_outlined),
                  title: Text('${log.actor} • ${log.module}'),
                  subtitle: Text(log.action),
                  trailing: Text(
                    log.createdAt != null
                        ? DateFormat('dd MMM HH:mm').format(log.createdAt!)
                        : '',
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

