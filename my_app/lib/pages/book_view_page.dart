// lib/pages/book_view_page.dart
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';
import '../utils/auth.dart';
import '../utils/image_storage.dart';

class BookViewPage extends StatefulWidget {
  final String bookId;
  const BookViewPage({super.key, required this.bookId});

  @override
  State<BookViewPage> createState() => _BookViewPageState();
}

class _BookViewPageState extends State<BookViewPage> {
  Map<String, dynamic>? _book;
  List<dynamic> _copies = [];
  bool _loading = true;
  String? _error;
  Uint8List? _coverBytes;
  bool _imageError = false;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() { _loading = true; _error = null; });
    try {
      final results = await Future.wait([
        ApiService.get('/books/${widget.bookId}'),
        ApiService.get('/books/${widget.bookId}/copies'),
      ]);
      setState(() {
        _book   = results[0].data['book'] ?? results[0].data;
        _copies = results[1].data['copies'] ?? results[1].data ?? [];
      });
      await _loadCover();
    } catch (_) {
      setState(() => _error = 'Failed to load book details');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadCover() async {
    try {
      final stored = await ImageStorage.load('book', widget.bookId);
      if (stored == null || !mounted) return;
      final clean = stored.contains(',') ? stored.split(',').last : stored;
      final bytes = base64Decode(clean);
      if (mounted) setState(() => _coverBytes = bytes);
    } catch (_) {
      // silently fall through to placeholder
    }
  }

  Widget _coverPlaceholder() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFFF1F5F9), Color(0xFFE2E8F0)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.menu_book_outlined, size: 32, color: Color(0xFFCBD5E1)),
          SizedBox(height: 6),
          Text('No Cover', style: TextStyle(fontSize: 10, color: Color(0xFFCBD5E1))),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Color(0xFFF9FAFB),
        body: Center(child: CircularProgressIndicator(color: Color(0xFF2563EB))),
      );
    }

    if (_error != null) {
      return Scaffold(
        backgroundColor: const Color(0xFFF9FAFB),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Column(children: [
                  const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 32),
                  const SizedBox(height: 10),
                  Text(_error!, style: const TextStyle(color: Color(0xFFDC2626))),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context.go('/books'),
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626), foregroundColor: Colors.white),
                    child: const Text('← Back to Books'),
                  ),
                ]),
              ),
            ]),
          ),
        ),
      );
    }

    if (_book == null) {
      return Scaffold(
        body: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('Book not found'),
          const SizedBox(height: 12),
          ElevatedButton(onPressed: () => context.go('/books'), child: const Text('← Back')),
        ])),
      );
    }

    final isMemberRole = !AuthService.isLibrarian();
    final book = _book!;
    final authors = (book['Authors'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final genres  = (book['Genres']  as List?)?.cast<Map<String, dynamic>>() ?? [];

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 900),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header ──
              Row(
                children: [
                  GestureDetector(
                    onTap: () => context.go('/books'),
                    child: const Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.arrow_back, size: 18, color: Color(0xFF6B7280)),
                      SizedBox(width: 4),
                      Text('Back', style: TextStyle(fontSize: 14, color: Color(0xFF6B7280))),
                    ]),
                  ),
                  const SizedBox(width: 16),
                  const Text('/', style: TextStyle(color: Color(0xFFD1D5DB))),
                  const SizedBox(width: 16),
                  const Text('Book Details',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
                  const Spacer(),
                  if (AuthService.isLibrarian())
                    GestureDetector(
                      onTap: () => context.go('/books/${widget.bookId}/edit'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2563EB),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(Icons.edit_outlined, size: 15, color: Colors.white),
                          SizedBox(width: 6),
                          Text('Edit Book', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                        ]),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 20),

              // ── Book info card ──
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                  boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 12, offset: Offset(0, 4))],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Book cover
                        Container(
                          width: 110, height: 165,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFE2E8F0), width: 2),
                            boxShadow: const [BoxShadow(color: Color(0x18000000), blurRadius: 8, offset: Offset(2, 4))],
                          ),
                          clipBehavior: Clip.hardEdge,
                          child: _coverBytes != null && !_imageError
                              ? Image.memory(
                                  _coverBytes!,
                                  fit: BoxFit.cover,
                                  width: 110,
                                  height: 165,
                                  errorBuilder: (_, __, ___) {
                                    // Schedule state update after build
                                    WidgetsBinding.instance.addPostFrameCallback((_) {
                                      if (mounted) setState(() => _imageError = true);
                                    });
                                    return _coverPlaceholder();
                                  },
                                )
                              : _coverPlaceholder(),
                        ),
                        const SizedBox(width: 24),

                        // Title + metadata
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                book['title'] ?? 'Untitled',
                                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF1F2937), height: 1.2),
                              ),
                              const SizedBox(height: 16),
                              Wrap(
                                spacing: 24, runSpacing: 12,
                                children: [
                                  _InfoField(label: 'ISBN',             value: book['isbn'] ?? 'N/A'),
                                  _InfoField(label: 'Publication Year', value: book['publication_year']?.toString() ?? 'N/A'),
                                  _InfoField(
                                    label: 'Category',
                                    value: book['Category']?['category_name'] ?? book['category_name'] ?? 'N/A',
                                  ),
                                  _InfoField(
                                    label: 'Publisher',
                                    value: book['Publication']?['publication_name'] ?? book['publication_name'] ?? 'N/A',
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    const Divider(color: Color(0xFFF3F4F6)),
                    const SizedBox(height: 16),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Authors',
                                style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w600, letterSpacing: 0.4)),
                            const SizedBox(height: 8),
                            if (authors.isEmpty)
                              const Text('No authors listed', style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)))
                            else
                              Wrap(spacing: 6, runSpacing: 6, children: authors.map((a) => _Tag(
                                label: a['author_name'] ?? '',
                                bg: const Color(0xFFF5F3FF),
                                color: const Color(0xFF7C3AED),
                                border: const Color(0xFFDDD6FE),
                              )).toList()),
                          ],
                        )),
                        const SizedBox(width: 24),
                        Expanded(child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Genres',
                                style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w600, letterSpacing: 0.4)),
                            const SizedBox(height: 8),
                            if (genres.isEmpty)
                              const Text('No genres listed', style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)))
                            else
                              Wrap(spacing: 6, runSpacing: 6, children: genres.map((g) => _Tag(
                                label: g['genre_name'] ?? '',
                                bg: const Color(0xFFEFF6FF),
                                color: const Color(0xFF2563EB),
                                border: const Color(0xFFBFDBFE),
                              )).toList()),
                          ],
                        )),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // ── Copies section ──
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
                      child: Row(
                        children: [
                          const Text('Copies',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF3F4F6),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text('${_copies.length} total',
                                style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280), fontWeight: FontWeight.w500)),
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 1, color: Color(0xFFF3F4F6)),

                    if (_copies.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(40),
                        child: Center(child: Text('No copies registered',
                            style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13))),
                      )
                    else
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: DataTable(
                          headingRowHeight: 40,
                          dataRowMinHeight: 50,
                          dataRowMaxHeight: 60,
                          headingRowColor: WidgetStateProperty.all(const Color(0xFFF9FAFB)),
                          columnSpacing: 16,
                          horizontalMargin: 20,
                          columns: [
                            const DataColumn(label: _ColHead('Copy ID')),
                            const DataColumn(label: _ColHead('Barcode')),
                            const DataColumn(label: _ColHead('Status')),
                            if (!isMemberRole) const DataColumn(label: _ColHead('Borrower')),
                            const DataColumn(label: _ColHead('Due Date')),
                          ],
                          rows: _copies.map((c) {
                            final isAvail = (c['status'] as String?)?.toLowerCase() == 'available';
                            final borrower = c['borrower'] as Map<String, dynamic>?;

                            return DataRow(cells: [
                              DataCell(Text('#${c['copy_id']}',
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF), fontFamily: 'monospace'))),
                              DataCell(Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF3F4F6),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(c['copy_code'] ?? '—',
                                    style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: Color(0xFF374151))),
                              )),
                              DataCell(Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isAvail ? const Color(0xFFECFDF5) : const Color(0xFFFFF7ED),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(mainAxisSize: MainAxisSize.min, children: [
                                  Container(
                                    width: 6, height: 6,
                                    decoration: BoxDecoration(
                                      color: isAvail ? const Color(0xFF10B981) : const Color(0xFFF97316),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 5),
                                  Text(c['status'] ?? '—',
                                      style: TextStyle(
                                          fontSize: 11, fontWeight: FontWeight.w600,
                                          color: isAvail ? const Color(0xFF065F46) : const Color(0xFF9A3412))),
                                ]),
                              )),
                              if (!isMemberRole)
                                DataCell(Text(
                                  borrower?['borrower_name'] ?? '—',
                                  style: TextStyle(
                                      fontSize: 13,
                                      color: borrower != null ? const Color(0xFF374151) : const Color(0xFFD1D5DB)),
                                )),
                              DataCell(
                                borrower?['due_date'] != null
                                    ? Text(
                                        _fmt(borrower!['due_date']),
                                        style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
                                      )
                                    : const Text('—', style: TextStyle(color: Color(0xFFD1D5DB))),
                              ),
                            ]);
                          }).toList(),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  String _fmt(dynamic d) {
    final dt = DateTime.tryParse(d.toString());
    if (dt == null) return '—';
    return '${dt.month}/${dt.day}/${dt.year}';
  }
}

// ── Shared tiny widgets ───────────────────────────────────────────────────

class _InfoField extends StatelessWidget {
  final String label, value;
  const _InfoField({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w500)),
      const SizedBox(height: 2),
      Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
    ]);
  }
}

class _Tag extends StatelessWidget {
  final String label;
  final Color bg, color, border;
  const _Tag({required this.label, required this.bg, required this.color, required this.border});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: border),
      ),
      child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
    );
  }
}

class _ColHead extends StatelessWidget {
  final String label;
  const _ColHead(this.label);

  @override
  Widget build(BuildContext context) {
    return Text(label,
        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700,
            color: Color(0xFF9CA3AF), letterSpacing: 0.4));
  }
}