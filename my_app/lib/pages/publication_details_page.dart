// lib/pages/publication_details_page.dart
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';
import '../utils/auth.dart';
import '../utils/image_storage.dart';
import '../widgets/image_picker_widget.dart';

class PublicationDetailsPage extends StatefulWidget {
  final String publicationId;
  const PublicationDetailsPage({super.key, required this.publicationId});

  @override
  State<PublicationDetailsPage> createState() => _PublicationDetailsPageState();
}

class _PublicationDetailsPageState extends State<PublicationDetailsPage> {
  Map<String, dynamic>? publication;
  String publicationName = '';
  String? logoUrl;
  bool loading = true;
  bool saving = false;
  String? error;
  bool isEditing = false;

  @override
  void initState() {
    super.initState();
    _fetchPublication();
  }

  Future<void> _fetchPublication() async {
    try {
      final res = await ApiService.get('/publications/${widget.publicationId}');
      final data = (res.data['publication'] ?? res.data) as Map<String, dynamic>;
      final logo = await ImageStorage.load('publication', widget.publicationId);
      setState(() {
        publication = data;
        publicationName = data['publication_name'] ?? '';
        logoUrl = logo;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Failed to load publication details';
        loading = false;
      });
    }
  }

  Future<void> _handleSave() async {
    setState(() => saving = true);
    try {
      await ImageStorage.save('publication', widget.publicationId, logoUrl);
      await ApiService.put('/publications/${widget.publicationId}', data: {'publication_name': publicationName});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Publication updated successfully!'), backgroundColor: Colors.green),
        );
        setState(() => isEditing = false);
        _fetchPublication();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update publication'), backgroundColor: Colors.red),
        );
      }
    } finally {
      setState(() => saving = false);
    }
  }

  void _handleCancel() async {
    final logo = await ImageStorage.load('publication', widget.publicationId);
    setState(() {
      isEditing = false;
      publicationName = publication?['publication_name'] ?? '';
      logoUrl = logo;
    });
  }

  Uint8List _decodeImage(String value) {
    final s = value.contains(',') ? value.split(',').last : value;
    return base64Decode(s);
  }

  Widget _buildLogo() {
    return Container(
      width: 100, height: 100,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 2),
        gradient: const LinearGradient(colors: [Color(0xFFFFF7ED), Color(0xFFFED7AA)], begin: Alignment.topLeft, end: Alignment.bottomRight),
      ),
      clipBehavior: Clip.antiAlias,
      child: logoUrl != null && logoUrl!.isNotEmpty
          ? Image.memory(_decodeImage(logoUrl!), fit: BoxFit.contain)
          : const Icon(Icons.business_outlined, size: 40, color: Color(0xFFFDA07A)),
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
      const Text('Publisher Logo', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
      const SizedBox(height: 12),
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _buildLogo(),
        const SizedBox(width: 20),
        Expanded(child: ImagePickerWidget(value: logoUrl, onChange: (v) => setState(() => logoUrl = v), hidePreview: true)),
      ]),
      const SizedBox(height: 20),
      RichText(text: const TextSpan(
        text: 'Publication Name ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.black),
        children: [TextSpan(text: '*', style: TextStyle(color: Colors.red))],
      )),
      const SizedBox(height: 8),
      TextFormField(
        initialValue: publicationName,
        onChanged: (v) => publicationName = v,
        decoration: InputDecoration(
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFD1D5DB), width: 2)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFF97316), width: 2)),
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
      const Text('Publisher Logo', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
      const SizedBox(height: 12),
      _buildLogo(),
      const SizedBox(height: 20),
      const Text('Publication Name', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
      const SizedBox(height: 6),
      Text(publication!['publication_name'] ?? '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
      const SizedBox(height: 16),
      const Text('Publication ID', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
      const SizedBox(height: 6),
      Text('${publication!['publication_id'] ?? ''}', style: const TextStyle(color: Color(0xFF374151))),
    ],
  );

  Widget _buildBooksList() {
    final books = (publication!['Books'] as List?) ?? [];
    if (books.isEmpty) return const Text('No books found for this publication', style: TextStyle(color: Color(0xFF6B7280)));
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
                  Text('ISBN: ${book['isbn'] ?? 'N/A'}', style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
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
    if (publication == null) return const Scaffold(body: Center(child: Text('Publication not found')));

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
                  GestureDetector(onTap: () => context.go('/publications'), child: const Text('← Back', style: TextStyle(color: Color(0xFF6B7280)))),
                  const SizedBox(width: 16),
                  const Text('Publication Details', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
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
                Text('Books by ${publication!['publication_name']}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
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