// lib/utils/image_storage.dart
import 'package:shared_preferences/shared_preferences.dart';

/// Drop-in Flutter equivalent of imageStorage.js
/// Uses shared_preferences to persist base64 image strings.
///
/// Usage:
///   await ImageStorage.save('author', 5, base64String);
///   final img = await ImageStorage.load('book', 1);   // returns '' if not found
///   await ImageStorage.remove('publication', 3);
class ImageStorage {
  static String _key(String type, dynamic id) => 'img_${type}_$id';

  /// Save a base64 data-URL string. Pass null or '' to clear it.
  static Future<void> save(String type, dynamic id, String? dataUrl) async {
    final prefs = await SharedPreferences.getInstance();
    if (dataUrl == null || dataUrl.isEmpty) {
      await prefs.remove(_key(type, id));
    } else {
      await prefs.setString(_key(type, id), dataUrl);
    }
  }

  /// Load a base64 data-URL string. Returns '' if not found.
  static Future<String> load(String type, dynamic id) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_key(type, id)) ?? '';
  }

  /// Remove an image.
  static Future<void> remove(String type, dynamic id) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key(type, id));
  }
}