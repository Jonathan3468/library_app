// lib/pages/author_details_page.dart
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';
import '../utils/auth.dart';
import '../utils/image_storage.dart';
import '../widgets/image_picker_widget.dart';

class AuthorDetailsPage extends StatefulWidget {
  final String authorId;
  const AuthorDetailsPage({super.key, required this.authorId});

  @override
  State<AuthorDetailsPage> createState() => _AuthorDetailsPageState();
}

class _AuthorDetailsPageState extends State<AuthorDetailsPage> {
  Map<String, dynamic>? author;
  String authorName = '';
  String? photoUrl;
  bool loading = true;
  bool saving = false;
  String? error;
  bool isEditing = false;

  @override
  void initState() {
    super.initState();
    _fetchAuthor();
  }

  Future<void> _fetchAuthor() async {
    try {
      final res = await ApiService.get('/authors/${widget.authorId}');
      final data = (res.data['author'] ?? res.data) as Map<String, dynamic>;
      final photo = await ImageStorage.load('author', widget.authorId);
      setState(() {
        author = data;
        authorName = data['author_name'] ?? '';
        photoUrl = photo;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Failed to load author details';
        loading = false;
      });
    }
  }

  Future<void> _handleSave() async {
    setState(() => saving = true);
    try {
      await ImageStorage.save('author', widget.authorId, photoUrl);
      await ApiService.put('/authors/${widget.authorId}', data: {'author_name': authorName});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Author updated successfully!'), backgroundColor: Colors.green),
        );
        setState(() => isEditing = false);
        _fetchAuthor();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update author'), backgroundColor: Colors.red),
        );
      }
    } finally {
      setState(() => saving = false);
    }
  }

  void _handleCancel() async {
    final photo = await ImageStorage.load('author', widget.authorId);
    setState(() {
      isEditing = false;
      authorName = author?['author_name'] ?? '';
      photoUrl = photo;
    });
  }

  Uint8List _decodeImage(String value) {
    final s = value.contains(',') ? value.split(',').last : value;
    return base64Decode(s);
  }

  Widget _buildAvatar() {
    return Container(
      width: 100, height: 100,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFE5E7EB), width: 2),
        gradient: const LinearGradient(colors: [Color(0xFFF1F5F9), Color(0xFFE2E8F0)], begin: Alignment.topLeft, end: Alignment.bottomRight),
      ),
      clipBehavior: Clip.antiAlias,
      child: photoUrl != null && photoUrl!.isNotEmpty
          ? Image.memory(_decodeImage(photoUrl!), fit: BoxFit.cover)
          : const Icon(Icons.person_outline, size: 40, color: Color(0xFF94A3B8)),
    );
  }

  Widget _buildCard(Widget child) => Container(
    width: double.infinity,
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 10, offset: const Offset(0, 2))],
    ),
    padding: const EdgeInsets.all(24),
    child: child,
  );

  Widget _buildEditMode() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text('Author Photo', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
      const SizedBox(height: 12),
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _buildAvatar(),
        const SizedBox(width: 20),
        Expanded(child: ImagePickerWidget(value: photoUrl, onChange: (v) => setState(() => photoUrl = v), hidePreview: true)),
      ]),
      const SizedBox(height: 20),
      RichText(text: const TextSpan(
        text: 'Author Name ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.black),
        children: [TextSpan(text: '*', style: TextStyle(color: Colors.red))],
      )),
      const SizedBox(height: 8),
      TextFormField(
        initialValue: authorName,
        onChanged: (v) => authorName = v,
        decoration: InputDecoration(
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFD1D5DB), width: 2)),
          contentPadding: const EdgeInsets.all(12),
        ),
      ),
      const SizedBox(height: 20),
      Row(children: [
        Expanded(
          child: ElevatedButton(
            onPressed: saving ? null : _handleSave,
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF16A34A), padding: const EdgeInsets.symmetric(vertical: 14)),
            child: Text(saving ? 'Saving...' : 'Save Changes', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
          ),
        ),
        const SizedBox(width: 12),
        OutlinedButton(
          onPressed: _handleCancel,
          style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20)),
          child: const Text('Cancel'),
        ),
      ]),
    ],
  );

  Widget _buildViewMode() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text('Author Photo', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
      const SizedBox(height: 12),
      _buildAvatar(),
      const SizedBox(height: 20),
      const Text('Author Name', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
      const SizedBox(height: 6),
      Text(author!['author_name'] ?? '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
      const SizedBox(height: 16),
      const Text('Author ID', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
      const SizedBox(height: 6),
      Text('${author!['author_id'] ?? ''}', style: const TextStyle(color: Color(0xFF374151))),
    ],
  );

  Widget _buildBooksList() {
    final books = (author!['Books'] as List?) ?? [];
    if (books.isEmpty) return const Text('No books found for this author', style: TextStyle(color: Color(0xFF6B7280)));
    return Column(
      children: books.map<Widget>((book) => FutureBuilder<String?>(
        future: ImageStorage.load('book', '${book['book_id']}'),
        builder: (context, snap) {
          final cover = snap.data;
          return GestureDetector(
            onTap: () => context.go('/books/${book['book_id']}'),
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE5E7EB)), borderRadius: BorderRadius.circular(8)),
              child: Row(children: [
                Container(
                  width: 40, height: 58,
                  decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(4), border: Border.all(color: const Color(0xFFE5E7EB))),
                  clipBehavior: Clip.antiAlias,
                  child: cover != null && cover.isNotEmpty
                      ? Image.memory(_decodeImage(cover), fit: BoxFit.cover)
                      : const Icon(Icons.menu_book_outlined, size: 20, color: Color(0xFFCBD5E1)),
                ),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(book['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
                  Text('Year: ${book['publication_year'] ?? 'N/A'}', style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
                ])),
                const Icon(Icons.chevron_right, color: Color(0xFF9CA3AF)),
              ]),
            ),
          );
        },
      )).toList(),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (error != null) {
      return Scaffold(body: Padding(padding: const EdgeInsets.all(24), child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(8)),
        child: Text(error!, style: const TextStyle(color: Color(0xFFB91C1C))),
      )));
    }
    if (author == null) return const Scaffold(body: Center(child: Text('Author not found')));

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Expanded(child: Row(children: [
                  GestureDetector(onTap: () => context.go('/authors'), child: const Text('← Back', style: TextStyle(color: Color(0xFF6B7280)))),
                  const SizedBox(width: 16),
                  const Text('Author Details', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                ])),
                if (AuthService.isLibrarian() && !isEditing)
                  ElevatedButton(
                    onPressed: () => setState(() => isEditing = true),
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB)),
                    child: const Text('Edit', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                  ),
              ]),
              const SizedBox(height: 24),
              _buildCard(isEditing ? _buildEditMode() : _buildViewMode()),
              const SizedBox(height: 24),
              _buildCard(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Books by ${author!['author_name']}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                _buildBooksList(),
              ])),
            ],
          ),
        ),
      ),
    );
  }
}