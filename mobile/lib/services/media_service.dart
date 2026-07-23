import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/media_item.dart';
import '../models/chat_message.dart';
import '../models/review.dart';

class MediaService {
  static final MediaService instance = MediaService._internal();
  factory MediaService() => instance;

  late final Dio _dio;
  final _storage = const FlutterSecureStorage();

  MediaService._internal() {
    _dio = Dio(BaseOptions(
      // TODO: replace with the real deployed web backend URL, same as api_service.dart
      baseUrl: 'http://10.0.2.2:5000/api',
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
    ));

    // Most media browsing is public and doesn't need this, but AI chat
    // and anything ratings-related does — this was missing entirely
    // before, which is why authenticated calls through this service
    // (like AI chat) failed with "Authentication required."
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'auth_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ));
  }

  // ---- Browsing: popular (default), genre-filtered, or sorted ----
  // sort: omit for default popular order, or one of:
  // 'az' | 'za' | 'recent' | 'highest' | 'lowest' | 'userScoreAsc' | 'userScoreDesc'
  // NOTE: sort and genre don't combine on the backend — requesting a
  // sort ignores any genre filter (matches the backend's own limitation).

  Future<Map<String, dynamic>> _fetchCategory(
    String path, {
    int page = 1,
    String? genre,
    String? sort,
  }) async {
    try {
      final res = await _dio.get(path, queryParameters: {
        'page': page,
        if (genre != null) 'genre': genre,
        if (sort != null) 'sort': sort,
      });
      final data = res.data as Map<String, dynamic>;
      final items = (data['items'] as List<dynamic>? ?? [])
          .map((json) => MediaItem.fromJson(json as Map<String, dynamic>))
          .toList();
      return {
        'items': items,
        'page': data['page'] ?? page,
        'totalPages': data['totalPages'] ?? 1,
      };
    } catch (e) {
      print('Failed to load $path: $e');
      return {'items': <MediaItem>[], 'page': page, 'totalPages': 1};
    }
  }

  Future<List<MediaItem>> getMovies({int page = 1, String? genre, String? sort}) async =>
      (await _fetchCategory('/media/movies', page: page, genre: genre, sort: sort))['items'];
  Future<List<MediaItem>> getShows({int page = 1, String? genre, String? sort}) async =>
      (await _fetchCategory('/media/shows', page: page, genre: genre, sort: sort))['items'];
  Future<List<MediaItem>> getGames({int page = 1, String? genre, String? sort}) async =>
      (await _fetchCategory('/media/games', page: page, genre: genre, sort: sort))['items'];
  Future<List<MediaItem>> getMusic({int page = 1, String? genre, String? sort}) async =>
      (await _fetchCategory('/media/music', page: page, genre: genre, sort: sort))['items'];

  Future<List<MediaItem>> getByType(String mediaType, {int page = 1, String? genre, String? sort}) {
    switch (mediaType) {
      case 'movie':
        return getMovies(page: page, genre: genre, sort: sort);
      case 'show':
        return getShows(page: page, genre: genre, sort: sort);
      case 'game':
        return getGames(page: page, genre: genre, sort: sort);
      case 'music':
        return getMusic(page: page, genre: genre, sort: sort);
      default:
        return Future.value([]);
    }
  }

  // ---- Genres ----

  Future<List<Map<String, dynamic>>> getGenres(String type) async {
    try {
      final res = await _dio.get('/media/genres/$type');
      return List<Map<String, dynamic>>.from(res.data['genres'] ?? []);
    } catch (e) {
      print('Failed to load genres for $type: $e');
      return [];
    }
  }

  // ---- Search ----

  Future<List<MediaItem>> _search(String type, String query, {int page = 1}) async {
    try {
      final res = await _dio.get('/media/search', queryParameters: {
        'type': type,
        'query': query,
        'page': page,
      });
      final data = res.data as Map<String, dynamic>;
      return (data['items'] as List<dynamic>? ?? [])
          .map((json) => MediaItem.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      print('Search failed for $type "$query": $e');
      return [];
    }
  }

  Future<List<MediaItem>> searchMovies(String query, {int page = 1}) => _search('movies', query, page: page);
  Future<List<MediaItem>> searchShows(String query, {int page = 1}) => _search('shows', query, page: page);
  Future<List<MediaItem>> searchGames(String query, {int page = 1}) => _search('games', query, page: page);
  Future<List<MediaItem>> searchMusic(String query, {int page = 1}) => _search('music', query, page: page);

  Future<List<MediaItem>> searchAll(String query) async {
    final results = await Future.wait([
      searchMovies(query),
      searchShows(query),
      searchGames(query),
      searchMusic(query),
    ]);
    return results.expand((list) => list).toList();
  }

  // ---- Hero (homepage carousel) ----

  Future<List<MediaItem>> getHero() async {
    try {
      final res = await _dio.get('/media/hero');
      return (res.data['items'] as List<dynamic>? ?? [])
          .map((json) => MediaItem.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      print('Failed to load hero items: $e');
      return [];
    }
  }

  // ---- Single item (detail page — includes trailerKey and full providers) ----

  Future<MediaItem?> getMediaItem({required String type, required String id}) async {
    try {
      // Accepts either the bare source ID or the full prefixed one
      // ("1368337" or "movie-1368337") — the backend's item endpoint
      // only wants the bare ID, so strip a recognized prefix if present.
      final sourceId = MediaItem.typeFromId(id) != null ? id.split('-').skip(1).join('-') : id;

      final res = await _dio.get('/media/item/$type/$sourceId');
      final item = res.data['item'];
      return item != null ? MediaItem.fromJson(item as Map<String, dynamic>) : null;
    } catch (e) {
      print('Failed to load item $type/$id: $e');
      return null;
    }
  }

  /// Hydrates a batch of saved playlist entries (just {mediaId,
  /// mediaType} pairs) into full MediaItems. There's no batch endpoint
  /// on the backend — each one is a separate /media/item/:type/:id
  /// call, run concurrently.
  Future<List<MediaItem>> hydrateItems(List<Map<String, String>> refs) async {
    final results = await Future.wait(refs.map((ref) {
      final type = ref['mediaType'];
      final id = ref['mediaId'];
      if (type == null || id == null) return Future.value(null);
      return getMediaItem(type: type, id: id);
    }));
    return results.whereType<MediaItem>().toList();
  }

  // ---- Public reviews ----
  // mediaId here is the FULL prefixed id (e.g. "movie-27205"), matching
  // how ratings are actually stored — different from getMediaItem/
  // hydrateItems, which want the bare source id.

  Future<List<Review>> getReviews({required String mediaId, required String mediaType}) async {
    try {
      final res = await _dio.get('/media/reviews/$mediaId', queryParameters: {'mediaType': mediaType});
      return (res.data['reviews'] as List<dynamic>? ?? [])
          .map((r) => Review.fromJson(r as Map<String, dynamic>))
          .toList();
    } catch (e) {
      print('Failed to load reviews: $e');
      return [];
    }
  }

  // ---- AI recommendations — a real multi-turn conversation, matching web ----

  Future<List<ChatMessage>> getChatHistory() async {
    try {
      final res = await _dio.get('/recommendations/chat');
      return (res.data['messages'] as List<dynamic>? ?? [])
          .map((m) => ChatMessage.fromJson(m as Map<String, dynamic>))
          .toList();
    } catch (e) {
      print('Failed to load chat history: $e');
      return [];
    }
  }

  Future<ChatMessage> sendChatMessage(String message) async {
    try {
      final res = await _dio.post('/recommendations/chat', data: {'message': message});
      final data = res.data as Map<String, dynamic>;
      return ChatMessage(
        role: 'assistant',
        text: data['message'] ?? '',
        recommendations: (data['recommendations'] as List<dynamic>? ?? [])
            .map((r) => ChatRecommendation.fromJson(r as Map<String, dynamic>))
            .toList(),
      );
    } on DioException catch (e) {
      final data = e.response?.data;
      final msg = (data is Map && data['message'] != null) ? data['message'].toString() : null;
      throw Exception(msg ?? 'Failed to get recommendations.');
    }
  }

  Future<void> clearChat() async {
    await _dio.delete('/recommendations/chat');
  }
}