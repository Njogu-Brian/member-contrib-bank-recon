import 'package:flutter/material.dart';

import '../../../models/member.dart';

class LatePaymentBanner extends StatelessWidget {
  const LatePaymentBanner({super.key, required this.members});

  final List<Member> members;

  @override
  Widget build(BuildContext context) {
    if (members.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.redAccent),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.warning_amber_rounded, color: Colors.red),
              SizedBox(width: 8),
              Text(
                'Late payment alerts',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...members.take(3).map(
            (member) => Text(
              '${member.name} is ${(member.statusLabel ?? member.status).toLowerCase()}',
              style: const TextStyle(color: Colors.red),
            ),
              ),
          if (members.length > 3)
            Text(
              '+${members.length - 3} more members require attention',
              style: const TextStyle(color: Colors.red),
            ),
        ],
      ),
    );
  }
}

