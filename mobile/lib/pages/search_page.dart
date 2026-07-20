import 'dart:async';
import 'package:flutter/material.dart';
import '../services/media_service.dart';
import '../services/playlist_store.dart';
import '../theme/app_colors.dart';
import '../widgets/media_row.dart';
import 'all_media_page.dart';

class SearchPage extends StatefulWidget {
  // When set, this page is in "add to playlist" mode: search results are
  // shown as a simple tappable list, and tapping one adds it directly to
  // this playlist instead of opening its detail page.
  final String? targetPlaylistName;

  const SearchPage({super.key, this.targetPlaylistName});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  final TextEditingController _controller = TextEditingController();
  String _query = '';
  Map<String, List<MediaItem>> _results = {};
  bool _isSearching = false;
  Timer? _debounce;

  bool get _isAddMode => widget.targetPlaylistName != null;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onQueryChanged(String value) {
    setState(() => _query = value);
    _debounce?.cancel();

    if (value.trim().isEmpty) {
      setState(() {
        _results = {};
        _isSearching = false;
      });
      return;
    }

    // Wait for a pause in typing before hitting the backend — searching
    // on every keystroke would spam TMDB/RAWG unnecessarily.
    _debounce = Timer(const Duration(milliseconds: 400), () => _runSearch(value));
  }

  Future<void> _runSearch(String query) async {
    setState(() => _isSearching = true);

    final movies = await MediaService().searchMovies(query);
    final shows = await MediaService().searchShows(query);
    final games = await MediaService().searchGames(query);
    final music = await MediaService().searchMusic(query);

    // If the user kept typing while this was in flight, a newer search
    // has already superseded it — drop this stale result.
    if (!mounted || query != _query) return;

    final results = <String, List<MediaItem>>{};
    if (movies.isNotEmpty) results['Movies'] = movies;
    if (shows.isNotEmpty) results['Shows'] = shows;
    if (games.isNotEmpty) results['Games'] = games;
    if (music.isNotEmpty) results['Music'] = music;

    setState(() {
      _results = results;
      _isSearching = false;
    });
  }

  List<String> get _matchedPlaylists {
    if (_query.isEmpty || _isAddMode) return [];
    final q = _query.toLowerCase();
    return PlaylistStore.instance.playlists.keys
        .where((name) => name.toLowerCase().contains(q))
        .toList();
  }

  Future<void> _addToTargetPlaylist(MediaItem item) async {
    final playlistName = widget.targetPlaylistName!;
    final error = await PlaylistStore.instance.addItemToPlaylist(playlistName, item);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error == null ? 'Added "${item.title}" to $playlistName' : 'Failed to add: $error')),
      );
      if (error == null) Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final playlistMatches = _matchedPlaylists;
    final hasResults = _results.isNotEmpty || playlistMatches.isNotEmpty;

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
            onChanged: _onQueryChanged,
            decoration: InputDecoration(
              hintText: _isAddMode ? 'Search to add to ${widget.targetPlaylistName}' : 'Search movies, shows, music, games...',
              border: InputBorder.none,
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              prefixIcon: const Icon(Icons.search, color: Colors.grey),
              suffixIcon: _query.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, color: Colors.grey),
                      onPressed: () {
                        _controller.clear();
                        _onQueryChanged('');
                      },
                    )
                  : null,
            ),
          ),
        ),
      ),
      body: _query.isEmpty
          ? Center(
              child: Text(
                _isAddMode
                    ? 'Search for something to add to ${widget.targetPlaylistName}.'
                    : 'Start typing to search movies, shows, and games.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textSecondary),
              ),
            )
          : _isSearching && !hasResults
              ? const Center(child: CircularProgressIndicator())
              : !hasResults
                  ? const Center(
                      child: Text(
                        'No matches found.',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                    )
                  : _isAddMode
                      ? _buildAddModeResults()
                      : _buildNormalResults(playlistMatches),
    );
  }

  // Add mode: flat tappable list, tap = add directly to the target playlist.
  Widget _buildAddModeResults() {
    return ListView(
      padding: const EdgeInsets.symmetric(vertical: 12),
      children: _results.entries.expand((entry) {
        return [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Text(
              entry.key,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primaryDark),
            ),
          ),
          ...entry.value.map((item) {
            return ListTile(
              leading: ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: Image.network(
                  item.imageUrl,
                  width: 46,
                  height: 66,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(
                    width: 46,
                    height: 66,
                    color: Colors.grey[300],
                    child: const Icon(Icons.image_not_supported, size: 18, color: Colors.grey),
                  ),
                ),
              ),
              title: Text(item.title),
              subtitle: item.genres.isNotEmpty ? Text(item.genres.take(2).join(', ')) : null,
              trailing: const Icon(Icons.add_circle_outline, color: AppColors.primary),
              onTap: () => _addToTargetPlaylist(item),
            );
          }),
        ];
      }).toList(),
    );
  }

  // Normal mode: same as before — playlist name matches, plus each
  // category as its own horizontal MediaRow.
  Widget _buildNormalResults(List<String> playlistMatches) {
    return ListView(
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
        ..._results.entries.map((entry) {
          return MediaRow(
            categoryTitle: entry.key,
            items: entry.value,
            loop: false,
          );
        }),
      ],
    );
  }
}