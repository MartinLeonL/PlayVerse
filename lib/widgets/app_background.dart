import 'package:flutter/material.dart';

class AppBackground extends StatelessWidget {
  const AppBackground({super.key});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned.fill(
          child: Image.network(
            'https://image.tmdb.org/t/p/w780/kZ2nHVdcbGeMkgOMSbeCcwvpiV6.jpg',
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              return Container(
                color: Colors.grey[800],
                child: const Center(
                  child: Icon(
                    Icons.movie,
                    size: 80,
                    color: Colors.white54,
                  ),
                ),
              );
            },
          ),
        ),
        Positioned.fill(
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  const Color(0xFF6A3DE8).withValues(alpha: 0.75),
                  const Color(0xFFE87DC4).withValues(alpha: 0.55),
                  const Color(0xFF6A3DE8).withValues(alpha: 0.85),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}