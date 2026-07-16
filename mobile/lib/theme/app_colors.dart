import 'package:flutter/material.dart';

/// Single source of truth for the app's color palette.
/// Every screen should pull colors from here instead of hardcoding hex
/// values, so the whole app stays visually consistent and easy to retheme.
class AppColors {
  AppColors._();

  // Brand purple family — everything derived from one base color
  // (the darker of the two purples that were previously mixed in).
  static const Color primary = Color(0xFF6C63C4);
  static const Color primaryDark = Color(0xFF4E4690);
  static const Color primaryLight = Color(0xFF9B94D6);

  // Page background
  static const Color background = Color(0xFFE1D9F0);

  // Accent — ratings, star icons, "trending" highlights
  static const Color accent = Color(0xFFFFC107);

  // Semantic
  static const Color destructive = Color(0xFFD64545);
  static const Color onDestructive = Colors.white;

  // Text
  static const Color textPrimary = Colors.black87;
  static const Color textSecondary = Color(0xFF5C5470);
}
