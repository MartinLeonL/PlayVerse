import 'package:dio/dio.dart';
import '../widgets/media_row.dart';

class MediaService {
  static final MediaService instance = MediaService._internal();
  factory MediaService() => instance;
  MediaService._internal();

  final Dio _dio = Dio(BaseOptions(
    baseUrl: 'http://10.0.2.2:5000/api',
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
  ));

  // Trending (home page rows) — capped, fast-loading lists
  Future<List<MediaItem>> getMovies() => _fetchCategory('/getmovies');
  Future<List<MediaItem>> getShows() => _fetchCategory('/getshows');
  Future<List<MediaItem>> getGames() => _fetchCategory('/getgames');
  Future<List<MediaItem>> getMusic() => _fetchCategory('/getmusic'); // not built yet — returns [] for now

  // Full catalog browsing (paginated + sorted) — used by "All Movies/Shows/Games"
  Future<List<MediaItem>> getAllMovies({int page = 1, String sort = 'trending'}) =>
      _fetchCategory('/allmovies?page=$page&sort=$sort');
  Future<List<MediaItem>> getAllShows({int page = 1, String sort = 'trending'}) =>
      _fetchCategory('/allshows?page=$page&sort=$sort');
  Future<List<MediaItem>> getAllGames({int page = 1, String sort = 'trending'}) =>
      _fetchCategory('/allgames?page=$page&sort=$sort');
  Future<List<MediaItem>> getAllMusic({int page = 1, String sort = 'trending'}) =>
      _fetchCategory('/allmusic?page=$page&sort=$sort');

  Future<List<MediaItem>> getAllByType(String mediaType, {int page = 1, String sort = 'trending'}) {
    switch (mediaType) {
      case 'movie':
        return getAllMovies(page: page, sort: sort);
      case 'show':
        return getAllShows(page: page, sort: sort);
      case 'game':
        return getAllGames(page: page, sort: sort);
      case 'music':
        return getAllMusic(page: page, sort: sort);
      default:
        return Future.value([]);
    }
  }

  // Search — hits TMDB/RAWG's actual search endpoints, not the trending
  // or pool data, so it can find anything in the real catalog.
  Future<List<MediaItem>> searchMovies(String query) =>
      _fetchCategory('/searchmovies?query=${Uri.encodeQueryComponent(query)}');
  Future<List<MediaItem>> searchShows(String query) =>
      _fetchCategory('/searchshows?query=${Uri.encodeQueryComponent(query)}');
  Future<List<MediaItem>> searchGames(String query) =>
      _fetchCategory('/searchgames?query=${Uri.encodeQueryComponent(query)}');
  Future<List<MediaItem>> searchMusic(String query) =>
      _fetchCategory('/searchmusic?query=${Uri.encodeQueryComponent(query)}');

  Future<List<MediaItem>> searchAll(String query) async {
    final results = await Future.wait([
      searchMovies(query),
      searchShows(query),
      searchGames(query),
      searchMusic(query),
    ]);
    return results.expand((list) => list).toList();
  }

  // Fetches full details (poster, genres, description, rating) for a
  // batch of saved items in one call. Used when loading playlists,
  // since the DB only stores mediaId/title/mediaType — not the rest.
  Future<List<MediaItem>> hydrateMedia(List<Map<String, String>> items) async {
    if (items.isEmpty) return [];
    try {
      final res = await _dio.post('/hydratemedia', data: {'items': items});
      final data = res.data;
      if (data['error'] != null && data['error'] != '') {
        print('Backend error on /hydratemedia: ${data['error']}');
        return [];
      }
      final List<dynamic> results = data['results'] ?? [];
      return results.map((json) => MediaItem(
        mediaId: json['mediaId'] as String?,
        mediaType: json['mediaType'] ?? 'movie',
        title: json['title'] ?? 'Unknown',
        imageUrl: json['imageUrl'] ?? '',
        bannerUrl: json['bannerUrl'] as String?,
        genres: List<String>.from(json['genres'] ?? []),
        description: json['description'] ?? 'No description available yet.',
        runtime: json['runtime'] ?? '--',
        language: json['language'] ?? '--',
        releaseDate: json['releaseDate'] ?? '--',
        platforms: List<String>.from(json['platforms'] ?? []),
        averageRating: (json['averageRating'] as num?)?.toDouble(),
        ratingCount: json['ratingCount'] ?? 0,
      )).toList();
    } catch (e) {
      print('Failed to hydrate media: $e');
      return [];
    }
  }

  // AI-assisted recommendations — the backend grounds the AI's
  // suggestions in real search results, so this parses the same way as
  // any other catalog response.
  Future<Map<String, dynamic>> getAiRecommendations(String message) async {
    try {
      final res = await _dio.post('/recommendations/chat', data: {'message': message});
      final data = res.data;
      if (data['error'] != null && data['error'] != '') {
        print('Backend error on /recommendations/chat: ${data['error']}');
        return {'message': '', 'recommendations': <MediaItem>[], 'error': data['error']};
      }
      final List<dynamic> rawRecs = data['recommendations'] ?? [];
      final recommendations = rawRecs.map((json) => MediaItem(
        mediaId: json['mediaId'] as String?,
        mediaType: json['mediaType'] ?? 'movie',
        title: json['title'] ?? 'Unknown',
        imageUrl: json['imageUrl'] ?? '',
        bannerUrl: json['bannerUrl'] as String?,
        genres: List<String>.from(json['genres'] ?? []),
        description: json['description'] ?? 'No description available yet.',
        runtime: json['runtime'] ?? '--',
        language: json['language'] ?? '--',
        releaseDate: json['releaseDate'] ?? '--',
        platforms: List<String>.from(json['platforms'] ?? []),
        averageRating: (json['averageRating'] as num?)?.toDouble(),
        ratingCount: json['ratingCount'] ?? 0,
      )).toList();
      return {'message': data['message'] ?? '', 'recommendations': recommendations, 'error': null};
    } catch (e) {
      print('Failed to get AI recommendations: $e');
      return {'message': '', 'recommendations': <MediaItem>[], 'error': e.toString()};
    }
  }

  // Extra detail hydration (runtime, real language name, watch platforms)
  // — fetched once when a detail page opens, not part of list/browse data.
  Future<Map<String, dynamic>?> getMediaDetails({required String mediaType, required String mediaId}) async {
    try {
      final res = await _dio.get('/mediadetails', queryParameters: {'mediaType': mediaType, 'mediaId': mediaId});
      final data = res.data;
      if (data['error'] != null && data['error'] != '') {
        print('Backend error on /mediadetails: ${data['error']}');
        return null;
      }
      return data;
    } catch (e) {
      print('Failed to load media details: $e');
      return null;
    }
  }

  // Private helper
  Future<List<MediaItem>> _fetchCategory(String endpoint) async {
    try {
      final res = await _dio.get(endpoint);
      final data = res.data;

      if (data['error'] != null && data['error'] != '') {
        print('Backend error on $endpoint: ${data['error']}');
        return [];
      }

      final List<dynamic> results = data['results'] ?? [];

      return results.map((json) => MediaItem(
        mediaId: json['mediaId'] as String?,
        mediaType: json['mediaType'] ?? 'movie',
        title: json['title'] ?? 'Unknown',
        imageUrl: json['imageUrl'] ?? '',
        bannerUrl: json['bannerUrl'] as String?,
        genres: List<String>.from(json['genres'] ?? []),
        description: json['description'] ?? 'No description available yet.',
        runtime: json['runtime'] ?? '--',
        language: json['language'] ?? '--',
        releaseDate: json['releaseDate'] ?? '--',
        platforms: List<String>.from(json['platforms'] ?? []),
        averageRating: (json['averageRating'] as num?)?.toDouble(),
        ratingCount: json['ratingCount'] ?? 0,
      )).toList();
    } catch (e) {
      print('Failed to load $endpoint: $e');
      return [];
    }
  }
}