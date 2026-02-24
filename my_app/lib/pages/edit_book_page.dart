// lib/pages/edit_book_page.dart
//
// Equivalent of React's BookDetails.jsx (the /books/:id/edit route).
// Loads book + all option lists in parallel, pre-fills the form,
// then saves via PUT /books/:id.  Also manages copies: add, delete,
// mark-lost (with modal), and restore.
//
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';
import '../utils/auth.dart';
import '../utils/image_storage.dart';
import '../widgets/image_picker_widget.dart';
import '../widgets/form_widgets.dart';

class EditBookPage extends StatefulWidget {
  final String bookId;
  const EditBookPage({super.key, required this.bookId});

  @override
  State<EditBookPage> createState() => _EditBookPageState();
}

class _EditBookPageState extends State<EditBookPage> {
  // ── Data ──
  Map<String, dynamic>? _book;
  List<dynamic> _copies       = [];
  List<dynamic> _authors      = [];
  List<dynamic> _genres       = [];
  List<dynamic> _categories   = [];
  List<dynamic> _publications = [];

  bool   _loading = true;
  bool   _saving  = false;
  String _error   = '';

  // ── Form ──
  final _titleCtrl = TextEditingController();
  final _isbnCtrl  = TextEditingController();
  final _yearCtrl  = TextEditingController();
  String? _imageB64;

  dynamic _selectedCategoryId;
  dynamic _selectedPublicationId;
  List<dynamic> _selectedAuthorIds = [];
  List<dynamic> _selectedGenreIds  = [];

  // ── Modals ──
  bool            _showAddCopyModal = false;
  final _barcodeCtrl = TextEditingController();
  bool            _addingCopy       = false;

  Map<String, dynamic>? _lostModal; // copy object
  final _lostNotesCtrl = TextEditingController();
  bool _markingLost = false;

  @override
  void initState() {
    super.initState();
    // Guard: only librarians may edit
    if (!AuthService.isLibrarian()) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        context.go('/books/${widget.bookId}');
      });
    }
    _fetchAll();
  }

  @override
  void dispose() {
    _titleCtrl.dispose(); _isbnCtrl.dispose(); _yearCtrl.dispose();
    _barcodeCtrl.dispose(); _lostNotesCtrl.dispose();
    super.dispose();
  }

  // ── Data loading ──────────────────────────────────────────────────────

  Future<void> _fetchAll() async {
    setState(() { _loading = true; _error = ''; });
    try {
      final results = await Future.wait([
        ApiService.get('/books/${widget.bookId}'),
        ApiService.get('/authors'),
        ApiService.get('/genres'),
        ApiService.get('/categories'),
        ApiService.get('/publications'),
        ApiService.get('/books/${widget.bookId}/copies'),
      ]);

      final bookData = results[0].data['book'] ?? results[0].data;

      // Load stored image
      final storedImg = await ImageStorage.load('book', widget.bookId);

      setState(() {
        _book        = bookData;
        _authors     = _toList(results[1].data, ['authors']);
        _genres      = _toList(results[2].data, ['genres']);
        _categories  = _toList(results[3].data, ['categories']);
        _publications = _toList(results[4].data, ['publications']);
        _copies      = _toList(results[5].data, ['copies']);

        // Pre-fill form
        _titleCtrl.text = bookData['title'] ?? '';
        _isbnCtrl.text  = bookData['isbn']  ?? '';
        _yearCtrl.text  = bookData['publication_year']?.toString() ?? '';
        _imageB64       = storedImg.isNotEmpty ? storedImg : null;

        _selectedCategoryId   = bookData['category_id'];
        _selectedPublicationId = bookData['publication_id'];
        _selectedAuthorIds    = (bookData['Authors'] as List?)
            ?.map((a) => a['author_id']).toList() ?? [];
        _selectedGenreIds     = (bookData['Genres'] as List?)
            ?.map((g) => g['genre_id']).toList() ?? [];
      });
    } catch (e) {
      setState(() => _error = 'Failed to load book details');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<dynamic> _toList(dynamic data, List<String> keys) {
    if (data is List) return data;
    for (final k in keys) {
      if (data is Map && data[k] is List) return data[k];
    }
    return [];
  }

  // ── Save ──────────────────────────────────────────────────────────────

  Future<void> _save() async {
    setState(() { _saving = true; _error = ''; });
    try {
      // Persist image locally
      await ImageStorage.save('book', widget.bookId, _imageB64);

      await ApiService.put('/books/${widget.bookId}', data: {
        'title':            _titleCtrl.text.trim(),
        'isbn':             _isbnCtrl.text.trim(),
        'publication_year': int.tryParse(_yearCtrl.text.trim()),
        if (_selectedCategoryId   != null) 'category_id':   _selectedCategoryId,
        if (_selectedPublicationId != null) 'publication_id': _selectedPublicationId,
        'authorIds': _selectedAuthorIds,
        'genreIds':  _selectedGenreIds,
      });
      if (mounted) context.go('/books');
    } catch (_) {
      setState(() => _error = 'Failed to save book');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  // ── Copy actions ──────────────────────────────────────────────────────

  Future<void> _addCopy() async {
    if (_barcodeCtrl.text.trim().isEmpty) return;
    setState(() => _addingCopy = true);
    try {
      await ApiService.post('/copies', data: {
        'book_id':   widget.bookId,
        'copy_code': _barcodeCtrl.text.trim(),
        'status':    'available',
      });
      _barcodeCtrl.clear();
      setState(() => _showAddCopyModal = false);
      await _fetchAll();
    } catch (e) {
      _showSnack('Failed to add copy');
    } finally {
      if (mounted) setState(() => _addingCopy = false);
    }
  }

  Future<void> _deleteCopy(dynamic copyId) async {
    final ok = await _confirm(
      title: 'Delete this copy?',
      desc: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      confirmColor: const Color(0xFFEF4444),
    );
    if (!ok) return;
    try {
      await ApiService.delete('/copies/$copyId');
      await _fetchAll();
    } catch (_) { _showSnack('Failed to delete copy'); }
  }

  Future<void> _markLost() async {
    if (_lostModal == null) return;
    setState(() => _markingLost = true);
    try {
      final res = await ApiService.post(
          '/copies/${_lostModal!['copy_id']}/mark-lost',
          data: {'notes': _lostNotesCtrl.text.trim()});
      _showSnack(res.data['message'] ?? 'Copy marked as lost');
      setState(() { _lostModal = null; _lostNotesCtrl.clear(); });
      await _fetchAll();
    } catch (_) {
      _showSnack('Failed to mark copy as lost');
    } finally {
      if (mounted) setState(() => _markingLost = false);
    }
  }

  Future<void> _restoreCopy(dynamic copyId) async {
    final ok = await _confirm(
      title: 'Restore this copy?',
      desc: 'Copy will be set back to Available.',
      confirmLabel: 'Restore',
      confirmColor: const Color(0xFF10B981),
    );
    if (!ok) return;
    try {
      await ApiService.post('/copies/$copyId/restore');
      _showSnack('Copy restored');
      await _fetchAll();
    } catch (_) { _showSnack('Failed to restore copy'); }
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  Future<bool> _confirm({required String title, required String desc,
      required String confirmLabel, required Color confirmColor}) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        content: Text(desc, style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: confirmColor, foregroundColor: Colors.white, elevation: 0),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
    return result == true;
  }

  void _showSnack(String msg) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));

  String _fmt(dynamic d) {
    final dt = DateTime.tryParse(d?.toString() ?? '');
    if (dt == null) return '—';
    return '${dt.month}/${dt.day}/${dt.year}';
  }

  // ─────────────────────────────────────────────────────────────────────
  // BUILD
  // ─────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Color(0xFFF9FAFB),
        body: Center(child: CircularProgressIndicator(color: Color(0xFF2563EB))),
      );
    }

    if (_book == null) {
      return Scaffold(
        backgroundColor: const Color(0xFFF9FAFB),
        body: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(_error.isNotEmpty ? _error : 'Book not found',
              style: const TextStyle(color: Color(0xFF9CA3AF))),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => context.go('/books'),
            style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white),
            child: const Text('← Back to Books'),
          ),
        ])),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: Stack(children: [
        _buildBody(),
        if (_showAddCopyModal) _buildAddCopyModal(),
        if (_lostModal != null) _buildMarkLostModal(),
      ]),
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // MAIN BODY
  // ─────────────────────────────────────────────────────────────────────

  Widget _buildBody() {
    final book = _book!;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 860),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // ── Header ──
            Row(children: [
              GestureDetector(
                onTap: () => context.go('/books'),
                child: const Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.arrow_back, size: 18, color: Color(0xFF6B7280)),
                  SizedBox(width: 4),
                  Text('Back', style: TextStyle(fontSize: 14, color: Color(0xFF6B7280))),
                ]),
              ),
              const SizedBox(width: 16),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Edit Book',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
                Text(book['title'] ?? '',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
              ]),
            ]),
            const SizedBox(height: 20),

            // ── Current info banner ──
            _InfoBanner(book: book, imageB64: _imageB64),
            const SizedBox(height: 20),

            // ── Error ──
            if (_error.isNotEmpty) ...[
              ErrorBanner(messages: [_error]),
              const SizedBox(height: 16),
            ],

            // ── Edit form ──
            FormCard(title: 'Edit Book Details', children: [
              // Cover
              const FieldLabel(label: 'Book Cover'),
              const SizedBox(height: 8),
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                  width: 90, height: 135,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    color: const Color(0xFFF1F5F9),
                    border: Border.all(color: const Color(0xFFE2E8F0), width: 2),
                  ),
                  clipBehavior: Clip.hardEdge,
                  child: _imageB64 != null && _imageB64!.isNotEmpty
                      ? Image.memory(
                          base64Decode(_imageB64!.contains(',')
                              ? _imageB64!.split(',').last : _imageB64!),
                          fit: BoxFit.cover)
                      : const Icon(Icons.menu_book_outlined, size: 32, color: Color(0xFFCBD5E1)),
                ),
                const SizedBox(width: 16),
                Expanded(child: ImagePickerWidget(
                  value: _imageB64,
                  hidePreview: true,
                  onChange: (b64) => setState(() => _imageB64 = b64),
                )),
              ]),
              const SizedBox(height: 20),

              // Title
              const FieldLabel(label: 'Title', required: true),
              const SizedBox(height: 6),
              ValidatedField(controller: _titleCtrl, placeholder: 'Book title'),
              const SizedBox(height: 16),

              // ISBN + Year
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const FieldLabel(label: 'ISBN'),
                  const SizedBox(height: 6),
                  ValidatedField(controller: _isbnCtrl, placeholder: '978-…'),
                ])),
                const SizedBox(width: 16),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const FieldLabel(label: 'Publication Year'),
                  const SizedBox(height: 6),
                  ValidatedField(
                    controller: _yearCtrl,
                    placeholder: '2024',
                    keyboardType: TextInputType.number,
                  ),
                ])),
              ]),
              const SizedBox(height: 16),

              // Category
              SearchDropdown(
                label: 'Category',
                placeholder: 'Search category...',
                items: _categories,
                idField: 'category_id',
                nameField: 'category_name',
                selectedId: _selectedCategoryId,
                accentColor: const Color(0xFF2563EB),
                onSelect: (id) => setState(() => _selectedCategoryId = id),
                onClear: () => setState(() => _selectedCategoryId = null),
              ),
              const SizedBox(height: 16),

              // Publisher
              SearchDropdown(
                label: 'Publisher',
                placeholder: 'Search publisher...',
                items: _publications,
                idField: 'publication_id',
                nameField: 'publication_name',
                selectedId: _selectedPublicationId,
                accentColor: const Color(0xFFEA580C),
                onSelect: (id) => setState(() => _selectedPublicationId = id),
                onClear: () => setState(() => _selectedPublicationId = null),
              ),
              const SizedBox(height: 16),

              // Authors
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
              ),
              const SizedBox(height: 16),

              // Genres
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
              ),
              const SizedBox(height: 24),

              // Save / Cancel
              Row(children: [
                Expanded(child: ElevatedButton(
                  onPressed: _saving ? null : _save,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    disabledBackgroundColor: const Color(0xFF9CA3AF),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    elevation: 0,
                  ),
                  child: _saving
                      ? const SizedBox(width: 18, height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Save Changes',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                )),
                const SizedBox(width: 12),
                OutlinedButton(
                  onPressed: () => context.go('/books'),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFFD1D5DB), width: 2),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
                  ),
                  child: const Text('Cancel',
                      style: TextStyle(color: Color(0xFF374151), fontWeight: FontWeight.w600)),
                ),
              ]),
            ]),
            const SizedBox(height: 20),

            // ── Copies section ──
            _buildCopiesSection(),
            const SizedBox(height: 32),
          ]),
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // COPIES SECTION
  // ─────────────────────────────────────────────────────────────────────

  Widget _buildCopiesSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Header row
        Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Book Copies',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
            Text('${_copies.length} total',
                style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
          ])),
          GestureDetector(
            onTap: () => setState(() { _showAddCopyModal = true; _barcodeCtrl.clear(); }),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.add, size: 15, color: Colors.white),
                SizedBox(width: 6),
                Text('Add Copy',
                    style: TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w600)),
              ]),
            ),
          ),
        ]),
        const SizedBox(height: 16),

        if (_copies.isEmpty)
          const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text('No copies yet', style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
            ),
          )
        else
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              headingRowHeight: 38,
              dataRowMinHeight: 50,
              dataRowMaxHeight: 60,
              headingRowColor: WidgetStateProperty.all(const Color(0xFFF9FAFB)),
              columnSpacing: 14,
              horizontalMargin: 0,
              columns: const [
                DataColumn(label: _ColHead('ID')),
                DataColumn(label: _ColHead('Barcode')),
                DataColumn(label: _ColHead('Status')),
                DataColumn(label: _ColHead('Borrower')),
                DataColumn(label: _ColHead('Due Date')),
                DataColumn(label: _ColHead('Actions')),
              ],
              rows: _copies.map((c) {
                final status   = (c['status'] as String? ?? '').toLowerCase();
                final isAvail  = status == 'available';
                final isIssued = status == 'issued';
                final isLost   = status == 'lost';
                final borrower = c['borrower'] as Map<String, dynamic>?;

                return DataRow(cells: [
                  DataCell(Text('#${c['copy_id']}',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)))),
                  DataCell(Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                        color: const Color(0xFFF3F4F6),
                        borderRadius: BorderRadius.circular(5)),
                    child: Text(c['copy_code'] ?? '—',
                        style: const TextStyle(fontSize: 11, fontFamily: 'monospace',
                            color: Color(0xFF374151))),
                  )),
                  DataCell(_StatusBadge(status: c['status'] ?? '')),
                  DataCell(Text(borrower?['borrower_name'] ?? '—',
                      style: TextStyle(fontSize: 12,
                          color: borrower != null
                              ? const Color(0xFF374151) : const Color(0xFFD1D5DB)))),
                  DataCell(Text(
                    borrower?['due_date'] != null ? _fmt(borrower!['due_date']) : '—',
                    style: TextStyle(fontSize: 12,
                        color: borrower?['due_date'] != null
                            ? const Color(0xFF6B7280) : const Color(0xFFD1D5DB)),
                  )),
                  DataCell(Row(mainAxisSize: MainAxisSize.min, children: [
                    if (isAvail || isIssued) ...[
                      _TextBtn(
                        label: 'Mark Lost',
                        color: const Color(0xFFF97316),
                        onTap: () => setState(() {
                          _lostModal = c as Map<String, dynamic>;
                          _lostNotesCtrl.clear();
                        }),
                      ),
                    ],
                    if (isAvail) ...[
                      const SizedBox(width: 4),
                      const Text('|', style: TextStyle(color: Color(0xFFE5E7EB))),
                      const SizedBox(width: 4),
                      _TextBtn(
                        label: 'Delete',
                        color: const Color(0xFFEF4444),
                        onTap: () => _deleteCopy(c['copy_id']),
                      ),
                    ],
                    if (isLost)
                      _TextBtn(
                        label: 'Restore',
                        color: const Color(0xFF10B981),
                        onTap: () => _restoreCopy(c['copy_id']),
                      ),
                  ])),
                ]);
              }).toList(),
            ),
          ),
      ]),
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // ADD COPY MODAL
  // ─────────────────────────────────────────────────────────────────────

  Widget _buildAddCopyModal() {
    return GestureDetector(
      onTap: () => setState(() => _showAddCopyModal = false),
      child: Container(
        color: const Color(0x80000000),
        child: Center(
          child: GestureDetector(
            onTap: () {},
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 24),
              constraints: const BoxConstraints(maxWidth: 380),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: const [BoxShadow(color: Color(0x30000000), blurRadius: 24)],
              ),
              child: Column(mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Add New Copy',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 16),
                TextField(
                  controller: _barcodeCtrl,
                  autofocus: true,
                  onSubmitted: (_) => _addCopy(),
                  style: const TextStyle(fontSize: 14, fontFamily: 'monospace'),
                  decoration: InputDecoration(
                    hintText: 'Scan or enter barcode',
                    hintStyle: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                    contentPadding: const EdgeInsets.all(14),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: Color(0xFFD1D5DB), width: 2)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: Color(0xFFD1D5DB), width: 2)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2)),
                    filled: true, fillColor: Colors.white,
                    prefixIcon: const Icon(Icons.qr_code, color: Color(0xFF9CA3AF)),
                  ),
                ),
                const SizedBox(height: 16),
                Row(children: [
                  Expanded(child: ElevatedButton(
                    onPressed: _addingCopy ? null : _addCopy,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 12), elevation: 0,
                    ),
                    child: _addingCopy
                        ? const SizedBox(width: 16, height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Add Copy', style: TextStyle(fontWeight: FontWeight.w600)),
                  )),
                  const SizedBox(width: 10),
                  Expanded(child: OutlinedButton(
                    onPressed: () => setState(() { _showAddCopyModal = false; _barcodeCtrl.clear(); }),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFE5E7EB)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text('Cancel', style: TextStyle(color: Color(0xFF6B7280))),
                  )),
                ]),
              ]),
            ),
          ),
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // MARK AS LOST MODAL
  // ─────────────────────────────────────────────────────────────────────

  Widget _buildMarkLostModal() {
    final copy     = _lostModal!;
    final isIssued = (copy['status'] as String? ?? '').toLowerCase() == 'issued';
    final borrower = copy['borrower'] as Map<String, dynamic>?;

    return GestureDetector(
      onTap: () => setState(() { _lostModal = null; _lostNotesCtrl.clear(); }),
      child: Container(
        color: const Color(0x80000000),
        child: Center(
          child: GestureDetector(
            onTap: () {},
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              constraints: const BoxConstraints(maxWidth: 440),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: const [BoxShadow(color: Color(0x30000000), blurRadius: 24)],
              ),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                // Red header
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: const BoxDecoration(
                    color: Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                    border: Border(bottom: BorderSide(color: Color(0xFFFECACA))),
                  ),
                  child: Row(children: [
                    Container(
                      width: 36, height: 36,
                      decoration: const BoxDecoration(
                          color: Color(0xFFFECACA), shape: BoxShape.circle),
                      child: const Icon(Icons.warning_amber_rounded,
                          size: 18, color: Color(0xFFDC2626)),
                    ),
                    const SizedBox(width: 14),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Mark Copy as Lost',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700,
                              color: Color(0xFF1F2937))),
                      const SizedBox(height: 2),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Text(copy['copy_code'] ?? '—',
                            style: const TextStyle(fontSize: 11, fontFamily: 'monospace',
                                color: Color(0xFF374151))),
                      ),
                    ])),
                  ]),
                ),

                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    // Issued warning
                    if (isIssued) ...[
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(children: [
                            const Icon(Icons.info_outline, size: 15, color: Color(0xFFB45309)),
                            const SizedBox(width: 6),
                            Expanded(child: Text(
                              'Currently issued to ${borrower?['borrower_name'] ?? 'a borrower'}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                                  color: Color(0xFF92400E)),
                            )),
                          ]),
                          const SizedBox(height: 4),
                          const Text(
                            'The issue will be closed and a replacement fine will be automatically generated for this borrower.',
                            style: TextStyle(fontSize: 11, color: Color(0xFFB45309)),
                          ),
                        ]),
                      ),
                      const SizedBox(height: 14),
                    ],

                    // Notes
                    const Text('Notes',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
                            color: Color(0xFF374151))),
                    const Text('optional',
                        style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _lostNotesCtrl,
                      autofocus: true,
                      maxLines: 2,
                      style: const TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'e.g. Reported lost by borrower on return',
                        hintStyle: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
                        contentPadding: const EdgeInsets.all(12),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFFEF4444), width: 2)),
                        filled: true, fillColor: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Copy status will be set to lost and will not be available for issue until restored.',
                      style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                    ),
                    const SizedBox(height: 16),

                    Row(children: [
                      Expanded(child: ElevatedButton(
                        onPressed: _markingLost ? null : _markLost,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFDC2626),
                          disabledBackgroundColor: const Color(0xFF9CA3AF),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(vertical: 13), elevation: 0,
                        ),
                        child: _markingLost
                            ? const SizedBox(width: 16, height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Mark as Lost',
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                      )),
                      const SizedBox(width: 10),
                      Expanded(child: OutlinedButton(
                        onPressed: () => setState(() { _lostModal = null; _lostNotesCtrl.clear(); }),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFFE5E7EB)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(vertical: 13),
                        ),
                        child: const Text('Cancel',
                            style: TextStyle(color: Color(0xFF6B7280), fontWeight: FontWeight.w600)),
                      )),
                    ]),
                  ]),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Small widgets ──────────────────────────────────────────────────────────

class _InfoBanner extends StatelessWidget {
  final Map<String, dynamic> book;
  final String? imageB64;
  const _InfoBanner({required this.book, this.imageB64});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFBFDBFE)),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Thumbnail
        if (imageB64 != null && imageB64!.isNotEmpty)
          Container(
            width: 56, height: 80,
            margin: const EdgeInsets.only(right: 16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: const Color(0xFFBFDBFE)),
            ),
            clipBehavior: Clip.hardEdge,
            child: Image.memory(
              base64Decode(imageB64!.contains(',') ? imageB64!.split(',').last : imageB64!),
              fit: BoxFit.cover,
            ),
          ),
        Expanded(child: Wrap(
          spacing: 24, runSpacing: 8,
          children: [
            _BannerField(label: 'ISBN',      value: book['isbn']?.toString() ?? '—'),
            _BannerField(label: 'Year',      value: book['publication_year']?.toString() ?? '—'),
            _BannerField(label: 'Category',  value: book['Category']?['category_name'] ?? '—'),
            _BannerField(label: 'Publisher', value: book['Publication']?['publication_name'] ?? '—'),
            _BannerField(
              label: 'Authors',
              value: (book['Authors'] as List?)?.map((a) => a['author_name']).join(', ') ?? '—',
            ),
          ],
        )),
      ]),
    );
  }
}

class _BannerField extends StatelessWidget {
  final String label, value;
  const _BannerField({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF60A5FA))),
      Text(value, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
          color: Color(0xFF1E3A8A))),
    ]);
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final s = status.toLowerCase();
    final (Color color, Color bg, Color border) = s == 'available'
        ? (const Color(0xFF065F46), const Color(0xFFECFDF5), const Color(0xFFA7F3D0))
        : s == 'issued'
            ? (const Color(0xFF9A3412), const Color(0xFFFFF7ED), const Color(0xFFFED7AA))
            : s == 'lost'
                ? (const Color(0xFFDC2626), const Color(0xFFFEF2F2), const Color(0xFFFECACA))
                : (const Color(0xFF6B7280), const Color(0xFFF3F4F6), const Color(0xFFE5E7EB));

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20),
          border: Border.all(color: border)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (s == 'lost') ...[
          Icon(Icons.warning_amber_rounded, size: 10, color: color),
          const SizedBox(width: 3),
        ],
        Text(status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color)),
      ]),
    );
  }
}

class _TextBtn extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _TextBtn({required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Text(label,
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
    );
  }
}

class _ColHead extends StatelessWidget {
  final String label;
  const _ColHead(this.label);

  @override
  Widget build(BuildContext context) {
    return Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700,
        color: Color(0xFF9CA3AF), letterSpacing: 0.4));
  }
}