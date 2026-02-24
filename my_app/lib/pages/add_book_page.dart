// lib/pages/add_book_page.dart
import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import '../services/api.dart';
import '../utils/image_storage.dart';
import '../widgets/image_picker_widget.dart';
import '../widgets/form_widgets.dart';

class AddBookPage extends StatefulWidget {
  const AddBookPage({super.key});

  @override
  State<AddBookPage> createState() => _AddBookPageState();
}

class _AddBookPageState extends State<AddBookPage> {
  // ── Step ──
  int _step = 1;
  dynamic _bookId;

  // ── Form fields ──
  final _titleCtrl = TextEditingController();
  final _isbnCtrl  = TextEditingController();
  final _yearCtrl  = TextEditingController();
  String? _imageB64;

  dynamic _selectedCategoryId;
  dynamic _selectedPublicationId;
  List<dynamic> _selectedAuthorIds = [];
  List<dynamic> _selectedGenreIds  = [];

  // ── Options lists ──
  List<dynamic> _authors      = [];
  List<dynamic> _genres       = [];
  List<dynamic> _categories   = [];
  List<dynamic> _publications = [];
  bool _optsLoading = true;

  // ── Submit state ──
  bool   _loading = false;
  String _error   = '';

  // ── Quick-add modals ──
  String? _openModal;

  // ── Step 2: Copies ──
  final _barcodeCtrl = TextEditingController();
  List<String> _copies     = [];
  bool         _addingCopy = false;

  // ── ISBN autofill ──
  bool          _fetchingIsbn  = false;
  List<String>? _autofillFields;
  Timer?        _isbnDebounce;

  @override
  void initState() {
    super.initState();
    _fetchOptions();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _isbnCtrl.dispose();
    _yearCtrl.dispose();
    _barcodeCtrl.dispose();
    _isbnDebounce?.cancel();
    super.dispose();
  }

  Future<void> _fetchOptions() async {
    try {
      final results = await Future.wait([
        ApiService.get('/authors'),
        ApiService.get('/genres'),
        ApiService.get('/categories'),
        ApiService.get('/publications'),
      ]);
      setState(() {
        _authors      = _toList(results[0].data, ['authors']);
        _genres       = _toList(results[1].data, ['genres']);
        _categories   = _toList(results[2].data, ['categories']);
        _publications = _toList(results[3].data, ['publications']);
      });
    } catch (_) {
      setState(() => _error = 'Failed to load form options');
    } finally {
      if (mounted) setState(() => _optsLoading = false);
    }
  }

  List<dynamic> _toList(dynamic data, List<String> keys) {
    if (data is List) return data;
    for (final k in keys) {
      if (data is Map && data[k] is List) return data[k];
    }
    return [];
  }

  // ── ISBN autofill ──────────────────────────────────────────────────────

  void _onIsbnChanged(String value) {
    setState(() => _autofillFields = null);
    _isbnDebounce?.cancel();
    final clean = value.replaceAll(RegExp(r'[\s\-]'), '');
    if (RegExp(r'^\d{10}(\d{3})?$').hasMatch(clean)) {
      _isbnDebounce = Timer(const Duration(milliseconds: 600), () => _handleIsbnLookup(value));
    }
  }

  Future<void> _handleIsbnLookup(String isbnValue) async {
    final clean = isbnValue.replaceAll(RegExp(r'[\s\-]'), '');
    if (!RegExp(r'^\d{10}(\d{3})?$').hasMatch(clean)) return;

    setState(() { _fetchingIsbn = true; _autofillFields = null; });

    try {
      final res = await http.get(Uri.parse(
          'https://www.googleapis.com/books/v1/volumes?q=isbn:$clean&maxResults=1'));
          print('ISBN lookup response: ${res.statusCode}');
print('ISBN lookup body: ${res.body}');
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final items = data['items'] as List?;
      if (res.statusCode == 429) {
  _showSnack('Google Books quota exceeded — try again tomorrow');
  return;
}
      if (items == null || items.isEmpty) {
        _showSnack('No book found for this ISBN');
        return;
      }

      final info = (items[0] as Map<String, dynamic>)['volumeInfo'] as Map<String, dynamic>;
      final filled = <String>[];

      // Snapshot current lists for chained creates
      var latestAuthors      = List<dynamic>.from(_authors);
      var latestGenres       = List<dynamic>.from(_genres);
      var latestCategories   = List<dynamic>.from(_categories);
      var latestPublications = List<dynamic>.from(_publications);

      // Title
      final title = info['title'] as String?;
      if (title != null) { _titleCtrl.text = title; filled.add('Title'); }

      // Year
      final publishedDate = info['publishedDate'] as String?;
      if (publishedDate != null) {
        final year = publishedDate.split('-').first;
        if (year.length == 4) { _yearCtrl.text = year; filled.add('Year'); }
      }

      // Cover image
      final imageLinks = info['imageLinks'] as Map<String, dynamic>?;
      if (imageLinks != null) {
        var imgUrl = (imageLinks['thumbnail'] as String? ?? '')
            .replaceAll('http://', 'https://')
            .replaceAll('zoom=1', 'zoom=0');
        if (imgUrl.isNotEmpty) {
          final b64 = await _fetchImageAsBase64(imgUrl);
          if (b64 != null) { setState(() => _imageB64 = b64); filled.add('Cover'); }
        }
      }

      // Authors
      final apiAuthors = info['authors'] as List?;
      if (apiAuthors != null && apiAuthors.isNotEmpty) {
        final ids = <dynamic>[];
        for (final name in apiAuthors.cast<String>()) {
          final result = await _resolveAuthor(name, latestAuthors);
          if (result['created'] == true) latestAuthors = [...latestAuthors, result['item']];
          final id = result['id'];
          if (!ids.any((x) => x.toString() == id.toString())) ids.add(id);
        }
        latestAuthors = List<dynamic>.from(latestAuthors);
        setState(() {
          _authors = latestAuthors;
          _selectedAuthorIds = ids;
        });
        filled.add(apiAuthors.length > 1 ? 'Authors' : 'Author');
      }

      // Publisher
      final publisher = info['publisher'] as String?;
      if (publisher != null) {
        final result = await _resolvePublication(publisher, latestPublications);
        if (result['created'] == true) {
          latestPublications = [...latestPublications, result['item']];
          setState(() => _publications = List<dynamic>.from(latestPublications));
        }
        setState(() => _selectedPublicationId = result['id']);
        filled.add('Publisher');
      }

      // Categories → first segment = Category, all segments = Genres
      final apiCategories = info['categories'] as List?;
      if (apiCategories != null && apiCategories.isNotEmpty) {
        final segments = apiCategories
            .cast<String>()
            .expand((c) => c.split(RegExp(r'[/,]')).map((s) => s.trim()).where((s) => s.isNotEmpty))
            .toList();

        if (segments.isNotEmpty) {
          final catResult = await _resolveCategory(segments.first, latestCategories);
          if (catResult['created'] == true) {
            latestCategories = [...latestCategories, catResult['item']];
            setState(() => _categories = List<dynamic>.from(latestCategories));
          }
          setState(() => _selectedCategoryId = catResult['id']);
          filled.add('Category');
        }

        final genreIds = <dynamic>[];
        for (final name in segments) {
          final result = await _resolveGenre(name, latestGenres);
          if (result['created'] == true) latestGenres = [...latestGenres, result['item']];
          final id = result['id'];
          if (!genreIds.any((x) => x.toString() == id.toString())) genreIds.add(id);
        }
        setState(() {
          _genres = List<dynamic>.from(latestGenres);
          _selectedGenreIds = genreIds;
        });
        filled.add('Genres');
      }

      setState(() => _autofillFields = filled);
      _showSnack('Autofilled from Google Books: ${filled.join(', ')}', success: true);
    } catch (e) {
      print('ISBN lookup error: $e');
      print('ISBN lookup error type: ${e.runtimeType}');
      _showSnack('Failed to fetch book details');
    } finally {
      if (mounted) setState(() => _fetchingIsbn = false);
    }
  }

  Future<String?> _fetchImageAsBase64(String url) async {
    try {
      final res = await http.get(Uri.parse(url));
      if (res.statusCode == 200) {
        final mime = res.headers['content-type'] ?? 'image/jpeg';
        return 'data:$mime;base64,${base64Encode(res.bodyBytes)}';
      }
    } catch (_) {}
    return null;
  }

  // ── Resolve helpers (find-or-create) ──────────────────────────────────

  Future<Map<String, dynamic>> _resolveAuthor(String name, List<dynamic> list) async {
    final existing = list.firstWhere(
      (a) => (a['author_name'] as String? ?? '').toLowerCase() == name.toLowerCase(),
      orElse: () => null,
    );
    if (existing != null) return {'id': existing['author_id'], 'item': existing, 'created': false};
    final res = await ApiService.post('/authors', data: {'author_name': name});
    final item = res.data['author'] ?? res.data;
    return {'id': item['author_id'], 'item': item, 'created': true};
  }

  Future<Map<String, dynamic>> _resolvePublication(String name, List<dynamic> list) async {
    final existing = list.firstWhere(
      (p) => (p['publication_name'] as String? ?? '').toLowerCase() == name.toLowerCase(),
      orElse: () => null,
    );
    if (existing != null) return {'id': existing['publication_id'], 'item': existing, 'created': false};
    final res = await ApiService.post('/publications', data: {'publication_name': name});
    final item = res.data['publication'] ?? res.data;
    return {'id': item['publication_id'], 'item': item, 'created': true};
  }

  Future<Map<String, dynamic>> _resolveGenre(String name, List<dynamic> list) async {
    final existing = list.firstWhere(
      (g) => (g['genre_name'] as String? ?? '').toLowerCase() == name.toLowerCase(),
      orElse: () => null,
    );
    if (existing != null) return {'id': existing['genre_id'], 'item': existing, 'created': false};
    final res = await ApiService.post('/genres', data: {'name': name});
    final item = res.data['genre'] ?? res.data;
    final normalized = {
      ...Map<String, dynamic>.from(item as Map),
      'genre_id':   item['genre_id']   ?? item['id'],
      'genre_name': item['genre_name'] ?? item['name'] ?? name,
    };
    return {'id': normalized['genre_id'], 'item': normalized, 'created': true};
  }

  Future<Map<String, dynamic>> _resolveCategory(String name, List<dynamic> list) async {
    final existing = list.firstWhere(
      (c) => ((c['category_name'] ?? c['name'] ?? '') as String).toLowerCase() == name.toLowerCase(),
      orElse: () => null,
    );
    if (existing != null) return {'id': existing['category_id'] ?? existing['id'], 'item': existing, 'created': false};
    final res = await ApiService.post('/categories', data: {'name': name});
    final item = res.data['category'] ?? res.data;
    return {'id': item['category_id'] ?? item['id'], 'item': item, 'created': true};
  }

  // ── Step 1 submit ──────────────────────────────────────────────────────

  Future<void> _submitBook() async {
    setState(() => _error = '');
    if (_titleCtrl.text.trim().isEmpty || _isbnCtrl.text.trim().isEmpty || _yearCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Please fill in all required fields (Title, ISBN, Year)');
      return;
    }
    if (_selectedAuthorIds.isEmpty) {
      setState(() => _error = 'Please select at least one author');
      return;
    }
    setState(() => _loading = true);
    try {
      final res = await ApiService.post('/books', data: {
        'title':            _titleCtrl.text.trim(),
        'isbn':             _isbnCtrl.text.trim(),
        'publication_year': int.tryParse(_yearCtrl.text.trim()),
        if (_selectedCategoryId   != null) 'category_id':    _selectedCategoryId,
        if (_selectedPublicationId != null) 'publication_id': _selectedPublicationId,
        'authorIds': _selectedAuthorIds,
        'genreIds':  _selectedGenreIds,
      });
      final id = res.data['book']?['book_id'] ?? res.data['bookId'];
      if (id != null && _imageB64 != null && _imageB64!.isNotEmpty) {
        await ImageStorage.save('book', id, _imageB64);
      }
      setState(() { _bookId = id; _step = 2; });
    } catch (e) {
      setState(() => _error = _extractError(e).isNotEmpty ? _extractError(e) : 'Failed to add book');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Step 2: add copy ───────────────────────────────────────────────────

  Future<void> _addCopy() async {
    if (_barcodeCtrl.text.trim().isEmpty) return;
    setState(() => _addingCopy = true);
    try {
      await ApiService.post('/copies', data: {
        'book_id':   _bookId,
        'copy_code': _barcodeCtrl.text.trim(),
        'status':    'available',
      });
      setState(() { _copies.add(_barcodeCtrl.text.trim()); _barcodeCtrl.clear(); });
    } catch (e) {
      _showSnack(_extractError(e).isNotEmpty ? _extractError(e) : 'Failed to add copy');
    } finally {
      if (mounted) setState(() => _addingCopy = false);
    }
  }

  // ── Quick-add helpers ──────────────────────────────────────────────────

  Future<void> _quickAddAuthor(String name) async {
    final res = await ApiService.post('/authors', data: {'author_name': name});
    final a = res.data['author'] ?? res.data;
    setState(() {
      _authors.add(a);
      _selectedAuthorIds.add(a['author_id']);
      _openModal = null;
    });
  }

  Future<void> _quickAddPublication(String name) async {
    final res = await ApiService.post('/publications', data: {'publication_name': name});
    final p = res.data['publication'] ?? res.data;
    setState(() {
      _publications.add(p);
      _selectedPublicationId = p['publication_id'];
      _openModal = null;
    });
  }

  Future<void> _quickAddCategory(String name) async {
    final res = await ApiService.post('/categories', data: {'name': name});
    final c = res.data['category'] ?? res.data;
    setState(() {
      _categories.add(c);
      _selectedCategoryId = c['category_id'] ?? c['id'];
      _openModal = null;
    });
  }

  Future<void> _quickAddGenre(String name) async {
    final res = await ApiService.post('/genres', data: {'name': name});
    final g = res.data['genre'] ?? res.data;
    setState(() {
      _genres.add(g);
      _selectedGenreIds.add(g['genre_id'] ?? g['id']);
      _openModal = null;
    });
  }

  // ── Misc ───────────────────────────────────────────────────────────────

  String _extractError(dynamic e) {
    try { return e.response?.data?['message'] ?? e.response?.data?['error'] ?? ''; } catch (_) { return ''; }
  }

  void _showSnack(String msg, {bool success = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: success ? const Color(0xFF10B981) : const Color(0xFFEF4444),
    ));
  }

  // ─────────────────────────────────────────────────────────────────────
  // BUILD
  // ─────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: Stack(children: [
        _step == 1 ? _buildStep1() : _buildStep2(),

        if (_openModal == 'author')
          QuickAddModal(title: 'Add New Author', placeholder: 'Author name',
              accentColor: const Color(0xFF7C3AED),
              onAdd: _quickAddAuthor, onClose: () => setState(() => _openModal = null)),
        if (_openModal == 'publication')
          QuickAddModal(title: 'Add New Publisher', placeholder: 'Publisher name',
              accentColor: const Color(0xFFEA580C),
              onAdd: _quickAddPublication, onClose: () => setState(() => _openModal = null)),
        if (_openModal == 'category')
          QuickAddModal(title: 'Add New Category', placeholder: 'Category name',
              accentColor: const Color(0xFF2563EB),
              onAdd: _quickAddCategory, onClose: () => setState(() => _openModal = null)),
        if (_openModal == 'genre')
          QuickAddModal(title: 'Add New Genre', placeholder: 'Genre name',
              accentColor: const Color(0xFF4F46E5),
              onAdd: _quickAddGenre, onClose: () => setState(() => _openModal = null)),
      ]),
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // STEP 1 — Book info
  // ─────────────────────────────────────────────────────────────────────

  Widget _buildStep1() {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Header
              GestureDetector(
                onTap: () => context.go('/books'),
                child: const Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.arrow_back, size: 18, color: Color(0xFF6B7280)),
                  SizedBox(width: 4),
                  Text('Back', style: TextStyle(fontSize: 14, color: Color(0xFF6B7280))),
                ]),
              ),
              const SizedBox(height: 12),
              const Text('Add New Book',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
              const SizedBox(height: 20),

              const _StepBar(step: 1),
              const SizedBox(height: 20),

              if (_error.isNotEmpty) ...[
                ErrorBanner(messages: [_error]),
                const SizedBox(height: 16),
              ],

              FormCard(title: 'Book Details', children: [
                // Cover image
                const FieldLabel(label: 'Book Cover'),
                const SizedBox(height: 8),
                ImagePickerWidget(
                  value: _imageB64,
                  onChange: (b64) => setState(() => _imageB64 = b64),
                ),
                const SizedBox(height: 20),

                // ── ISBN with Lookup button (at top so autofill fills fields below) ──
                const FieldLabel(label: 'ISBN', required: true),
                const SizedBox(height: 6),
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(child: ValidatedField(
                    controller: _isbnCtrl,
                    placeholder: 'Enter ISBN-10 or ISBN-13',
                    onChanged: _onIsbnChanged,
                  )),
                  const SizedBox(width: 8),
                  SizedBox(
                    height: 48,
                    child: ElevatedButton.icon(
                      onPressed: (_fetchingIsbn || _isbnCtrl.text.trim().isEmpty)
                          ? null
                          : () => _handleIsbnLookup(_isbnCtrl.text),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF4F46E5),
                        disabledBackgroundColor: const Color(0xFFE5E7EB),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                      ),
                      icon: _fetchingIsbn
                          ? const SizedBox(width: 14, height: 14,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.search, size: 16, color: Colors.white),
                      label: Text(
                        _fetchingIsbn ? 'Looking up…' : 'Lookup',
                        style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ]),

                // Autofill result banner
                if (_autofillFields != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEEF2FF),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFC7D2FE)),
                    ),
                    child: Row(children: [
                      const Icon(Icons.check_circle_outline, size: 16, color: Color(0xFF4F46E5)),
                      const SizedBox(width: 8),
                      Expanded(child: Text(
                        'Autofilled from Google Books: ${_autofillFields!.join(', ')}',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF3730A3), fontWeight: FontWeight.w500),
                      )),
                      GestureDetector(
                        onTap: () => setState(() => _autofillFields = null),
                        child: const Icon(Icons.close, size: 14, color: Color(0xFF818CF8)),
                      ),
                    ]),
                  ),
                ]  else if (!_fetchingIsbn) ...[
  const SizedBox(height: 6),
  Row(children: const [
    Icon(Icons.info_outline, size: 13, color: Color(0xFFD1D5DB)),
    SizedBox(width: 4),
    Flexible(
      child: Text(
        'Enter a valid ISBN to auto-fill title, author, cover and more',
        style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
      ),
    ),
  ]),
],
                const SizedBox(height: 20),

                // Title
                const FieldLabel(label: 'Title', required: true),
                const SizedBox(height: 6),
                ValidatedField(controller: _titleCtrl, placeholder: 'Enter book title'),
                const SizedBox(height: 16),

                // ISBN + Year row
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const FieldLabel(label: 'Publication Year', required: true),
                    const SizedBox(height: 6),
                    ValidatedField(
                      controller: _yearCtrl,
                      placeholder: DateTime.now().year.toString(),
                      keyboardType: TextInputType.number,
                    ),
                  ])),
                ]),
                const SizedBox(height: 20),

                // Options fields
                if (!_optsLoading) ...[
                  SearchDropdown(
                    label: 'Category',
                    placeholder: 'Search and select category...',
                    items: _categories,
                    idField: 'category_id',
                    nameField: 'category_name',
                    selectedId: _selectedCategoryId,
                    accentColor: const Color(0xFF2563EB),
                    onSelect: (id) => setState(() => _selectedCategoryId = id),
                    onClear: () => setState(() => _selectedCategoryId = null),
                    onAddNew: () => setState(() => _openModal = 'category'),
                    addNewLabel: 'Add New Category',
                  ),
                  const SizedBox(height: 16),

                  SearchDropdown(
                    label: 'Publisher',
                    placeholder: 'Search and select publisher...',
                    items: _publications,
                    idField: 'publication_id',
                    nameField: 'publication_name',
                    selectedId: _selectedPublicationId,
                    accentColor: const Color(0xFFEA580C),
                    onSelect: (id) => setState(() => _selectedPublicationId = id),
                    onClear: () => setState(() => _selectedPublicationId = null),
                    onAddNew: () => setState(() => _openModal = 'publication'),
                    addNewLabel: 'Add New Publisher',
                  ),
                  const SizedBox(height: 16),

                  MultiSelectDropdown(
                    label: 'Authors',
                    placeholder: 'Search and add authors...',
                    items: _authors,
                    idField: 'author_id',
                    nameField: 'author_name',
                    selectedIds: _selectedAuthorIds,
                    accentColor: const Color(0xFF7C3AED),
                    onAdd: (id) => setState(() {
                      if (!_selectedAuthorIds.any((s) => s.toString() == id.toString())) {
                        _selectedAuthorIds.add(id);
                      }
                    }),
                    onRemove: (id) => setState(() =>
                        _selectedAuthorIds.removeWhere((s) => s.toString() == id.toString())),
                    onAddNew: () => setState(() => _openModal = 'author'),
                    addNewLabel: 'Add New Author',
                    required: true,
                  ),
                  const SizedBox(height: 16),

                  MultiSelectDropdown(
                    label: 'Genres',
                    placeholder: 'Search and add genres...',
                    items: _genres,
                    idField: 'genre_id',
                    nameField: 'genre_name',
                    selectedIds: _selectedGenreIds,
                    accentColor: const Color(0xFF4F46E5),
                    onAdd: (id) => setState(() {
                      if (!_selectedGenreIds.any((s) => s.toString() == id.toString())) {
                        _selectedGenreIds.add(id);
                      }
                    }),
                    onRemove: (id) => setState(() =>
                        _selectedGenreIds.removeWhere((s) => s.toString() == id.toString())),
                    onAddNew: () => setState(() => _openModal = 'genre'),
                    addNewLabel: 'Add New Genre',
                  ),
                ] else
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: CircularProgressIndicator(color: Color(0xFF2563EB)),
                    ),
                  ),

                const SizedBox(height: 24),

                Row(children: [
                  Expanded(child: ElevatedButton(
                    onPressed: _loading ? null : _submitBook,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      disabledBackgroundColor: const Color(0xFF9CA3AF),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      elevation: 0,
                    ),
                    child: _loading
                        ? const SizedBox(width: 18, height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Create Book & Add Copies',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
                  )),
                  const SizedBox(width: 12),
                  OutlinedButton(
                    onPressed: () => context.go('/books'),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFD1D5DB), width: 2),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
                    ),
                    child: const Text('Cancel',
                        style: TextStyle(color: Color(0xFF374151), fontWeight: FontWeight.w600)),
                  ),
                ]),
              ]),
              const SizedBox(height: 32),
            ]),
          ),
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // STEP 2 — Add copies
  // ─────────────────────────────────────────────────────────────────────

  Widget _buildStep2() {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Add Copies',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
              const SizedBox(height: 4),
              Text('"${_titleCtrl.text}" created! Now add physical copies.',
                  style: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
              const SizedBox(height: 20),

              const _StepBar(step: 2),
              const SizedBox(height: 20),

              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: TextField(
                      controller: _barcodeCtrl,
                      autofocus: true,
                      onSubmitted: (_) => _addCopy(),
                      style: const TextStyle(fontSize: 14, fontFamily: 'monospace'),
                      decoration: InputDecoration(
                        hintText: 'Scan or enter barcode',
                        hintStyle: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                        contentPadding: const EdgeInsets.all(14),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFFD1D5DB), width: 2)),
                        enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFFD1D5DB), width: 2)),
                        focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2)),
                        filled: true, fillColor: Colors.white,
                        prefixIcon: const Icon(Icons.barcode_reader, color: Color(0xFF9CA3AF)),
                      ),
                    )),
                    const SizedBox(width: 10),
                    ElevatedButton(
                      onPressed: _addingCopy ? null : _addCopy,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
                        elevation: 0,
                      ),
                      child: _addingCopy
                          ? const SizedBox(width: 16, height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Add Copy',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                    ),
                  ]),
                  if (_copies.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    ...List.generate(_copies.length, (i) => Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFA7F3D0)),
                      ),
                      child: Row(children: [
                        const Icon(Icons.check_circle_outline, size: 16, color: Color(0xFF10B981)),
                        const SizedBox(width: 8),
                        Text(_copies[i], style: const TextStyle(
                            fontSize: 13, fontFamily: 'monospace',
                            color: Color(0xFF374151), fontWeight: FontWeight.w500)),
                        const Spacer(),
                        const Text('Available', style: TextStyle(
                            fontSize: 11, color: Color(0xFF10B981), fontWeight: FontWeight.w600)),
                      ]),
                    )),
                  ],
                ]),
              ),
              const SizedBox(height: 16),

              Row(children: [
                Expanded(child: ElevatedButton(
                  onPressed: () {
                    _showSnack('Book added with ${_copies.length} copies!', success: true);
                    context.go('/books');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    elevation: 0,
                  ),
                  child: Text(
                    _copies.isNotEmpty ? 'Finish (${_copies.length} added)' : 'Finish',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14),
                  ),
                )),
                const SizedBox(width: 12),
                OutlinedButton(
                  onPressed: _confirmSkip,
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFFD1D5DB), width: 2),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
                  ),
                  child: const Text('Skip for Now',
                      style: TextStyle(color: Color(0xFF6B7280), fontWeight: FontWeight.w600)),
                ),
              ]),
              const SizedBox(height: 32),
            ]),
          ),
        ),
      ),
    );
  }

  Future<void> _confirmSkip() async {
    final router = GoRouter.of(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Skip adding copies?',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        content: const Text('You can add copies later from the book details page.',
            style: TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white, elevation: 0),
            child: const Text('Skip'),
          ),
        ],
      ),
    );
    if (ok == true && mounted) router.go('/books');
  }
}

// ── Step progress bar ──────────────────────────────────────────────────────

class _StepBar extends StatelessWidget {
  final int step;
  const _StepBar({required this.step});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      _StepDot(n: 1, active: step == 1, done: step > 1, label: 'Book Info'),
      Expanded(child: Container(
        height: 2,
        color: step > 1 ? const Color(0xFF2563EB) : const Color(0xFFE5E7EB),
      )),
      _StepDot(n: 2, active: step == 2, done: false, label: 'Add Copies'),
    ]);
  }
}

class _StepDot extends StatelessWidget {
  final int n;
  final bool active, done;
  final String label;
  const _StepDot({required this.n, required this.active, required this.done, required this.label});

  @override
  Widget build(BuildContext context) {
    final Color bg = (done || active) ? const Color(0xFF2563EB) : const Color(0xFFE5E7EB);
    final Color fg = (done || active) ? Colors.white : const Color(0xFF9CA3AF);
    return Column(children: [
      Container(
        width: 32, height: 32,
        decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
        child: Center(child: done
            ? const Icon(Icons.check, size: 16, color: Colors.white)
            : Text('$n', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: fg))),
      ),
      const SizedBox(height: 4),
      Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600,
          color: active ? const Color(0xFF2563EB) : const Color(0xFF9CA3AF))),
    ]);
  }
}