import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';

/// Widget that monitors user activity and automatically logs out after inactivity
/// 
/// Tracks user interactions (touches, taps, scrolls) and resets a timer.
/// When the timer expires, the user is automatically logged out.
class InactivityTimeoutWidget extends ConsumerStatefulWidget {
  const InactivityTimeoutWidget({
    super.key,
    required this.child,
    this.timeoutMinutes = 480, // Default: 8 hours
  });

  final Widget child;
  final int timeoutMinutes;

  @override
  ConsumerState<InactivityTimeoutWidget> createState() =>
      _InactivityTimeoutWidgetState();
}

class _InactivityTimeoutWidgetState
    extends ConsumerState<InactivityTimeoutWidget>
    with WidgetsBindingObserver {
  Timer? _inactivityTimer;
  DateTime? _lastActivityTime;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _resetTimer();
  }

  @override
  void dispose() {
    _inactivityTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    
    if (state == AppLifecycleState.resumed) {
      // App came to foreground, check if session is still valid
      _resetTimer();
    } else if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      // App went to background, pause timer (but don't cancel)
      // Timer will resume when app comes back to foreground
    }
  }

  void _resetTimer() {
    final authState = ref.read(authControllerProvider);
    if (!authState.isAuthenticated) {
      _inactivityTimer?.cancel();
      return;
    }

    _lastActivityTime = DateTime.now();
    _inactivityTimer?.cancel();

    final timeoutDuration = Duration(minutes: widget.timeoutMinutes);
    _inactivityTimer = Timer(timeoutDuration, () {
      _handleTimeout();
    });
  }

  void _handleTimeout() {
    final authState = ref.read(authControllerProvider);
    if (authState.isAuthenticated) {
      // Logout user due to inactivity
      ref.read(authControllerProvider.notifier).logout();
    }
  }

  void _handleUserActivity() {
    if (_lastActivityTime != null) {
      final timeSinceLastActivity = DateTime.now().difference(_lastActivityTime!);
      // Only reset timer if significant time has passed (avoid rapid resets)
      if (timeSinceLastActivity.inSeconds > 1) {
        _resetTimer();
      }
    } else {
      _resetTimer();
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    
    // Only monitor activity if user is authenticated
    if (!authState.isAuthenticated) {
      _inactivityTimer?.cancel();
      return widget.child;
    }

    return GestureDetector(
      onTap: _handleUserActivity,
      onPanDown: (_) => _handleUserActivity(),
      onScaleStart: (_) => _handleUserActivity(),
      child: Listener(
        onPointerDown: (_) => _handleUserActivity(),
        onPointerMove: (_) => _handleUserActivity(),
        child: NotificationListener<ScrollNotification>(
          onNotification: (_) {
            _handleUserActivity();
            return false;
          },
          child: KeyboardListener(
            focusNode: FocusNode(),
            onKeyEvent: (event) {
              if (event is KeyDownEvent) {
                _handleUserActivity();
              }
            },
            child: widget.child,
          ),
        ),
      ),
    );
  }
}

