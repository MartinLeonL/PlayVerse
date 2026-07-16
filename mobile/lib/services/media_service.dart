import 'package:dio/dio.dart';
import '../widgets/media_row.dart';

class MediaService {
  static final MediaService instance = MediaService._internal();
  factory MediaService() => instance;
  MediaService._internal();

  final Dio _dio = Dio(BaseOptions(
    baseUrl: 'http://localhost:5000/api',
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
  ));

  // Movies & TV from TMDB via backend
  Future<List<MediaItem>> getMovies() async {
    return await _fetchCategory('/getmovies');
  }

  Future<List<MediaItem>> getShows() async {
    return await _fetchCategory('/getshows');
  }

  // Games from IGDB via backend
  Future<List<MediaItem>> getGames() async {
    return await _fetchCategory('/getgames');
  }

  // Music from Spotify/Last.fm via backend
  Future<List<MediaItem>> getMusic() async {
    return await _fetchCategory('/getmusic');
  }

  // Private helper
  Future<List<MediaItem>> _fetchCategory(String endpoint) async {
    try {
      final res = await _dio.get(endpoint);
      final List<dynamic> data = res.data;

      return data.map((json) => MediaItem(
        title: json['title'] ?? json['name'] ?? 'Unknown',
        imageUrl: json['imageUrl'] ?? json['poster'] ?? 'https://image.tmdb.org/t/p/w342/default.jpg',
        bannerUrl: json['bannerUrl'] ?? json['backdrop'] ?? '',
        genres: List<String>.from(json['genres'] ?? []),
        description: json['description'] ?? json['overview'] ?? '',
        // add more fields as the backend returns them
      )).toList();
    } catch (e) {
      print('Failed to load $endpoint: $e');
      return [];
    }
  }
}