import 'package:flutter/material.dart';

import '../models/member.dart';
import '../services/member_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, required this.token, required this.user});

  final String token;
  final Map<String, dynamic> user;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final MemberService _memberService = MemberService();
  late Future<List<Member>> _membersFuture;

  @override
  void initState() {
    super.initState();
    _membersFuture = _memberService.fetchMembers(widget.token);
  }

  Future<void> _refresh() async {
    setState(() {
      _membersFuture = _memberService.fetchMembers(widget.token);
    });
    await _membersFuture;
  }

  @override
  Widget build(BuildContext context) {
    final tokenPreview = widget.token.substring(
      0,
      widget.token.length > 12 ? 12 : widget.token.length,
    );
    return Scaffold(
      appBar: AppBar(title: const Text('Dashboard')),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              'Welcome ${widget.user['name'] ?? 'Member'}',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text('Token preview: $tokenPreview...'),
            const SizedBox(height: 24),
            Text(
              'Members',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            FutureBuilder<List<Member>>(
              future: _membersFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Text(
                    'Failed to load members: ${snapshot.error}',
                    style: const TextStyle(color: Colors.red),
                  );
                }
                final members = snapshot.data ?? [];
                if (members.isEmpty) {
                  return const Text('No members found yet.');
                }
                return Column(
                  children: members
                      .map(
                        (member) => Card(
                          child: ListTile(
                            title: Text(member.name),
                            subtitle: Text(member.email),
                            trailing: Text(member.status),
                          ),
                        ),
                      )
                      .toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
