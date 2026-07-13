import 'dart:async';
import 'package:flutter/material.dart';

class TopNavBar extends StatefulWidget {
  const TopNavBar({super.key});

  @override
  State<TopNavBar> createState() => _TopNavBarState();
}

class _TopNavBarState extends State<TopNavBar> {
  final List<Map<String, dynamic>> _mediaTypes = [
    {'label': 'Movies', 'icon': Icons.local_movies},
    {'label': 'TV Shows', 'icon': Icons.tv},
    {'label': 'Music', 'icon': Icons.music_note},
    {'label': 'Games', 'icon': Icons.sports_esports},
  ];

  int _currentIndex = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 5), (timer) {
      _goToNext();
    });
  }

  void _goToNext() {
    setState(() {
      _currentIndex = (_currentIndex + 1) % _mediaTypes.length;
    });
  }

  void _goToPrevious() {
    setState(() {
      _currentIndex = (_currentIndex - 1 + _mediaTypes.length) % _mediaTypes.length;
    });
  }

  void _onArrowTap(VoidCallback action) {
    action();
    _startTimer(); // reset the 5-second clock whenever the user manually taps
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final current = _mediaTypes[_currentIndex];

    final topPadding = MediaQuery.of(context).padding.top;
    return Positioned(
      top: topPadding +12,
      left: 20,
      right: 20,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          GestureDetector(
            onTap: () => _onArrowTap(_goToPrevious),
            child: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 22),
          ),
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: Container(
              key: ValueKey(current['label']),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(current['icon'], color: Colors.deepPurple, size: 18),
                  const SizedBox(width: 6),
                  Text(
                    current['label'],
                    style: const TextStyle(
                      color: Colors.deepPurple,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
          GestureDetector(
            onTap: () => _onArrowTap(_goToNext),
            child: const Icon(Icons.arrow_forward_ios, color: Colors.white, size: 22),
          ),
        ],
      ),
    );
  }
}