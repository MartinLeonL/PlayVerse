import 'package:flutter/material.dart';
import '../data/media_catalog.dart';
import '../theme/app_colors.dart';
import '../widgets/app_shell.dart';
import '../widgets/home_banner.dart';
import '../widgets/media_row.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadCatalog();
  }

  Future<void> _loadCatalog() async {
    await MediaCatalog.loadAll();
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return AppShell(
        body: const Center(child: CircularProgressIndicator()),
      );
    }

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