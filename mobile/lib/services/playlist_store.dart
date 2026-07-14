import 'package:flutter/material.dart';
import '../widgets/media_row.dart';

class PlaylistStore extends ChangeNotifier {
  PlaylistStore._internal();
  static final PlaylistStore instance = PlaylistStore._internal();

  // TODO: replace with real backend-persisted playlists
  final Map<String, List<MediaItem>> playlists = {
    'Want to watch': [
      MediaItem(title: 'Toy Story 5', imageUrl: 'https://image.tmdb.org/t/p/w342/6IyE0LmGh3AByCXykRfxWJqOKuY.jpg'),
      MediaItem(title: 'Michael', imageUrl: 'https://image.tmdb.org/t/p/w342/2AY6EQ6H0zGxu2FTG0k4bqUlUHm.jpg'),
      MediaItem(title: 'The Last Airbender', imageUrl: 'https://image.tmdb.org/t/p/w342/qYTsRQNu1MdxTQ0BE0F7YOAOROq.jpg'),
      MediaItem(title: 'The Boys', imageUrl: 'https://image.tmdb.org/t/p/w342/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg'),
      MediaItem(title: 'Spider-man 2', imageUrl: 'https://image.tmdb.org/t/p/w342/qYTsRQNu1MdxTQ0BE0F7YOAOROq.jpg'),
      MediaItem(title: 'Batman Arkham Knight', imageUrl: 'https://image.tmdb.org/t/p/w342/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg'),
      MediaItem(title: 'Obsession', imageUrl: 'https://image.tmdb.org/t/p/w342/9fCApNoRkc9JLnDdKF2Z6EM7ZTV.jpg'),
      MediaItem(title: 'Hunter x Hunter', imageUrl: 'https://image.tmdb.org/t/p/w342/sPCigirDtGGGWTz3vpiJ0kAsW4o.jpg'),
    ],
    'Favorites': [
      MediaItem(title: 'The Last Airbender', imageUrl: 'https://image.tmdb.org/t/p/w342/qYTsRQNu1MdxTQ0BE0F7YOAOROq.jpg'),
      MediaItem(title: 'The Boys', imageUrl: 'https://image.tmdb.org/t/p/w342/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg'),
      MediaItem(title: 'Hunter x Hunter', imageUrl: 'https://image.tmdb.org/t/p/w342/sPCigirDtGGGWTz3vpiJ0kAsW4o.jpg'),
    ],
    'Would not recommend': [
      MediaItem(title: 'The Last Airbender', imageUrl: 'https://image.tmdb.org/t/p/w342/qYTsRQNu1MdxTQ0BE0F7YOAOROq.jpg'),
      MediaItem(title: 'The Boys', imageUrl: 'https://image.tmdb.org/t/p/w342/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg'),
      MediaItem(title: 'Hunter x Hunter', imageUrl: 'https://image.tmdb.org/t/p/w342/sPCigirDtGGGWTz3vpiJ0kAsW4o.jpg'),
    ],
    'Favorite Games': [
      MediaItem(title: 'Spider-man 2', imageUrl: 'https://image.tmdb.org/t/p/w342/qYTsRQNu1MdxTQ0BE0F7YOAOROq.jpg'),
      MediaItem(title: 'Batman Arkham Knight', imageUrl: 'https://image.tmdb.org/t/p/w342/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg'),
      MediaItem(title: 'Red Dead Redemption', imageUrl: 'https://image.tmdb.org/t/p/w342/sPCigirDtGGGWTz3vpiJ0kAsW4o.jpg'),
    ],
  };

  void createPlaylist(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty || playlists.containsKey(trimmed)) return;
    playlists[trimmed] = [];
    notifyListeners();
  }

  void addItemToPlaylist(String playlistName, MediaItem item) {
    final list = playlists.putIfAbsent(playlistName, () => []);
    final alreadyIn = list.any((existing) => existing.title == item.title);
    if (!alreadyIn) {
      list.add(item);
      notifyListeners();
    }
  }

  void deletePlaylist(String name) {
    if (playlists.remove(name) != null) {
      notifyListeners();
    }
  }
}