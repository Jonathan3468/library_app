// lib/utils/auth.dart
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api.dart';

class AuthService {
  static String? _token;
  static Map<String, dynamic>? _currentUser;

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString("token");
    final userString = prefs.getString("user");
    if (userString != null) _currentUser = jsonDecode(userString);
    if (_token != null) ApiService.setAuthToken(_token!);
  }

  static Future<void> login(String email, String password) async {
    final response = await ApiService.post(
      "/auth/login",
      data: {"email": email, "password": password},
    );
    _token = response.data["token"];
    _currentUser = response.data["user"];
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString("token", _token!);
    await prefs.setString("user", jsonEncode(_currentUser));
    ApiService.setAuthToken(_token!);
  }

  static Future<void> register({
    required String name,
    required String email,
    required String password,
    required String role,
    required String roleCode,
  }) async {
    await ApiService.post("/auth/register", data: {
      "name": name, "email": email,
      "password": password, "role": role, "roleCode": roleCode,
    });
  }

  // Sends reset code to email; navigates to reset page after
  static Future<void> forgotPassword(String email) async {
    await ApiService.post("/auth/forgot-password", data: {"email": email});
  }

  static Future<void> logout() async {
    _token = null;
    _currentUser = null;
    ApiService.clearAuthToken();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove("token");
    await prefs.remove("user");
  }

  static Future<void> saveBorrowerId(int borrowerId) async {
    if (_currentUser != null) {
      _currentUser!['borrower_id'] = borrowerId;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString("user", jsonEncode(_currentUser));
    }
  }

  static bool isAuthenticated() => _token != null;
  static bool isAuthenticatedSync() => _token != null;
  static Map<String, dynamic>? getCurrentUser() => _currentUser;
  static Map<String, dynamic>? getCurrentUserSync() => _currentUser;
  static String? getToken() => _token;

  static int? getBorrowerId() {
    final user = getCurrentUserSync();
    return user?['borrower_id'] as int?;
  }

  static String? getUserId() => _currentUser?['id']?.toString();
  static bool isLibrarian() => _currentUser?['role'] == 'librarian' || _currentUser?['role'] == 'admin';
  static bool isAdmin() => _currentUser?['role'] == 'admin';
  static bool isMember() => _currentUser?['role'] == 'member';
  static String? getUserRole() => _currentUser?['role'] as String?;
}