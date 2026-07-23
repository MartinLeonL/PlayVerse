import 'media_item.dart';

/// A named, custom playlist. Identified by `id`, NOT `name` — the
/// backend allows two playlists to share the same name (they're
/// genuinely different playlists with different ids), so `name` is
/// just a display label, never a lookup key.
class Playlist {
  final String id;
  String name;
  List<MediaItem> items;

  Playlist({
    required this.id,
    required this.name,
    List<MediaItem>? items,
  }) : items = items ?? [];
}