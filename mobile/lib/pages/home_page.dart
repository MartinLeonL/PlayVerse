import 'package:flutter/material.dart';
import '../data/media_catalog.dart';
import '../theme/app_colors.dart';
import '../widgets/app_shell.dart';
import '../widgets/home_banner.dart';
import '../widgets/media_row.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppShell(
      body: ListView(
        padding: const EdgeInsets.only(top: 16, bottom: 24),
        children: [
          const HomeBanner(),
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              'Trending',
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.primaryDark),
            ),
          ),
          const SizedBox(height: 12),
          MediaRow(categoryTitle: 'Movies', items: MediaCatalog.movies, titleOpensAll: true),
          MediaRow(categoryTitle: 'Shows', items: MediaCatalog.shows, titleOpensAll: true),
          MediaRow(categoryTitle: 'Music', items: MediaCatalog.music, titleOpensAll: true),
          MediaRow(categoryTitle: 'Games', items: MediaCatalog.games, titleOpensAll: true),
        ],
      ),
    );
  }
}
