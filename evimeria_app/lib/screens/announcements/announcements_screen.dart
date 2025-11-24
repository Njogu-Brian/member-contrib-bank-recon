import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/announcement.dart';
import '../../models/notification_message.dart';
import '../../models/notification_preference.dart';
import '../../providers/announcement_provider.dart';
import '../../widgets/loading_overlay.dart';

class AnnouncementsScreen extends ConsumerWidget {
  const AnnouncementsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final announcements = ref.watch(announcementsProvider);
    final notificationFeed = ref.watch(notificationsProvider);
    final preferences = ref.watch(notificationPreferenceProvider);
    final notifier = ref.read(notificationPreferenceProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Announcements & Notifications'),
      ),
      body: LoadingOverlay(
        isLoading: announcements.isLoading || preferences.isLoading,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            preferences.when(
              data: (prefs) => _PreferenceCard(
                preference: prefs,
                onChanged: notifier.update,
              ),
              loading: () => const SizedBox.shrink(),
              error: (error, stack) => Text('Failed to load preferences: $error'),
            ),
            const SizedBox(height: 16),
            announcements.when(
              data: (items) => _AnnouncementList(items: items),
              loading: () => const SizedBox.shrink(),
              error: (error, stack) => Text('Failed to load announcements: $error'),
            ),
            const SizedBox(height: 16),
            notificationFeed.when(
              data: (items) => _NotificationFeed(items: items),
              loading: () => const SizedBox.shrink(),
              error: (error, stack) => Text('Failed to load notifications: $error'),
            ),
          ],
        ),
      ),
    );
  }
}

class _AnnouncementList extends StatelessWidget {
  const _AnnouncementList({required this.items});

  final List<Announcement> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'No announcements yet.',
            style: TextStyle(color: Colors.grey[700]),
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Latest announcements', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        ...items.map(
          (announcement) => Card(
            child: ListTile(
              title: Text(announcement.title),
              subtitle: Text(
                announcement.body,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
              trailing: Text(
                announcement.publishedAt?.toLocal().toIso8601String().split('T').first ??
                    'Draft',
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _NotificationFeed extends StatelessWidget {
  const _NotificationFeed({required this.items});

  final List<NotificationMessage> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Recent notifications', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        ...items.take(5).map(
              (message) => ListTile(
                leading: const Icon(Icons.notifications),
                title: Text(message.type),
                subtitle: Text(message.message ?? 'No message body'),
                trailing: Text(message.status.toUpperCase()),
              ),
            ),
      ],
    );
  }
}

class _PreferenceCard extends StatefulWidget {
  const _PreferenceCard({
    required this.preference,
    required this.onChanged,
  });

  final NotificationPreference preference;
  final Future<void> Function(NotificationPreference preference) onChanged;

  @override
  State<_PreferenceCard> createState() => _PreferenceCardState();
}

class _PreferenceCardState extends State<_PreferenceCard> {
  late NotificationPreference _value;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _value = widget.preference;
  }

  @override
  void didUpdateWidget(covariant _PreferenceCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.preference != widget.preference) {
      _value = widget.preference;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Notification preferences',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            SwitchListTile(
              value: _value.emailEnabled,
              onChanged: (enabled) => setState(() {
                _value = _value.copyWith(emailEnabled: enabled);
              }),
              title: const Text('Email alerts'),
            ),
            SwitchListTile(
              value: _value.smsEnabled,
              onChanged: (enabled) => setState(() {
                _value = _value.copyWith(smsEnabled: enabled);
              }),
              title: const Text('SMS alerts'),
            ),
            SwitchListTile(
              value: _value.pushEnabled,
              onChanged: (enabled) => setState(() {
                _value = _value.copyWith(pushEnabled: enabled);
              }),
              title: const Text('Push notifications'),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton(
                onPressed: _saving
                    ? null
                    : () async {
                        final messenger = ScaffoldMessenger.of(context);
                        setState(() => _saving = true);
                        try {
                          await widget.onChanged(_value);
                          messenger.showSnackBar(
                            const SnackBar(content: Text('Preferences updated')),
                          );
                        } finally {
                          if (mounted) setState(() => _saving = false);
                        }
                      },
                child: Text(_saving ? 'Saving...' : 'Save preferences'),
              ),
            )
          ],
        ),
      ),
    );
  }
}

