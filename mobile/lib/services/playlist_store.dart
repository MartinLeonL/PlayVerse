import 'package:flutter/material.dart';
import '../widgets/media_row.dart';
import '../services/api_service.dart';
import '../services/media_service.dart';

class PlaylistStore extends ChangeNotifier {
  static final PlaylistStore instance = PlaylistStore._internal();
  PlaylistStore._internal();

  final Map<String, List<MediaItem>> playlists = {};

  Future<void> loadPlaylists() async {
    final userId = await ApiService().getCurrentUserId();
    if (userId == null) return;

    try {
      final names = await ApiService().getPlaylistNames(userId: userId);
      playlists.clear();
      for (final name in names) {
        playlists[name] = [];
      }

      final results = await ApiService().getRankedMedia(userId: userId);

      final toHydrate = results
          .where((item) => item['MediaId'] != null && item['PlaylistName'] != null)
          .map((item) => {
                'mediaId': item['MediaId'] as String,
                'mediaType': (item['MediaType'] ?? 'movie') as String,
              })
          .toList();

      final hydrated = await MediaService().hydrateMedia(toHydrate);
      final hydratedById = {for (final item in hydrated) item.mediaId: item};

      for (var item in results) {
        final playlistName = item['PlaylistName'] as String?;
        final mediaId = item['MediaId'] as String?;
        if (playlistName == null || mediaId == null) continue;

        final mediaItem = hydratedById[mediaId] ??
            MediaItem(
              mediaId: mediaId,
              mediaType: item['MediaType'] ?? 'movie',
              title: item['Title'],
              imageUrl: 'https://image.tmdb.org/t/p/w342/default.jpg',
            );
        playlists.putIfAbsent(playlistName, () => []).add(mediaItem);
      }
      notifyListeners();
    } catch (e) {
      print('Failed to load playlists from API: $e');
    }
  }

  Future<void> createPlaylist(String name) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty || playlists.containsKey(trimmed)) return;

    playlists[trimmed] = [];
    notifyListeners();

    final userId = await ApiService().getCurrentUserId();
    if (userId == null) return; // guest/no-login — stays local-only

    try {
      await ApiService().createPlaylistBackend(userId: userId, playlistName: trimmed);
    } catch (e) {
      print('Failed to create playlist on backend: $e');
      playlists.remove(trimmed);
      notifyListeners();
    }
  }

  Future<String?> addItemToPlaylist(String playlistName, MediaItem item) async {
    final alreadyThere = playlists[playlistName]?.any((existing) => existing.mediaId == item.mediaId) ?? false;
    if (alreadyThere) return 'Already in this playlist';

    playlists.putIfAbsent(playlistName, () => []).add(item);
    notifyListeners();

    final userId = await ApiService().getCurrentUserId();
    if (userId == null) return null; // guest/no-login — stays local-only

    try {
      await ApiService().addMedia(
        userId: userId,
        mediaId: item.mediaId,
        title: item.title,
        mediaType: item.mediaType,
        playlistName: playlistName,
      );
      return null;
    } catch (e) {
      playlists[playlistName]?.removeWhere((existing) => existing.mediaId == item.mediaId);
      notifyListeners();
      return e.toString();
    }
  }


  Future<void> removeItemFromPlaylist(String playlistName, MediaItem item) async {
    final removed = playlists[playlistName]?.firstWhere(
      (existing) => existing.mediaId == item.mediaId,
      orElse: () => item,
    );

    playlists[playlistName]?.removeWhere((existing) => existing.mediaId == item.mediaId);
    notifyListeners();

    final userId = await ApiService().getCurrentUserId();
    if (userId == null) return;

    try {
      await ApiService().removeMedia(userId: userId, mediaId: item.mediaId, playlistName: playlistName);
    } catch (e) {
      print('Failed to remove from backend: $e');
      if (removed != null) {
        playlists.putIfAbsent(playlistName, () => []).add(removed);
        notifyListeners();
      }
    }
  }

  Future<void> deletePlaylist(String name) async {
    final removedItems = playlists[name];
    playlists.remove(name);
    notifyListeners();

    final userId = await ApiService().getCurrentUserId();
    if (userId == null) return;

    try {
      await ApiService().deletePlaylistBackend(userId: userId, playlistName: name);
    } catch (e) {
      print('Failed to delete playlist on backend: $e');
      playlists[name] = removedItems ?? [];
      notifyListeners();
    }
  }
}