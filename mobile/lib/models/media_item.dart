/// A single "where to watch/play/listen" badge — e.g. a red Netflix
/// pill, or Deezer's purple one. Comes from the backend already styled
/// (color included), so the app doesn't need its own icon/color mapping.
class MediaProvider {
  final String key;
  final String label;
  final String bg;
  final String fg;

  MediaProvider({
    required this.key,
    required this.label,
    required this.bg,
    required this.fg,
  });

  factory MediaProvider.fromJson(Map<String, dynamic> json) {
    return MediaProvider(
      key: json['key'] ?? '',
      label: json['label'] ?? '',
      bg: json['bg'] ?? '#000000',
      fg: json['fg'] ?? '#ffffff',
    );
  }
}

/// Represents a movie, show, game, or song. Field names match the
/// backend's JSON exactly (id/type/posterImage/etc, not the old
/// mediaId/mediaType/imageUrl naming) — this is the single shared
/// contract both the website and this app now use.
class MediaItem {
  final String id;
  final String type; // 'movie' | 'show' | 'game' | 'music'
  final String tag; // display label: "Movie" | "Series" | "Game" | "Song"
  final String title;
  final String? artist; // music only
  final String posterImage;
  final String? backdropImage;
  final List<String> genres;
  final String genre; // genres joined for display, e.g. "Action • Sci-Fi"
  final String date;
  final String duration;
  final String durationLabel; // "Runtime" | "Seasons" | "Playtime" | "Duration"
  final String language;
  final String source; // "TMDB" | "RAWG" | "Deezer"
  final String description;
  final double? score; // out of 10; null means no rating data, not zero
  // PlayVerse's own community average — separate from `score` (the
  // external TMDB/RAWG rating). Present for every media type, including
  // music, since users can rate music even though Deezer itself has no
  // rating concept.
  final double? userScore;
  final int userScoreCount;
  final List<String> platforms; // games only — hardware platforms
  final List<MediaProvider> providers;
  final String? trailerKey; // only present on detail responses
  final String? previewUrl; // music only — 30s Deezer preview
  final String? externalUrl; // music only — link to the track on Deezer
  final String? youtubeVideoKey; // music only — fallback when there's no preview

  MediaItem({
    required this.id,
    required this.type,
    this.tag = '',
    required this.title,
    this.artist,
    required this.posterImage,
    this.backdropImage,
    this.genres = const [],
    this.genre = '',
    this.date = 'Unknown',
    this.duration = 'N/A',
    this.durationLabel = 'Duration',
    this.language = 'N/A',
    this.source = '',
    this.description = 'No description available.',
    this.score,
    this.userScore,
    this.userScoreCount = 0,
    this.platforms = const [],
    this.providers = const [],
    this.trailerKey,
    this.previewUrl,
    this.externalUrl,
    this.youtubeVideoKey,
  });

  factory MediaItem.fromJson(Map<String, dynamic> json) {
    return MediaItem(
      id: json['id'] ?? '',
      type: json['type'] ?? 'movie',
      tag: json['tag'] ?? '',
      title: json['title'] ?? 'Unknown',
      artist: json['artist'] as String?,
      posterImage: json['posterImage'] ?? '',
      backdropImage: json['backdropImage'] as String?,
      genres: List<String>.from(json['genres'] ?? []),
      genre: json['genre'] ?? '',
      date: json['date'] ?? 'Unknown',
      duration: json['duration'] ?? 'N/A',
      durationLabel: json['durationLabel'] ?? 'Duration',
      language: json['language'] ?? 'N/A',
      source: json['source'] ?? '',
      description: json['description'] ?? 'No description available.',
      score: (json['score'] as num?)?.toDouble(),
      userScore: (json['userScore'] as num?)?.toDouble(),
      userScoreCount: json['userScoreCount'] ?? 0,
      platforms: List<String>.from(json['platforms'] ?? []),
      providers: (json['providers'] as List<dynamic>? ?? [])
          .map((p) => MediaProvider.fromJson(p as Map<String, dynamic>))
          .toList(),
      trailerKey: json['trailerKey'] as String?,
      previewUrl: json['previewUrl'] as String?,
      externalUrl: json['externalUrl'] as String?,
      youtubeVideoKey: json['youtubeVideoKey'] as String?,
    );
  }

  /// The prefix-derived type — e.g. "movie-27205" -> "movie". Useful
  /// wherever a raw ID string shows up without an accompanying `type`
  /// field (like an old saved playlist entry).
  static String? typeFromId(String mediaId) {
    final prefix = mediaId.split('-').first;
    const valid = {'movie', 'show', 'game', 'music'};
    return valid.contains(prefix) ? prefix : null;
  }
}