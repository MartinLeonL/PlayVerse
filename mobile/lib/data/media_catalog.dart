import '../services/media_service.dart';
import '../widgets/media_row.dart';

class MediaCatalog {
  MediaCatalog._();

  static final MediaService _service = MediaService();

  static List<MediaItem> movies = [];
  static List<MediaItem> shows = [];
  static List<MediaItem> music = [];
  static List<MediaItem> games = [];

  static Map<String, List<MediaItem>> get categories => {
        'Movies': movies,
        'Shows': shows,
        'Music': music,
        'Games': games,
      };

  static List<MediaItem> get all => [...movies, ...shows, ...music, ...games];

  // Load all categories from backend
  static Future<void> loadAll() async {
    try {
      movies = await _service.getMovies();
      shows = await _service.getShows();
      games = await _service.getGames();
      music = await _service.getMusic();
    } catch (e) {
      print('Failed to load catalog from backend: $e');
    }
  }
}