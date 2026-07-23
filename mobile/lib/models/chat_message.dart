/// One message in an AI recommendation conversation — either the
/// user's own message, or the assistant's reply (which may come with
/// a handful of recommendations attached).
class ChatMessage {
  final String role; // 'user' | 'assistant'
  final String text;
  final List<ChatRecommendation> recommendations;

  ChatMessage({
    required this.role,
    required this.text,
    this.recommendations = const [],
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      role: json['role'] ?? 'assistant',
      text: json['text'] ?? '',
      recommendations: (json['recommendations'] as List<dynamic>? ?? [])
          .map((r) => ChatRecommendation.fromJson(r as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// A single AI-suggested title. Deliberately lighter-weight than
/// MediaItem — the backend only enriches it with a poster/overview/
/// rating, not the full catalog shape. `id` is null if the backend
/// couldn't find a real catalog match for whatever the AI suggested;
/// tapping a recommendation without an id shouldn't try to open a
/// detail page for something that doesn't actually exist.
class ChatRecommendation {
  final String? id; // e.g. "movie-27205"
  final String title;
  final String type; // 'movie' | 'show' | 'game' | 'music'
  final String? year;
  final String reason;
  final String? poster;
  final String? overview;
  final double? score; // the real external TMDB/RAWG rating, out of 10; null for music
  final double? userScore; // PlayVerse's own community average, out of 10
  final int userScoreCount;
  final String? releaseDate;

  ChatRecommendation({
    this.id,
    required this.title,
    required this.type,
    this.year,
    required this.reason,
    this.poster,
    this.overview,
    this.score,
    this.userScore,
    this.userScoreCount = 0,
    this.releaseDate,
  });

  factory ChatRecommendation.fromJson(Map<String, dynamic> json) {
    return ChatRecommendation(
      id: json['id'] as String?,
      title: json['title'] ?? 'Unknown',
      type: json['type'] ?? 'movie',
      year: json['year']?.toString(),
      reason: json['reason'] ?? '',
      poster: json['poster'] as String?,
      overview: json['overview'] as String?,
      score: (json['score'] as num?)?.toDouble(),
      userScore: (json['userScore'] as num?)?.toDouble(),
      userScoreCount: json['userScoreCount'] ?? 0,
      releaseDate: json['releaseDate']?.toString(),
    );
  }
}