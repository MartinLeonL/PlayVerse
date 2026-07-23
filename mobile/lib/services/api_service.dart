import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  static final ApiService instance = ApiService._internal();
  factory ApiService() => instance;

  late final Dio _dio;
  final _storage = const FlutterSecureStorage();

  ApiService._internal() {
    _dio = Dio(BaseOptions(
      // TODO: replace with the real deployed web backend URL — this is
      // the one thing I can't fill in myself, since I don't know it.
      baseUrl: 'http://10.0.2.2:5000/api',
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
    ));

    // Attaches the stored token to every request — mirrors how a
    // browser automatically resends its httpOnly cookie. This app has
    // no cookie jar, so the token is sent explicitly as a header
    // instead (the backend accepts either transport, see
    // middleware/requireAuth.js).
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

  String _errorMessage(DioException e, String fallback) {
    final data = e.response?.data;
    if (data is Map && data['message'] != null) return data['message'].toString();
    return fallback;
  }

  // ---- Auth ----

  Future<String> register({
    required String firstName,
    required String lastName,
    required String username,
    required String email,
    required String password,
  }) async {
    try {
      final res = await _dio.post('/auth/register', data: {
        'firstName': firstName,
        'lastName': lastName,
        'username': username,
        'email': email,
        'password': password,
      });
      return res.data['message'] ?? 'Account created.';
    } on DioException catch (e) {
      throw Exception(_errorMessage(e, 'Registration failed.'));
    }
  }

  /// Returns the raw response map ({message, user, token}) so the
  /// caller can decide what to do with it — login() itself handles
  /// storing the token and basic profile info.
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    try {
      final res = await _dio.post('/auth/login', data: {'email': email, 'password': password});
      final data = res.data as Map<String, dynamic>;

      final token = data['token'] as String?;
      if (token != null) {
        await _storage.write(key: 'auth_token', value: token);
      }

      final user = data['user'] as Map<String, dynamic>?;
      if (user != null) {
        await _storage.write(key: 'userId', value: user['id']?.toString() ?? '');
        await _storage.write(key: 'firstName', value: user['firstName'] ?? '');
        await _storage.write(key: 'lastName', value: user['lastName'] ?? '');
        await _storage.write(key: 'username', value: user['username'] ?? '');
        await _storage.write(key: 'email', value: user['email'] ?? '');
        await _storage.write(key: 'reviewDisplayPreference', value: user['reviewDisplayPreference'] ?? 'fullName');
      }

      return data;
    } on DioException catch (e) {
      throw Exception(_errorMessage(e, 'Login failed.'));
    }
  }

  Future<String> resendVerificationEmail(String email) async {
    try {
      final res = await _dio.post('/auth/resend-verification', data: {'email': email});
      return res.data['message'] ?? 'A new verification email has been sent.';
    } on DioException catch (e) {
      throw Exception(_errorMessage(e, 'Failed to resend verification email.'));
    }
  }

  Future<String> forgotPassword(String email) async {
    try {
      final res = await _dio.post('/auth/forgot-password', data: {'email': email});
      return res.data['message'] ?? 'If an account matching that exists, a reset link has been sent.';
    } on DioException catch (e) {
      throw Exception(_errorMessage(e, 'Failed to send reset email.'));
    }
  }

  /// Hits /me to confirm the stored token is still valid and fetch the
  /// current profile — returns null if not logged in or the token's
  /// expired, rather than throwing, since "not logged in" is a normal
  /// state to check for, not an error.
  Future<Map<String, dynamic>?> getCurrentUser() async {
    try {
      final res = await _dio.get('/auth/me');
      return res.data['user'] as Map<String, dynamic>?;
    } on DioException {
      return null;
    }
  }

  Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: 'auth_token');
    return token != null;
  }

  Future<void> updateAccount({
    required String firstName,
    required String lastName,
    required String email,
    String? currentPassword,
    String? password,
    String? username,
    String? reviewDisplayPreference,
  }) async {
    try {
      final res = await _dio.patch('/auth/account', data: {
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        if (username != null) 'username': username,
        if (reviewDisplayPreference != null) 'reviewDisplayPreference': reviewDisplayPreference,
        if (password != null && password.isNotEmpty) 'password': password,
        if (currentPassword != null && currentPassword.isNotEmpty) 'currentPassword': currentPassword,
      });
      final data = res.data as Map<String, dynamic>;

      // Changing the email requires re-verification, and the backend
      // invalidates the session when that happens — match that by
      // logging out locally too, rather than pretending we're still
      // signed in with a cookie/token the server no longer honors.
      if (data['requiresEmailVerification'] == true) {
        await logout();
      } else {
        await _storage.write(key: 'firstName', value: firstName);
        await _storage.write(key: 'lastName', value: lastName);
        await _storage.write(key: 'email', value: email);
        if (username != null) await _storage.write(key: 'username', value: username);
        if (reviewDisplayPreference != null) {
          await _storage.write(key: 'reviewDisplayPreference', value: reviewDisplayPreference);
        }
      }
    } on DioException catch (e) {
      throw Exception(_errorMessage(e, 'Failed to update account.'));
    }
  }

  Future<void> deleteAccount() async {
    try {
      await _dio.delete('/auth/account');
    } on DioException catch (e) {
      throw Exception(_errorMessage(e, 'Failed to delete account.'));
    } finally {
      await logout();
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post('/auth/logout');
    } catch (_) {
      // Best-effort — clear the local session regardless of whether
      // the network call succeeds.
    }
    await _storage.deleteAll();
  }

  // ---- Custom playlists ----

  Future<List<Map<String, dynamic>>> getCustomPlaylists() async {
    final res = await _dio.get('/auth/custom-playlists');
    return List<Map<String, dynamic>>.from(res.data['playlists'] ?? []);
  }

  Future<Map<String, dynamic>> createCustomPlaylist(String name) async {
    final res = await _dio.post('/auth/custom-playlists', data: {'name': name});
    return res.data['playlist'] as Map<String, dynamic>;
  }

  Future<void> renameCustomPlaylist(String playlistId, String name) async {
    await _dio.patch('/auth/custom-playlists/$playlistId', data: {'name': name});
  }

  Future<void> deleteCustomPlaylist(String playlistId) async {
    await _dio.delete('/auth/custom-playlists/$playlistId');
  }

  /// Returns true if the item was actually added, false if it was
  /// already in the playlist (the backend uses this to distinguish the
  /// two rather than treating "already there" as an error).
  Future<bool> addItemToCustomPlaylist({
    required String playlistId,
    required String mediaId,
    required String mediaType,
  }) async {
    final res = await _dio.post('/auth/custom-playlists/$playlistId/items', data: {
      'mediaId': mediaId,
      'mediaType': mediaType,
    });
    return res.data['added'] == true;
  }

  Future<void> removeItemFromCustomPlaylist({
    required String playlistId,
    required String mediaId,
    required String mediaType,
  }) async {
    await _dio.delete('/auth/custom-playlists/$playlistId/items', data: {
      'mediaId': mediaId,
      'mediaType': mediaType,
    });
  }

  // ---- Ratings ----
  // Score is 1-5 (matches the existing star-picker UI) — display code
  // is responsible for doubling it to out-of-10 where that convention
  // is used elsewhere, the raw stored value stays 1-5 here.

  Future<Map<String, dynamic>?> getRating({required String mediaId, required String mediaType}) async {
    final res = await _dio.get('/auth/ratings/$mediaId', queryParameters: {'mediaType': mediaType});
    return res.data['rating'] as Map<String, dynamic>?;
  }

  Future<void> setRating({
    required String mediaId,
    required String mediaType,
    required int score,
    String note = '',
  }) async {
    await _dio.put('/auth/ratings/$mediaId', data: {
      'mediaType': mediaType,
      'score': score,
      'note': note,
    });
  }
}