// lib/services/api.dart
import 'package:dio/dio.dart';

class ApiService {
  // Store token here directly — breaks the circular import with auth.dart
  static String? _authToken;

  static final Dio _dio = Dio(
    BaseOptions(
      baseUrl: "http://localhost:3000",
      headers: {"Content-Type": "application/json"},
    ),
  );

  static Dio get dio => _dio;

  // Called by AuthService after login
  static void setAuthToken(String token) {
    _authToken = token;
    _dio.options.headers["Authorization"] = "Bearer $token";
  }

  // Called by AuthService on logout
  static void clearAuthToken() {
    _authToken = null;
    _dio.options.headers.remove("Authorization");
  }

  // Call this in main() after AuthService.init()
  static void initInterceptor() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (_authToken != null) {
            options.headers["Authorization"] = "Bearer $_authToken";
          }
          return handler.next(options);
        },
      ),
    );
  }

  static Future<Response> get(String path, {Map<String, dynamic>? params}) {
    return _dio.get(path, queryParameters: params);
  }

  static Future<Response> post(String path, {dynamic data}) {
    return _dio.post(path, data: data);
  }

  static Future<Response> put(String path, {dynamic data}) {
    return _dio.put(path, data: data);
  }

  static Future<Response> delete(String path) {
    return _dio.delete(path);
  }
}