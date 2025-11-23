import 'package:flutter/material.dart';

import '../../models/notification_item.dart';

class NotificationTile extends StatelessWidget {
  const NotificationTile({
    super.key,
    required this.item,
  });

  final NotificationItem item;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      leading: Icon(
        Icons.notifications_active,
        color: item.status == 'sent' ? Colors.green : Colors.orange,
      ),
      title: Text(item.type),
      subtitle: Text(
        '${item.channel.toUpperCase()} • ${item.sentAt?.toIso8601String() ?? 'Pending'}',
      ),
      trailing: Text(
        item.status.toUpperCase(),
        style: Theme.of(context)
            .textTheme
            .labelSmall
            ?.copyWith(color: Colors.grey[700]),
      ),
    );
  }
}

