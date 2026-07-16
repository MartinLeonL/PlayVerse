import 'package:flutter/material.dart';
import '../data/media_catalog.dart';
import '../services/playlist_store.dart';
import '../theme/app_colors.dart';
import '../widgets/media_row.dart';
import 'all_media_page.dart';

class SearchPage extends StatefulWidget {
  const SearchPage({super.key});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  final TextEditingController _controller = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Map<String, List<MediaItem>> get _matchedCategories {
    if (_query.isEmpty) return {};
    final q = _query.toLowerCase();
    final result = <String, List<MediaItem>>{};
    MediaCatalog.categories.forEach((category, items) {
      final matches = items.where((item) => item.title.toLowerCase().contains(q)).toList();
      if (matches.isNotEmpty) result[category] = matches;
    });
    return result;
  }

  List<String> get _matchedPlaylists {
    if (_query.isEmpty) return [];
    final q = _query.toLowerCase();
    return PlaylistStore.instance.playlists.keys
        .where((name) => name.toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final categories = _matchedCategories;
    final playlistMatches = _matchedPlaylists;
    final hasResults = categories.isNotEmpty || playlistMatches.isNotEmpty;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        elevation: 0,
        titleSpacing: 8,
        title: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
          ),
          child: TextField(
            controller: _controller,
            autofocus: true,
            onChanged: (value) => setState(() => _query = value),
            decoration: InputDecoration(
              hintText: 'Search movies, shows, music, games...',
              border: InputBorder.none,
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              prefixIcon: const Icon(Icons.search, color: Colors.grey),
              suffixIcon: _query.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, color: Colors.grey),
                      onPressed: () {
                        _controller.clear();
                        setState(() => _query = '');
                      },
                    )
                  : null,
            ),
          ),
        ),
      ),
      body: _query.isEmpty
          ? const Center(
              child: Text(
                'Start typing to search your library.',
                style: TextStyle(color: AppColors.textSecondary),
              ),
            )
          : !hasResults
              ? const Center(
                  child: Text(
                    'No matches found.',
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.only(top: 16, bottom: 24),
                  children: [
                    if (playlistMatches.isNotEmpty) ...[
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 20),
                        child: Text(
                          'Playlists',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primaryDark),
                        ),
                      ),
                      const SizedBox(height: 4),
                      ...playlistMatches.map((name) {
                        return ListTile(
                          leading: const Icon(Icons.playlist_play, color: AppColors.primary),
                          title: Text(name),
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => AllMediaPage(
                                  title: name,
                                  items: PlaylistStore.instance.playlists[name] ?? [],
                                  isPlaylist: true,
                                ),
                              ),
                            );
                          },
                        );
                      }),
                      const SizedBox(height: 12),
                    ],
                    ...categories.entries.map((entry) {
                      return MediaRow(
                        categoryTitle: entry.key,
                        items: entry.value,
                        loop: false,
                      );
                    }),
                  ],
                ),
    );
  }
}