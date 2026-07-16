import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class BottomInfoBar extends StatelessWidget {
  const BottomInfoBar({super.key});

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: 0,
      right: 0,
      bottom: 0,
      child: Container(
        color: AppColors.primaryDark,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                color: Colors.white24,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.explore, color: Colors.white, size: 16),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Discover movies, shows, music, and games in one place',
                style: TextStyle(color: Colors.white, fontSize: 13),
              ),
            ),
          ],
        ),
      ),
    );
  }
}