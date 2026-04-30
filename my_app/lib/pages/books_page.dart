// lib/pages/books_page.dart
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';
import '../utils/auth.dart';
import '../utils/image_storage.dart';
import '../widgets/book_import_modal.dart';

class BooksPage extends StatefulWidget {
  const BooksPage({super.key});

  @override
  State<BooksPage> createState() => _BooksPageState();
}

class _BooksPageState extends State<BooksPage> {
  List<dynamic> _books      = [];
  bool   _loading           = true;
  bool   _filtersLoading    = true;
  bool   _filtersOpen       = false;
  bool   _showImport        = false;
  String? _error;

  int    _page        = 1;
  final  _limit       = 12;
  int    _totalPages  = 1;

  final _searchCtrl   = TextEditingController();
  String _debouncedSearch = '';
  String _sortBy      = 'title';
  String _order       = 'ASC';

  List<dynamic> _selectedCategories = [];
  List<dynamic> _selectedGenres     = [];
  List<dynamic> _selectedAuthors    = [];
  List<dynamic> _selectedPublishers = [];

  List<dynamic> _allCategories = [];
  List<dynamic> _allGenres     = [];
  List<dynamic> _allAuthors    = [];
  List<dynamic> _allPublishers = [];

  DateTime? _lastSearchTime;

  int get _activeFilterCount =>
      _selectedCategories.length + _selectedGenres.length +
      _selectedAuthors.length + _selectedPublishers.length;

  @override
  void initState() {
    super.initState();
    _fetchFilters();
    _fetchBooks();
    _searchCtrl.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchCtrl.removeListener(_onSearchChanged);
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    final now = DateTime.now();
    _lastSearchTime = now;
    Future.delayed(const Duration(milliseconds: 500), () {
      if (_lastSearchTime == now) {
        setState(() { _debouncedSearch = _searchCtrl.text; _page = 1; });
        _fetchBooks();
      }
    });
  }

  Future<void> _fetchFilters() async {
    setState(() => _filtersLoading = true);
    try {
      final results = await Future.wait([
        ApiService.get('/categories'),
        ApiService.get('/genres'),
        ApiService.get('/authors'),
        ApiService.get('/publications'),
      ]);
      setState(() {
        _allCategories = results[0].data is List ? results[0].data : results[0].data['categories'] ?? [];
        _allGenres     = results[1].data is List ? results[1].data : results[1].data['genres'] ?? [];
        _allAuthors    = results[2].data is List ? results[2].data : results[2].data['authors'] ?? [];
        _allPublishers = results[3].data is List ? results[3].data : results[3].data['publications'] ?? [];
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _filtersLoading = false);
    }
  }

  Future<void> _fetchBooks() async {
    setState(() { _loading = true; _error = null; });
    try {
      final params = <String, dynamic>{
        'page': _page, 'limit': _limit, 'sortBy': _sortBy, 'order': _order,
      };
      if (_debouncedSearch.isNotEmpty) params['search'] = _debouncedSearch;
      if (_selectedCategories.isNotEmpty) params['category'] = _selectedCategories.join(',');
      if (_selectedGenres.isNotEmpty)     params['genre']    = _selectedGenres.join(',');
      if (_selectedAuthors.isNotEmpty)    params['author']   = _selectedAuthors.join(',');
      if (_selectedPublishers.isNotEmpty) params['publication'] = _selectedPublishers.join(',');

      final res = await ApiService.get('/books', params: params);
      setState(() {
        _books      = res.data['books'] ?? [];
        _totalPages = res.data['totalPages'] ?? 1;
      });
    } catch (_) {
      setState(() { _error = 'Failed to load books.'; _books = []; });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _toggleFilter(dynamic id, List<dynamic> list, Function(List<dynamic>) setter) {
    final updated = List<dynamic>.from(list);
    updated.contains(id) ? updated.remove(id) : updated.add(id);
    setter(updated);
    setState(() => _page = 1);
    _fetchBooks();
  }

  void _clearFilters() {
    setState(() {
      _selectedCategories = []; _selectedGenres = [];
      _selectedAuthors = []; _selectedPublishers = [];
      _page = 1;
    });
    _fetchBooks();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: Stack(children: [
        SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(),
              if (_error != null) _buildError(),
              const SizedBox(height: 16),
              _buildSearchBar(),
              if (_filtersOpen) _buildFiltersPanel(),
              const SizedBox(height: 16),
              _loading ? _buildSkeletonGrid() : _buildBooksGrid(),
              const SizedBox(height: 24),
              _buildPagination(),
            ],
          ),
        ),
        if (_showImport)
          BookImportModal(
            onDone: () { _fetchBooks(); },
            onClose: () => setState(() => _showImport = false),
          ),
      ]),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Books', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
            Text('${_books.length} shown', style: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
          ],
        ),
        if (AuthService.isLibrarian())
          Row(children: [
            OutlinedButton.icon(
              onPressed: () => setState(() => _showImport = true),
              icon: const Icon(Icons.upload_file_outlined, size: 15),
              label: const Text('Import CSV'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF2563EB),
                side: const BorderSide(color: Color(0xFF2563EB)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton.icon(
              onPressed: () => context.go('/books/new'),
              icon: const Icon(Icons.add, size: 16),
              label: const Text('Add Book'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ]),
      ],
    );
  }

  Widget _buildError() {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(_error!, style: const TextStyle(fontSize: 13, color: Color(0xFFDC2626))),
          GestureDetector(
            onTap: () => setState(() => _error = null),
            child: const Text('Dismiss', style: TextStyle(fontSize: 13, color: Color(0xFFDC2626), decoration: TextDecoration.underline)),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Wrap(
        spacing: 10,
        runSpacing: 10,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          SizedBox(
            width: 220,
            height: 38,
            child: TextField(
              controller: _searchCtrl,
              style: const TextStyle(fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Search by title...',
                hintStyle: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                prefixIcon: const Icon(Icons.search, size: 18, color: Color(0xFF9CA3AF)),
                contentPadding: const EdgeInsets.symmetric(vertical: 8),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF93C5FD), width: 2)),
              ),
            ),
          ),
          _dropdown(
            value: _sortBy,
            items: const [DropdownMenuItem(value: 'title', child: Text('Title')), DropdownMenuItem(value: 'publication_year', child: Text('Year'))],
            onChanged: (v) { setState(() { _sortBy = v!; _page = 1; }); _fetchBooks(); },
          ),
          _dropdown(
            value: _order,
            items: const [DropdownMenuItem(value: 'ASC', child: Text('A → Z')), DropdownMenuItem(value: 'DESC', child: Text('Z → A'))],
            onChanged: (v) { setState(() { _order = v!; _page = 1; }); _fetchBooks(); },
          ),
          GestureDetector(
            onTap: () => setState(() => _filtersOpen = !_filtersOpen),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: _filtersOpen || _activeFilterCount > 0 ? const Color(0xFFEFF6FF) : Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: _filtersOpen || _activeFilterCount > 0 ? const Color(0xFFBFDBFE) : const Color(0xFFE5E7EB)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.filter_list, size: 16, color: Color(0xFF2563EB)),
                  const SizedBox(width: 6),
                  const Text('Filters', style: TextStyle(fontSize: 13, color: Color(0xFF2563EB), fontWeight: FontWeight.w500)),
                  if (_activeFilterCount > 0) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFF2563EB), borderRadius: BorderRadius.circular(10)),
                      child: Text('$_activeFilterCount', style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  ],
                  const SizedBox(width: 4),
                  Icon(_filtersOpen ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, size: 16, color: const Color(0xFF2563EB)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _dropdown<T>({required T value, required List<DropdownMenuItem<T>> items, required ValueChanged<T?> onChanged}) {
    return Container(
      height: 38,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFE5E7EB)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(value: value, items: items, onChanged: onChanged, style: const TextStyle(fontSize: 13, color: Color(0xFF4B5563))),
      ),
    );
  }

  Widget _buildFiltersPanel() {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Filter by', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
              if (_activeFilterCount > 0)
                GestureDetector(
                  onTap: _clearFilters,
                  child: Text('Clear all ($_activeFilterCount)', style: const TextStyle(fontSize: 12, color: Color(0xFFEF4444))),
                ),
            ],
          ),
          const SizedBox(height: 16),
          if (_filtersLoading)
            const Text('Loading filters...', style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)))
          else ...[
            _buildFilterSection('Categories', _allCategories, _selectedCategories,
              (v) => setState(() => _selectedCategories = v), 'category_id', 'category_name', const Color(0xFF2563EB), const Color(0xFFEFF6FF), const Color(0xFFBFDBFE)),
            _buildFilterSection('Genres', _allGenres, _selectedGenres,
              (v) => setState(() => _selectedGenres = v), 'genre_id', 'genre_name', const Color(0xFF4F46E5), const Color(0xFFEEF2FF), const Color(0xFFC7D2FE)),
            _buildFilterSection('Authors', _allAuthors, _selectedAuthors,
              (v) => setState(() => _selectedAuthors = v), 'author_id', 'author_name', const Color(0xFF7C3AED), const Color(0xFFF5F3FF), const Color(0xFFDDD6FE)),
            _buildFilterSection('Publishers', _allPublishers, _selectedPublishers,
              (v) => setState(() => _selectedPublishers = v), 'publication_id', 'publication_name', const Color(0xFFEA580C), const Color(0xFFFFF7ED), const Color(0xFFFED7AA)),
          ],
        ],
      ),
    );
  }

  Widget _buildFilterSection(String label, List<dynamic> items, List<dynamic> selected,
      Function(List<dynamic>) setter, String idField, String nameField,
      Color textColor, Color bgColor, Color borderColor) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF6B7280), letterSpacing: 0.5)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: items.map((item) {
            final id = item[idField] ?? item['id'];
            final name = item[nameField] ?? item['name'] ?? '';
            final isActive = selected.contains(id);
            return GestureDetector(
              onTap: () => _toggleFilter(id, selected, setter),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: isActive ? bgColor : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: isActive ? borderColor : const Color(0xFFE5E7EB)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(name, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: isActive ? textColor : const Color(0xFF6B7280))),
                    if (isActive) ...[
                      const SizedBox(width: 4),
                      Text('×', style: TextStyle(fontSize: 14, color: textColor)),
                    ],
                  ],
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildSkeletonGrid() {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 0.6,
      ),
      itemCount: 9,
      itemBuilder: (_, __) => Container(
        decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(16)),
      ),
    );
  }

  Widget _buildBooksGrid() {
    if (_books.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 80),
          child: Column(
            children: [
              Icon(Icons.menu_book_outlined, size: 48, color: Color(0xFFD1D5DB)),
              SizedBox(height: 12),
              Text('No books found', style: TextStyle(fontSize: 14, color: Color(0xFF9CA3AF))),
            ],
          ),
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final cols = constraints.maxWidth < 480 ? 2 : constraints.maxWidth < 768 ? 3 : constraints.maxWidth < 1024 ? 4 : 5;
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: cols, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 0.58,
          ),
          itemCount: _books.length,
          itemBuilder: (context, i) => _BookCard(book: _books[i]),
        );
      },
    );
  }

  Widget _buildPagination() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _pageBtn('← Prev', _page > 1, () { setState(() => _page--); _fetchBooks(); }),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFE5E7EB))),
          child: Text('$_page / $_totalPages', style: const TextStyle(fontSize: 13, color: Color(0xFF4B5563))),
        ),
        const SizedBox(width: 8),
        _pageBtn('Next →', _page < _totalPages, () { setState(() => _page++); _fetchBooks(); }),
      ],
    );
  }

  Widget _pageBtn(String label, bool enabled, VoidCallback onTap) {
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: enabled ? const Color(0xFF4B5563) : const Color(0xFFD1D5DB))),
      ),
    );
  }
}

// ── Book card ──────────────────────────────────────────────────────────────

class _BookCard extends StatefulWidget {
  final Map<String, dynamic> book;
  const _BookCard({required this.book});

  @override
  State<_BookCard> createState() => _BookCardState();
}

class _BookCardState extends State<_BookCard> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _float;
  Uint8List? _coverBytes;
  bool _imageError = false;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 2500))..repeat(reverse: true);
    _float = Tween<double>(begin: 0, end: -4).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
    _loadCover();
  }

  Future<void> _loadCover() async {
    final id = widget.book['book_id'];
    if (id == null) return;
    try {
      final stored = await ImageStorage.load('book', id);
      if (stored == null || !mounted) return;
      final clean = stored.contains(',') ? stored.split(',').last : stored;
      final bytes = base64Decode(clean);
      if (mounted) setState(() => _coverBytes = bytes);
    } catch (_) {
      // silently fall through to placeholder
    }
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  Widget _placeholder() {
    return const Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.menu_book_outlined, size: 36, color: Color(0xFFCBD5E1)),
        SizedBox(height: 4),
        Text('No Cover', style: TextStyle(fontSize: 10, color: Color(0xFFCBD5E1))),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final book = widget.book;
    final authors = (book['Authors'] as List?)?.map((a) => a['author_name'] as String).join(', ') ?? '';
    final genres  = (book['Genres'] as List?)?.take(2).toList() ?? [];

    return AnimatedBuilder(
      animation: _float,
      builder: (context, child) => Transform.translate(
        offset: Offset(0, _float.value),
        child: child,
      ),
      child: GestureDetector(
        onTap: () => context.go('/books/${book['book_id']}'),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE9E9EF)),
            boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 2))],
          ),
          clipBehavior: Clip.hardEdge,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Cover
              Expanded(
                flex: 3,
                child: Container(
                  width: double.infinity,
                  color: const Color(0xFFF1F5F9),
                  child: _coverBytes != null && !_imageError
                      ? Image.memory(
                          _coverBytes!,
                          fit: BoxFit.cover,
                          width: double.infinity,
                          errorBuilder: (_, __, ___) {
                            _imageError = true;
                            return _placeholder();
                          },
                        )
                      : _placeholder(),
                ),
              ),
              // Info
              Expanded(
                flex: 2,
                child: Padding(
                  padding: const EdgeInsets.all(10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(book['title'] ?? '', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF1F2937), height: 1.3), maxLines: 2, overflow: TextOverflow.ellipsis),
                      if (authors.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(authors, style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF)), maxLines: 1, overflow: TextOverflow.ellipsis),
                      ],
                      const Spacer(),
                      Wrap(
                        spacing: 4,
                        children: [
                          ...genres.map((g) => Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFBFDBFE))),
                            child: Text(g['genre_name'] ?? '', style: const TextStyle(fontSize: 9, color: Color(0xFF2563EB), fontWeight: FontWeight.w500)),
                          )),
                          if (book['publication_year'] != null)
                            Text('${book['publication_year']}', style: const TextStyle(fontSize: 9, color: Color(0xFF9CA3AF))),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}