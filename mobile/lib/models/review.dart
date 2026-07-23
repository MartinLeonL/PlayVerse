/// A single public review, as returned by GET /api/media/reviews/:mediaId.
/// displayName is computed server-side, already respecting whichever
/// display preference (full name vs. username) that reviewer chose.
class Review {
  final String displayName;
  final int score; // 1-10
  final String note;
  final DateTime? updatedAt;

  Review({
    required this.displayName,
    required this.score,
    required this.note,
    this.updatedAt,
  });

  factory Review.fromJson(Map<String, dynamic> json) {
    DateTime? parsedDate;
    try {
      if (json['updatedAt'] != null) {
        parsedDate = DateTime.parse(json['updatedAt'].toString());
      }
    } catch (_) {
      // leave parsedDate null if the date string is malformed
    }

    return Review(
      displayName: json['displayName'] ?? 'Someone',
      score: (json['score'] as num?)?.round() ?? 0,
      note: json['note'] ?? '',
      updatedAt: parsedDate,
    );
  }
}