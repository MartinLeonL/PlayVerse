import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  static final ApiService instance = ApiService._internal();
  factory ApiService() => instance;
  ApiService._internal();

  final Dio _dio = Dio(BaseOptions(
    baseUrl: 'http://10.0.2.2:5000/api',
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
  ));

  final _storage = const FlutterSecureStorage();

  Future<int> register({
    required String login,
    required String password,
    required String firstName,
    required String lastName,
    required String email,
  }) async {
    final res = await _dio.post('/register', data: {
      'login': login,
      'password': password,
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
    });
    final data = res.data;
    if (data['error'] != '') throw Exception(data['error']);

    await _storage.write(key: 'user_id', value: data['id'].toString());
    await _storage.write(key: 'firstName', value: firstName);
    await _storage.write(key: 'lastName', value: lastName);
    await _storage.write(key: 'login', value: login);
    await _storage.write(key: 'email', value: email);
    await _storage.write(key: 'password_length', value: password.length.toString());

    return data['id'];
  }

  Future<Map<String, dynamic>> login({
    required String login,
    required String password,
  }) async {
    final res = await _dio.post('/login', data: {'login': login, 'password': password});
    final data = res.data;
    if (data['error'] != '') throw Exception(data['error']);

    await _storage.write(key: 'user_id', value: data['id'].toString());
    if (data['firstName'] != null) {
      await _storage.write(key: 'firstName', value: data['firstName']);
    }
    if (data['lastName'] != null) {
      await _storage.write(key: 'lastName', value: data['lastName']);
    }
    // fall back to what the user typed if the backend doesn't echo it back
    await _storage.write(key: 'login', value: data['login'] ?? login);
    if (data['email'] != null) {
      await _storage.write(key: 'email', value: data['email']);
    }
    await _storage.write(key: 'password_length', value: password.length.toString());
    return data;
  }

  Future<void> updateProfile({
    String? firstName,
    String? lastName,
    String? login,
    String? email,
  }) async {
    final userId = await getCurrentUserId();
    if (userId == null) throw Exception('Not logged in');

    final res = await _dio.post('/updateprofile', data: {
      'userId': userId,
      if (firstName != null) 'firstName': firstName,
      if (lastName != null) 'lastName': lastName,
      if (login != null) 'login': login,
      if (email != null) 'email': email,
    });
    final data = res.data;
    if (data['error'] != '') throw Exception(data['error']);

    // keep local storage in sync so AccountPage reflects the change
    // immediately and future logins don't stomp on it
    if (firstName != null) await _storage.write(key: 'firstName', value: firstName);
    if (lastName != null) await _storage.write(key: 'lastName', value: lastName);
    if (login != null) await _storage.write(key: 'login', value: login);
    if (email != null) await _storage.write(key: 'email', value: email);
  }

  Future<void> updatePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final userId = await getCurrentUserId();
    if (userId == null) throw Exception('Not logged in');

    final res = await _dio.post('/updatepassword', data: {
      'userId': userId,
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
    final data = res.data;
    if (data['error'] != '') throw Exception(data['error']);
    // password itself is never persisted client-side
    // so the account page can show the right number of dots
    await _storage.write(key: 'password_length', value: newPassword.length.toString());
  }

  Future<void> addMedia({required int userId, required String mediaId, required String title, required String mediaType, required String playlistName, double? userRating}) async {
    final res = await _dio.post('/addmedia', data: {
      'userId': userId,
      'mediaId': mediaId,
      'title': title,
      'mediaType': mediaType,
      'playlistName': playlistName,
      if (userRating != null) 'userRating': userRating,
    });
    final data = res.data;
    if (data['error'] != null && data['error'] != '') throw Exception(data['error']);
  }

  Future<void> removeMedia({required int userId, required String mediaId, required String playlistName}) async {
    await _dio.post('/removemedia', data: {'userId': userId, 'mediaId': mediaId, 'playlistName': playlistName});
  }

  Future<void> createPlaylistBackend({required int userId, required String playlistName}) async {
    final res = await _dio.post('/createplaylist', data: {'userId': userId, 'playlistName': playlistName});
    final data = res.data;
    if (data['error'] != null && data['error'] != '') throw Exception(data['error']);
  }

  Future<void> deletePlaylistBackend({required int userId, required String playlistName}) async {
    await _dio.post('/deleteplaylist', data: {'userId': userId, 'playlistName': playlistName});
  }

  Future<List<String>> getPlaylistNames({required int userId}) async {
    final res = await _dio.post('/getplaylists', data: {'userId': userId});
    final data = res.data;
    return List<String>.from(data['playlistNames'] ?? []);
  }

  Future<void> updateRating({
    required int userId,
    required String mediaId,
    required String title,
    required String mediaType,
    required double newUserRating,
  }) async {
    await _dio.post('/updaterating', data: {
      'userId': userId,
      'mediaId': mediaId,
      'title': title,
      'mediaType': mediaType,
      'newUserRating': newUserRating,
    });
  }

  /// Fetches this user's existing rating and note for one media item,
  /// so a detail page can show what they already saved instead of
  /// starting blank every time.
  Future<Map<String, dynamic>> getMediaUserEntry({required int userId, required String mediaId}) async {
    final res = await _dio.post('/getmediauserentry', data: {'userId': userId, 'mediaId': mediaId});
    final data = res.data;
    if (data['error'] != null && data['error'] != '') throw Exception(data['error']);
    return {
      'rating': (data['rating'] as num?)?.toDouble(),
      'note': data['note'] as String? ?? '',
    };
  }

  /// Saves a personal note (max 500 chars) for one media item. Works
  /// even if the item isn't in a playlist yet
  Future<void> updateNote({
    required int userId,
    required String mediaId,
    required String title,
    required String mediaType,
    required String note,
  }) async {
    final res = await _dio.post('/updatenote', data: {
      'userId': userId,
      'mediaId': mediaId,
      'title': title,
      'mediaType': mediaType,
      'note': note,
    });
    final data = res.data;
    if (data['error'] != null && data['error'] != '') throw Exception(data['error']);
  }

  Future<List<dynamic>> getRankedMedia({required int userId, String? mediaType}) async {
    final res = await _dio.post('/getrankedmedia', data: {'userId': userId, if (mediaType != null) 'mediaType': mediaType});
    return res.data['results'] ?? [];
  }

  /// Looks up a YouTube trailer for the given title, returning the
  /// video ID to open (or null if none was found / the request failed).
  Future<String?> getTrailerVideoId({required String title, required String mediaType}) async {
    try {
      final res = await _dio.get('/gettrailer', queryParameters: {'title': title, 'mediaType': mediaType});
      final data = res.data;
      if (data['error'] != null && data['error'] != '') {
        print('Backend error on /gettrailer: ${data['error']}');
        return null;
      }
      return data['videoId'] as String?;
    } catch (e) {
      print('Failed to fetch trailer: $e');
      return null;
    }
  }

  Future<int?> getCurrentUserId() async {
    final id = await _storage.read(key: 'user_id');
    return id != null ? int.parse(id) : null;
  }

  Future<void> logout() async => await _storage.deleteAll();

  Future<void> deleteAccount() async {
    final userId = await getCurrentUserId();
    if (userId == null) return;

    await _dio.post('/deleteaccount', data: {'userId': userId});
  }
}