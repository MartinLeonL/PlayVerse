import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  static final ApiService instance = ApiService._internal();
  factory ApiService() => instance;
  ApiService._internal();

  final Dio _dio = Dio(BaseOptions(
   //TODO: put actual URL here, for now using localhost for testingr
    baseUrl: 'http://localhost:5000/api',
    connectTimeout: const Duration(seconds: 30),   // changed from 10
    receiveTimeout: const Duration(seconds: 30),   // changed from 10
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

    await _storage.write(key: 'password_length', value: newPassword.length.toString());
  }

  Future<void> addMedia({required int userId, required String mediaId, required String title, required String mediaType, double? userRating}) async {
    await _dio.post('/addmedia', data: {'userId': userId, 'mediaId': mediaId, 'title': title, 'mediaType': mediaType, if (userRating != null) 'userRating': userRating});
  }

  Future<void> removeMedia({required int userId, required String mediaId}) async {
    await _dio.post('/removemedia', data: {'userId': userId, 'mediaId': mediaId});
  }

  Future<void> updateRating({required int userId, required String mediaId, required double newUserRating}) async {
    await _dio.post('/updaterating', data: {'userId': userId, 'mediaId': mediaId, 'newUserRating': newUserRating});
  }

  Future<List<dynamic>> getRankedMedia({required int userId, String? mediaType}) async {
    final res = await _dio.post('/getrankedmedia', data: {'userId': userId, if (mediaType != null) 'mediaType': mediaType});
    return res.data['results'] ?? [];
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