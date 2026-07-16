import 'package:flutter/material.dart';
import '../widgets/media_row.dart';
import '../services/api_service.dart';

class PlaylistStore extends ChangeNotifier {
  static final PlaylistStore instance = PlaylistStore._internal();
  PlaylistStore._internal();

  final Map<String, List<MediaItem>> playlists = {};

  // Load user's playlists from the backend
  Future<void> loadPlaylists() async {
    final userId = await ApiService().getCurrentUserId();
    if (userId == null) return;

    try {
      final results = await ApiService().getRankedMedia(userId: userId);

      // Clear and rebuild from API
      playlists.clear();

      // Group by MediaType
      for (var item in results) {
        final type = item['MediaType'] ?? 'Other';
        final mediaItem = MediaItem(
          title: item['Title'],
          imageUrl: 'https://image.tmdb.org/t/p/w342/default.jpg', // placeholder 
        );
        playlists.putIfAbsent(type, () => []).add(mediaItem);
      }
      notifyListeners();
    } catch (e) {
      print('Failed to load playlists from API: $e');
    }
  }

  Future<void> addItemToPlaylist(String playlistName, MediaItem item) async {
    final userId = await ApiService().getCurrentUserId();
    if (userId == null) return;

    try {
      await ApiService().addMedia(
        userId: userId,
        mediaId: item.title,           // using title as mediaId for now
        title: item.title,
        mediaType: playlistName,       // or a fixed type like 'movie'
      );

      playlists.putIfAbsent(playlistName, () => []).add(item);
      notifyListeners();
    } catch (e) {
      print('Failed to add to playlist: $e');
    }
  }

  Future<void> deletePlaylist(String name) async {
    playlists.remove(name);
    notifyListeners();
    // You can add a delete endpoint later if needed
  }

  Future<void> createPlaylist(String name) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty || playlists.containsKey(trimmed)) return;
    playlists[trimmed] = [];
    notifyListeners();
  }
}