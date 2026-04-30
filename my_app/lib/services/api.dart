// lib/services/api.dart
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

class ApiService {
  static String? _authToken;

  // Assign this in main.dart and pass to GoRouter/MaterialApp
  // so the interceptor can navigate without a BuildContext.
  static GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  static final Dio _dio = Dio(
    BaseOptions(
      baseUrl: "http://localhost:3000",
      headers: {"Content-Type": "application/json"},
    ),
  );

  static Dio get dio => _dio;

  static void setAuthToken(String token) {
    _authToken = token;
    _dio.options.headers["Authorization"] = "Bearer $token";
  }

  static void clearAuthToken() {
    _authToken = null;
    _dio.options.headers.remove("Authorization");
  }

  static void initInterceptor() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (_authToken != null) {
            options.headers["Authorization"] = "Bearer $_authToken";
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          if (e.response?.statusCode == 401) {
            // Clear token immediately so no further requests go out
            // with a dead token while the redirect is in flight.
            clearAuthToken();

            // Navigate to login from anywhere in the app without needing
            // a BuildContext — works inside services, background fetches, etc.
            final ctx = navigatorKey.currentContext;
            if (ctx != null && ctx.mounted) {
              // GoRouter
              // GoRouter.of(ctx).go('/login');

              // If you're using Navigator directly:
              navigatorKey.currentState
                  ?.pushNamedAndRemoveUntil('/login', (_) => false);
            }

            // Reject the error so callers get a proper DioException,
            // not a silent null — lets individual screens handle it too
            // if needed.
            return handler.reject(e);
          }
          return handler.next(e);
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