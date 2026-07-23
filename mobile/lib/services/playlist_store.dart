import 'package:flutter/material.dart';
import '../models/media_item.dart';
import '../models/playlist.dart';
import '../services/api_service.dart';
import '../services/media_service.dart';

class PlaylistStore extends ChangeNotifier {
  static final PlaylistStore instance = PlaylistStore._internal();
  PlaylistStore._internal();

  // A List, not a Map — playlists are identified by id, and the backend
  // allows duplicate names (two different playlists can both be called
  // "Favorites"), so a name-keyed structure can't represent that.
  final List<Playlist> playlists = [];

  Playlist? _findById(String playlistId) {
    try {
      return playlists.firstWhere((p) => p.id == playlistId);
    } catch (_) {
      return null;
    }
  }

  Future<void> loadPlaylists() async {
    final loggedIn = await ApiService().isLoggedIn();
    if (!loggedIn) return;

    try {
      final rawPlaylists = await ApiService().getCustomPlaylists();

      // Gather every saved item across every playlist and hydrate them
      // all in one batch, rather than one round-trip per playlist.
      final allRefs = <Map<String, String>>[];
      for (final raw in rawPlaylists) {
        final items = List<Map<String, dynamic>>.from(raw['items'] ?? []);
        for (final item in items) {
          allRefs.add({
            'mediaId': item['mediaId'] as String,
            'mediaType': item['mediaType'] as String,
          });
        }
      }

      final hydrated = await MediaService().hydrateItems(allRefs);
      final hydratedById = {for (final item in hydrated) item.id: item};

      playlists
        ..clear()
        ..addAll(rawPlaylists.map((raw) {
          final rawItems = List<Map<String, dynamic>>.from(raw['items'] ?? []);
          final mediaItems = rawItems
              .map((item) => hydratedById[item['mediaId']])
              .whereType<MediaItem>()
              .toList();

          return Playlist(
            id: raw['id'] as String,
            name: raw['name'] as String,
            items: mediaItems,
          );
        }));

      notifyListeners();
    } catch (e) {
      print('Failed to load playlists from API: $e');
    }
  }

  /// Not optimistic — the backend generates the playlist's real id, and
  /// every other operation needs that real id to work, so there's no
  /// good way to show it locally before the id actually exists.
  Future<Playlist?> createPlaylist(String name) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return null;

    try {
      final raw = await ApiService().createCustomPlaylist(trimmed);
      final playlist = Playlist(id: raw['id'] as String, name: raw['name'] as String);
      playlists.add(playlist);
      notifyListeners();
      return playlist;
    } catch (e) {
      print('Failed to create playlist: $e');
      return null;
    }
  }

  Future<void> renamePlaylist(String playlistId, String newName) async {
    final trimmed = newName.trim();
    if (trimmed.isEmpty) return;

    final playlist = _findById(playlistId);
    if (playlist == null) return;

    final previousName = playlist.name;
    playlist.name = trimmed;
    notifyListeners();

    try {
      await ApiService().renameCustomPlaylist(playlistId, trimmed);
    } catch (e) {
      print('Failed to rename playlist: $e');
      playlist.name = previousName;
      notifyListeners();
    }
  }

  Future<void> deletePlaylist(String playlistId) async {
    final index = playlists.indexWhere((p) => p.id == playlistId);
    if (index == -1) return;

    final removed = playlists.removeAt(index);
    notifyListeners();

    try {
      await ApiService().deleteCustomPlaylist(playlistId);
    } catch (e) {
      print('Failed to delete playlist on backend: $e');
      playlists.insert(index, removed);
      notifyListeners();
    }
  }

  /// Returns null on success, or an error message (e.g. "already in
  /// this playlist") if it wasn't added.
  Future<String?> addItemToPlaylist(String playlistId, MediaItem item) async {
    final playlist = _findById(playlistId);
    if (playlist == null) return 'Playlist not found.';

    final alreadyThere = playlist.items.any((existing) => existing.id == item.id);
    if (alreadyThere) return 'Already in this playlist.';

    playlist.items.add(item);
    notifyListeners();

    try {
      final added = await ApiService().addItemToCustomPlaylist(
        playlistId: playlistId,
        mediaId: item.id,
        mediaType: item.type,
      );

      if (!added) {
        // Backend says it was already there after all — keep the local
        // state consistent with that rather than showing a duplicate.
        playlist.items.removeWhere((existing) => existing.id == item.id);
        notifyListeners();
        return 'Already in this playlist.';
      }

      return null;
    } catch (e) {
      playlist.items.removeWhere((existing) => existing.id == item.id);
      notifyListeners();
      return e.toString();
    }
  }

  Future<void> removeItemFromPlaylist(String playlistId, MediaItem item) async {
    final playlist = _findById(playlistId);
    if (playlist == null) return;

    final removedIndex = playlist.items.indexWhere((existing) => existing.id == item.id);
    if (removedIndex == -1) return;

    final removed = playlist.items.removeAt(removedIndex);
    notifyListeners();

    try {
      await ApiService().removeItemFromCustomPlaylist(
        playlistId: playlistId,
        mediaId: item.id,
        mediaType: item.type,
      );
    } catch (e) {
      print('Failed to remove from backend: $e');
      playlist.items.insert(removedIndex, removed);
      notifyListeners();
    }
  }
}