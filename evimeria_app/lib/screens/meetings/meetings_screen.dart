import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../models/meeting.dart';
import '../../providers/meeting_provider.dart';
import '../../widgets/loading_overlay.dart';

class MeetingsScreen extends ConsumerWidget {
  const MeetingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final meetings = ref.watch(meetingProvider);
    final notifier = ref.read(meetingProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Meetings & Voting'),
        actions: [
          IconButton(onPressed: notifier.refresh, icon: const Icon(Icons.refresh)),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openMeetingSheet(context, notifier),
        label: const Text('Schedule meeting'),
        icon: const Icon(Icons.add),
      ),
      body: meetings.when(
        data: (items) => LoadingOverlay(
          isLoading: false,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: items.isEmpty
                ? [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(
                          'No meetings scheduled.',
                          style: TextStyle(color: Colors.grey[700]),
                        ),
                      ),
                    ),
                  ]
                : items
                    .map(
                      (meeting) => Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    meeting.title,
                                    style: const TextStyle(
                                        fontSize: 16, fontWeight: FontWeight.bold),
                                  ),
                                  Chip(label: Text(meeting.status.toUpperCase())),
                                ],
                              ),
                              if (meeting.scheduledFor != null)
                                Text(
                                  DateFormat('EEE, dd MMM yyyy • HH:mm')
                                      .format(meeting.scheduledFor!),
                                  style: TextStyle(color: Colors.grey[700]),
                                ),
                              if (meeting.location != null)
                                Text('Location: ${meeting.location}'),
                              const SizedBox(height: 8),
                              Text(meeting.description ?? 'No description provided.'),
                              const Divider(),
                              Row(
                                children: [
                                  TextButton.icon(
                                    onPressed: () =>
                                        _openMotionSheet(context, notifier, meeting),
                                    icon: const Icon(Icons.add_circle_outline),
                                    label: const Text('Add motion'),
                                  ),
                                ],
                              ),
                              ...meeting.motions.map(
                                (motion) => ListTile(
                                  title: Text(motion.title),
                                  subtitle: Text(motion.description ?? 'No description'),
                                  trailing: ElevatedButton(
                                    onPressed: () => _openVoteSheet(
                                      context,
                                      notifier,
                                      motion,
                                    ),
                                    child: const Text('Vote'),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    )
                    .toList(),
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }

  Future<void> _openMeetingSheet(
    BuildContext context,
    MeetingNotifier notifier,
  ) {
    final titleController = TextEditingController();
    final descriptionController = TextEditingController();
    final locationController = TextEditingController();
    DateTime? scheduled;
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: titleController,
              decoration: const InputDecoration(labelText: 'Title'),
            ),
            TextField(
              controller: descriptionController,
              decoration: const InputDecoration(labelText: 'Description'),
            ),
            TextField(
              controller: locationController,
              decoration: const InputDecoration(labelText: 'Location'),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      final now = DateTime.now();
                      final pickedDate = await showDatePicker(
                        context: context,
                        firstDate: now,
                        lastDate: now.add(const Duration(days: 365)),
                        initialDate: now,
                      );
                      if (pickedDate != null) {
                        if (!context.mounted) return;
                        final pickedTime = await showTimePicker(
                          context: context,
                          initialTime: TimeOfDay.now(),
                        );
                        if (pickedTime != null) {
                          scheduled = DateTime(
                            pickedDate.year,
                            pickedDate.month,
                            pickedDate.day,
                            pickedTime.hour,
                            pickedTime.minute,
                          );
                        }
                      }
                    },
                    child: Text(
                      scheduled == null
                          ? 'Select date'
                          : DateFormat('dd MMM yyyy HH:mm').format(scheduled!),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                FilledButton(
                  onPressed: () async {
                    await notifier.createMeeting({
                      'title': titleController.text,
                      'description': descriptionController.text,
                      'scheduled_for': scheduled?.toIso8601String(),
                      'location': locationController.text,
                    });
                    if (!context.mounted) return;
                    Navigator.of(context).pop();
                  },
                  child: const Text('Save'),
                ),
              ],
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Future<void> _openMotionSheet(
    BuildContext context,
    MeetingNotifier notifier,
    Meeting meeting,
  ) {
    final titleController = TextEditingController();
    final descriptionController = TextEditingController();
    return showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add motion'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: titleController,
              decoration: const InputDecoration(labelText: 'Title'),
            ),
            TextField(
              controller: descriptionController,
              decoration: const InputDecoration(labelText: 'Description'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              await notifier.addMotion(meeting.id, {
                'title': titleController.text,
                'description': descriptionController.text,
              });
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Save'),
          )
        ],
      ),
    );
  }

  Future<void> _openVoteSheet(
    BuildContext context,
    MeetingNotifier notifier,
    Motion motion,
  ) {
    String choice = 'yes';
    return showModalBottomSheet(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(motion.title, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              DropdownButton<String>(
                value: choice,
                items: const [
                  DropdownMenuItem(value: 'yes', child: Text('Yes')),
                  DropdownMenuItem(value: 'no', child: Text('No')),
                  DropdownMenuItem(value: 'abstain', child: Text('Abstain')),
                ],
                onChanged: (value) => setState(() => choice = value ?? 'yes'),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () async {
                    await notifier.vote(motion.id, choice);
                    if (!context.mounted) return;
                    Navigator.pop(context);
                  },
                  child: const Text('Submit vote'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

