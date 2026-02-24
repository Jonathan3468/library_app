// lib/widgets/book_import_modal.dart
//
// CSV import modal for books.
//
// Expected CSV format (first row = header, ignored):
//   title,isbn,publication_year,author_names,genre_names,category_name,publication_name
//
// - author_names  : pipe-separated  e.g.  "J.K. Rowling|Mary GrandPré"
// - genre_names   : pipe-separated  e.g.  "Fantasy|Adventure"
// - category_name : single value
// - publication_name : single value
// - publication_year : 4-digit number (optional)
// - category_name, publication_name, author_names, genre_names : all optional
//
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../services/api.dart';

class BookImportModal extends StatefulWidget {
  final VoidCallback onDone;
  final VoidCallback onClose;

  const BookImportModal({super.key, required this.onDone, required this.onClose});

  @override
  State<BookImportModal> createState() => _BookImportModalState();
}

class _BookImportModalState extends State<BookImportModal> {
  // ── State ──
  List<_CsvRow> _rows       = [];
  bool   _importing         = false;
  int    _processed         = 0;
  int    _succeeded         = 0;
  int    _failed            = 0;
  bool   _done              = false;
  String _currentAction     = '';
  final List<String> _log   = [];

  // ── Pick & parse ──────────────────────────────────────────────────────

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['csv'],
      withData: true,
    );
    if (result == null || result.files.isEmpty) return;

    final bytes = result.files.first.bytes;
    if (bytes == null) return;

    final content = utf8.decode(bytes);
    final parsed  = _parseCsv(content);

    setState(() {
      _rows      = parsed;
      _processed = 0;
      _succeeded = 0;
      _failed    = 0;
      _done      = false;
      _log.clear();
    });
  }

  List<_CsvRow> _parseCsv(String content) {
    final lines = content
        .split('\n')
        .map((l) => l.trim())
        .where((l) => l.isNotEmpty)
        .toList();

    if (lines.length < 2) return [];

    // Skip header row
    final rows = <_CsvRow>[];
    for (int i = 1; i < lines.length; i++) {
      final cols = _splitCsvLine(lines[i]);
      if (cols.length < 2) continue; // need at least title + isbn
      rows.add(_CsvRow(
        title:           _col(cols, 0),
        isbn:            _col(cols, 1),
        publicationYear: _col(cols, 2),
        authorNames:     _col(cols, 3),
        genreNames:      _col(cols, 4),
        categoryName:    _col(cols, 5),
        publicationName: _col(cols, 6),
        lineNumber: i + 1,
      ));
    }
    return rows;
  }

  // Handles quoted fields with commas inside
  List<String> _splitCsvLine(String line) {
    final result = <String>[];
    final buffer = StringBuffer();
    bool inQuotes = false;

    for (int i = 0; i < line.length; i++) {
      final c = line[i];
      if (c == '"') {
        inQuotes = !inQuotes;
      } else if (c == ',' && !inQuotes) {
        result.add(buffer.toString().trim());
        buffer.clear();
      } else {
        buffer.write(c);
      }
    }
    result.add(buffer.toString().trim());
    return result;
  }

  String _col(List<String> cols, int i) =>
      i < cols.length ? cols[i].trim() : '';

  // ── Import ────────────────────────────────────────────────────────────

  Future<void> _startImport() async {
    if (_rows.isEmpty) return;
    setState(() {
      _importing = true;
      _processed = 0;
      _succeeded = 0;
      _failed    = 0;
      _done      = false;
      _log.clear();
    });

    for (final row in _rows) {
      if (!mounted) break;

      setState(() => _currentAction = 'Processing "${row.title}" (row ${row.lineNumber})…');

      try {
        // ── Resolve authors ──
        final authorIds = <dynamic>[];
        if (row.authorNames.isNotEmpty) {
          for (final name in row.authorNames.split('|').map((s) => s.trim()).where((s) => s.isNotEmpty)) {
            final id = await _resolveAuthor(name);
            if (!authorIds.contains(id)) authorIds.add(id);
          }
        }

        if (authorIds.isEmpty) {
          _addLog('Row ${row.lineNumber}: SKIP — no valid author names', error: true);
          setState(() { _processed++; _failed++; });
          continue;
        }

        // ── Resolve genres ──
        final genreIds = <dynamic>[];
        if (row.genreNames.isNotEmpty) {
          for (final name in row.genreNames.split('|').map((s) => s.trim()).where((s) => s.isNotEmpty)) {
            final id = await _resolveGenre(name);
            if (!genreIds.contains(id)) genreIds.add(id);
          }
        }

        // ── Resolve category ──
        dynamic categoryId;
        if (row.categoryName.isNotEmpty) {
          categoryId = await _resolveCategory(row.categoryName);
        }

        // ── Resolve publication ──
        dynamic publicationId;
        if (row.publicationName.isNotEmpty) {
          publicationId = await _resolvePublication(row.publicationName);
        }

        // ── Create book ──
        final payload = <String, dynamic>{
          'title':     row.title,
          'isbn':      row.isbn,
          'authorIds': authorIds,
          'genreIds':  genreIds,
        };
        if (row.publicationYear.isNotEmpty) {
          final y = int.tryParse(row.publicationYear);
          if (y != null) payload['publication_year'] = y;
        }
        if (categoryId != null)   payload['category_id']    = categoryId;
        if (publicationId != null) payload['publication_id'] = publicationId;

        await ApiService.post('/books', data: payload);
        _addLog('Row ${row.lineNumber}: ✓ "${row.title}"');
        setState(() { _processed++; _succeeded++; });

      } catch (e) {
        final msg = _extractError(e);
        _addLog('Row ${row.lineNumber}: FAILED "${row.title}" — ${msg.isNotEmpty ? msg : e.toString()}', error: true);
        setState(() { _processed++; _failed++; });
      }
    }

    setState(() { _importing = false; _done = true; _currentAction = ''; });
    if (_succeeded > 0) widget.onDone();
  }

  // ── Resolvers ─────────────────────────────────────────────────────────

  Future<dynamic> _resolveAuthor(String name) async {
    try {
      final res = await ApiService.get('/authors');
      final list = res.data is List ? res.data : res.data['authors'] ?? [];
      final existing = (list as List).firstWhere(
        (a) => (a['author_name'] as String? ?? '').toLowerCase() == name.toLowerCase(),
        orElse: () => null,
      );
      if (existing != null) return existing['author_id'];
    } catch (_) {}
    final res = await ApiService.post('/authors', data: {'author_name': name});
    return res.data['author']?['author_id'] ?? res.data['author_id'];
  }

  Future<dynamic> _resolveGenre(String name) async {
    try {
      final res = await ApiService.get('/genres');
      final list = res.data is List ? res.data : res.data['genres'] ?? [];
      final existing = (list as List).firstWhere(
        (g) => (g['genre_name'] as String? ?? '').toLowerCase() == name.toLowerCase(),
        orElse: () => null,
      );
      if (existing != null) return existing['genre_id'];
    } catch (_) {}
    final res = await ApiService.post('/genres', data: {'name': name});
    final item = res.data['genre'] ?? res.data;
    return item['genre_id'] ?? item['id'];
  }

  Future<dynamic> _resolveCategory(String name) async {
    try {
      final res = await ApiService.get('/categories');
      final list = res.data is List ? res.data : res.data['categories'] ?? [];
      final existing = (list as List).firstWhere(
        (c) => ((c['category_name'] ?? c['name'] ?? '') as String).toLowerCase() == name.toLowerCase(),
        orElse: () => null,
      );
      if (existing != null) return existing['category_id'] ?? existing['id'];
    } catch (_) {}
    final res = await ApiService.post('/categories', data: {'name': name});
    final item = res.data['category'] ?? res.data;
    return item['category_id'] ?? item['id'];
  }

  Future<dynamic> _resolvePublication(String name) async {
    try {
      final res = await ApiService.get('/publications');
      final list = res.data is List ? res.data : res.data['publications'] ?? [];
      final existing = (list as List).firstWhere(
        (p) => (p['publication_name'] as String? ?? '').toLowerCase() == name.toLowerCase(),
        orElse: () => null,
      );
      if (existing != null) return existing['publication_id'];
    } catch (_) {}
    final res = await ApiService.post('/publications', data: {'publication_name': name});
    final item = res.data['publication'] ?? res.data;
    return item['publication_id'];
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  void _addLog(String msg, {bool error = false}) {
    setState(() => _log.add(error ? '❌ $msg' : '✅ $msg'));
  }

  String _extractError(dynamic e) {
    try { return e.response?.data?['message'] ?? e.response?.data?['error'] ?? ''; }
    catch (_) { return ''; }
  }

  // ── Build ─────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _importing ? null : widget.onClose,
      child: Container(
        color: const Color(0x80000000),
        child: Center(
          child: GestureDetector(
            onTap: () {},
            child: Container(
              margin: const EdgeInsets.all(20),
              constraints: const BoxConstraints(maxWidth: 560, maxHeight: 680),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: const [BoxShadow(color: Color(0x30000000), blurRadius: 30, offset: Offset(0, 10))],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildHeader(),
                  Flexible(child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      _buildFormatHint(),
                      const SizedBox(height: 20),
                      _buildFileSection(),
                      if (_rows.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        _buildPreview(),
                      ],
                      if (_log.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        _buildLog(),
                      ],
                      if (_done) ...[
                        const SizedBox(height: 16),
                        _buildSummary(),
                      ],
                    ]),
                  )),
                  _buildFooter(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 20, 16, 16),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFF3F4F6))),
      ),
      child: Row(children: [
        const Icon(Icons.upload_file_outlined, size: 22, color: Color(0xFF2563EB)),
        const SizedBox(width: 10),
        const Expanded(child: Text('Import Books from CSV',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)))),
        if (!_importing)
          GestureDetector(
            onTap: widget.onClose,
            child: const Icon(Icons.close, size: 20, color: Color(0xFF9CA3AF)),
          ),
      ]),
    );
  }

  Widget _buildFormatHint() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFBFDBFE)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [
          Icon(Icons.info_outline, size: 14, color: Color(0xFF2563EB)),
          SizedBox(width: 6),
          Text('Expected CSV format', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF1D4ED8))),
        ]),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(6)),
          child: const Text(
            'title,isbn,publication_year,author_names,genre_names,category_name,publication_name\n'
            'Harry Potter,9780439708180,1997,J.K. Rowling,Fantasy|Adventure,Novel,Bloomsbury',
            style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontFamily: 'monospace', height: 1.5),
          ),
        ),
        const SizedBox(height: 6),
        const Text('• Multiple authors/genres: separate with  |', style: TextStyle(fontSize: 11, color: Color(0xFF3B82F6))),
        const Text('• Authors are required; all other fields are optional', style: TextStyle(fontSize: 11, color: Color(0xFF3B82F6))),
        const Text('• New authors, genres, categories & publishers are created automatically', style: TextStyle(fontSize: 11, color: Color(0xFF3B82F6))),
      ]),
    );
  }

  Widget _buildFileSection() {
    return GestureDetector(
      onTap: _importing ? null : _pickFile,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 24),
        decoration: BoxDecoration(
          color: _rows.isEmpty ? const Color(0xFFF9FAFB) : const Color(0xFFEFF6FF),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: _rows.isEmpty ? const Color(0xFFE5E7EB) : const Color(0xFF93C5FD),
            width: 2,
          ),
        ),
        child: Column(children: [
          Icon(
            _rows.isEmpty ? Icons.cloud_upload_outlined : Icons.check_circle_outline,
            size: 32,
            color: _rows.isEmpty ? const Color(0xFF9CA3AF) : const Color(0xFF2563EB),
          ),
          const SizedBox(height: 8),
          Text(
            _rows.isEmpty ? 'Tap to select CSV file' : '${_rows.length} rows loaded — tap to change',
            style: TextStyle(
              fontSize: 13, fontWeight: FontWeight.w600,
              color: _rows.isEmpty ? const Color(0xFF6B7280) : const Color(0xFF2563EB),
            ),
          ),
          if (_rows.isEmpty)
            const Text('.csv files only', style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
        ]),
      ),
    );
  }

  Widget _buildPreview() {
    final preview = _rows.take(3).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Preview (${_rows.length} rows)', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF374151))),
      const SizedBox(height: 8),
      ...preview.map((r) => Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Row(children: [
          const Icon(Icons.menu_book_outlined, size: 14, color: Color(0xFF9CA3AF)),
          const SizedBox(width: 8),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(r.title.isEmpty ? '(no title)' : r.title,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
            Text('ISBN: ${r.isbn} · Authors: ${r.authorNames.isEmpty ? "—" : r.authorNames}',
                style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
          ])),
        ]),
      )),
      if (_rows.length > 3)
        Text('… and ${_rows.length - 3} more rows', style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
    ]);
  }

  Widget _buildLog() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const Text('Import Log', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF374151))),
        if (_importing) ...[
          const SizedBox(width: 8),
          const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2563EB))),
          const SizedBox(width: 6),
          Expanded(child: Text(_currentAction, style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)), overflow: TextOverflow.ellipsis)),
        ],
      ]),
      const SizedBox(height: 8),
      Container(
        height: 160,
        width: double.infinity,
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(8),
        ),
        child: ListView.builder(
          reverse: true,
          itemCount: _log.length,
          itemBuilder: (_, i) => Text(
            _log[_log.length - 1 - i],
            style: TextStyle(
              fontSize: 11,
              fontFamily: 'monospace',
              color: _log[_log.length - 1 - i].startsWith('❌')
                  ? const Color(0xFFF87171)
                  : const Color(0xFF86EFAC),
              height: 1.6,
            ),
          ),
        ),
      ),
    ]);
  }

  Widget _buildSummary() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _failed == 0 ? const Color(0xFFECFDF5) : const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _failed == 0 ? const Color(0xFFA7F3D0) : const Color(0xFFFDE68A)),
      ),
      child: Row(children: [
        Icon(_failed == 0 ? Icons.check_circle : Icons.warning_amber_rounded,
            color: _failed == 0 ? const Color(0xFF10B981) : const Color(0xFFF59E0B), size: 20),
        const SizedBox(width: 10),
        Expanded(child: Text(
          'Import complete — $_succeeded succeeded, $_failed failed out of ${_rows.length} rows',
          style: TextStyle(
            fontSize: 13, fontWeight: FontWeight.w600,
            color: _failed == 0 ? const Color(0xFF065F46) : const Color(0xFF92400E),
          ),
        )),
      ]),
    );
  }

  Widget _buildFooter() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 20),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Color(0xFFF3F4F6))),
      ),
      child: Row(children: [
        if (_rows.isNotEmpty && !_importing && !_done) ...[
          Expanded(child: ElevatedButton.icon(
            onPressed: _startImport,
            icon: const Icon(Icons.play_arrow, size: 16, color: Colors.white),
            label: Text('Import ${_rows.length} Books', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              padding: const EdgeInsets.symmetric(vertical: 13),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              elevation: 0,
            ),
          )),
          const SizedBox(width: 10),
        ],
        if (_done) ...[
          Expanded(child: ElevatedButton(
            onPressed: widget.onClose,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              padding: const EdgeInsets.symmetric(vertical: 13),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              elevation: 0,
            ),
            child: const Text('Done', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          )),
          const SizedBox(width: 10),
        ],
        if (!_importing)
          OutlinedButton(
            onPressed: widget.onClose,
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0xFFD1D5DB), width: 2),
              padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 20),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF374151), fontWeight: FontWeight.w600)),
          ),
      ]),
    );
  }
}

// ── Data model ────────────────────────────────────────────────────────────

class _CsvRow {
  final String title, isbn, publicationYear, authorNames, genreNames, categoryName, publicationName;
  final int lineNumber;

  const _CsvRow({
    required this.title,
    required this.isbn,
    required this.publicationYear,
    required this.authorNames,
    required this.genreNames,
    required this.categoryName,
    required this.publicationName,
    required this.lineNumber,
  });
}