// lib/pages/scan_page.dart
import 'package:flutter/material.dart';
import '../services/api.dart';

class ScanPage extends StatefulWidget {
  const ScanPage({super.key});
  @override
  State<ScanPage> createState() => _ScanPageState();
}

class _ScanPageState extends State<ScanPage> {
  int _tab = 0;
  int _pendingCount = 0;

  @override
  void initState() {
    super.initState();
    _fetchPendingCount();
  }

  Future<void> _fetchPendingCount() async {
    try {
      final res = await ApiService.get('/renewal-requests', params: {'status': 'pending'});
      if (mounted) setState(() => _pendingCount = (res.data['requests'] as List?)?.length ?? 0);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Library Operations',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Issue, return, renew, and manage renewal requests',
                    style: TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
                  ),
                  const SizedBox(height: 16),

                  // ── Tabs — horizontally scrollable ──
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Container(
                      padding: const EdgeInsets.all(5),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE5E7EB)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _TabBtn(label: 'Scan Book', active: _tab == 0, color: const Color(0xFF2563EB), onTap: () => setState(() => _tab = 0)),
                          _TabBtn(label: 'Renew Book', active: _tab == 1, color: const Color(0xFF10B981), onTap: () => setState(() => _tab = 1)),
                          _TabBtn(label: 'Renewal Requests', active: _tab == 2, color: const Color(0xFFF59E0B), badge: _pendingCount > 0 ? _pendingCount : null, onTap: () => setState(() => _tab = 2)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Tab content with scroll
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                  ),
                  child: [
                    const _ScanTab(),
                    const _RenewTab(),
                    _RenewalRequestsTab(onUpdate: _fetchPendingCount),
                  ][_tab],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Tab button ─────────────────────────────────────────────────────────────

class _TabBtn extends StatelessWidget {
  final String label;
  final bool active;
  final Color color;
  final VoidCallback onTap;
  final int? badge;
  const _TabBtn({required this.label, required this.active, required this.color, required this.onTap, this.badge});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(color: active ? color : Colors.transparent, borderRadius: BorderRadius.circular(8)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: active ? Colors.white : const Color(0xFF6B7280))),
            if (badge != null) ...[
              const SizedBox(width: 5),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                decoration: BoxDecoration(
                  color: active ? Colors.white.withOpacity(0.3) : const Color(0xFFF59E0B),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text('$badge', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Shared input decoration ────────────────────────────────────────────────

InputDecoration _inputDec({required String hint, required Color focusColor, Color? borderColor}) => InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: borderColor ?? const Color(0xFFD1D5DB), width: 2)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: borderColor ?? const Color(0xFFD1D5DB), width: 2)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: focusColor, width: 2)),
      contentPadding: const EdgeInsets.all(14),
    );

// ── Shared: borrower search widget ────────────────────────────────────────

class _BorrowerSearchField extends StatefulWidget {
  final Color accentColor;
  final Function(Map<String, dynamic>) onSelected;
  final VoidCallback onCleared;
  const _BorrowerSearchField({required this.accentColor, required this.onSelected, required this.onCleared});

  @override
  State<_BorrowerSearchField> createState() => _BorrowerSearchFieldState();
}

class _BorrowerSearchFieldState extends State<_BorrowerSearchField> {
  final _ctrl = TextEditingController();
  List<dynamic> _results = [];
  Map<String, dynamic>? _selected;
  bool _searching = false;
  String? _error;
  DateTime? _lastType;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _onChanged(String val) {
    if (_selected != null) {
      setState(() {
        _selected = null;
        _results = [];
      });
      widget.onCleared();
    }
    final now = DateTime.now();
    _lastType = now;
    setState(() => _error = null);
    if (val.trim().isEmpty) {
      setState(() => _results = []);
      return;
    }
    Future.delayed(const Duration(milliseconds: 350), () async {
      if (_lastType != now) return;
      setState(() => _searching = true);
      try {
        final trimmed = val.trim();
        if (RegExp(r'^\d+$').hasMatch(trimmed)) {
          final res = await ApiService.get('/borrowers/rf/$trimmed');
          if (res.data['borrower'] != null) {
            _pickBorrower(res.data['borrower']);
            return;
          }
        }
        final res = await ApiService.get('/borrowers/search', params: {'q': trimmed});
        final list = res.data['borrowers'] ?? [];
        setState(() {
          _results = list;
          if (list.isEmpty) _error = 'No borrowers found.';
        });
      } catch (_) {
        setState(() => _error = 'Search failed.');
      } finally {
        if (mounted) setState(() => _searching = false);
      }
    });
  }

  void _pickBorrower(Map<String, dynamic> b) {
    setState(() {
      _selected = b;
      _ctrl.text = '${b['borrower_name']} (${b['rf_id'] != null ? 'RF: ${b['rf_id']}' : 'ID: ${b['borrower_id']}'})';
      _results = [];
      _error = null;
      _searching = false;
    });
    widget.onSelected(b);
  }

  void _clear() {
    setState(() {
      _selected = null;
      _ctrl.clear();
      _results = [];
      _error = null;
    });
    widget.onCleared();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          decoration: BoxDecoration(
            border: Border.all(
              color: _selected != null
                  ? const Color(0xFF10B981)
                  : _error != null
                      ? const Color(0xFFEF4444)
                      : const Color(0xFFD1D5DB),
              width: 2,
            ),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _ctrl,
                  onChanged: _onChanged,
                  style: const TextStyle(fontSize: 14),
                  decoration: const InputDecoration(
                    hintText: 'Scan RF card or type to search...',
                    hintStyle: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.all(14),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: _searching
                    ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: widget.accentColor))
                    : _selected != null
                        ? GestureDetector(onTap: _clear, child: const Icon(Icons.close, size: 18, color: Color(0xFF9CA3AF)))
                        : const SizedBox.shrink(),
              ),
            ],
          ),
        ),
        if (_error != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text(_error!, style: const TextStyle(fontSize: 11, color: Color(0xFFEF4444)))),
        if (_results.isNotEmpty && _selected == null)
          Container(
            margin: const EdgeInsets.only(top: 4),
            constraints: const BoxConstraints(maxHeight: 240),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE5E7EB)),
              boxShadow: const [BoxShadow(color: Color(0x1A000000), blurRadius: 12, offset: Offset(0, 4))],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: _results.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (_, i) {
                  final b = _results[i];
                  return ListTile(
                    dense: true,
                    title: Text(b['borrower_name'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis),
                    subtitle: Text('ID: ${b['borrower_id']}${b['rf_id'] != null ? ' · RF: ${b['rf_id']}' : ''}', style: const TextStyle(fontSize: 11), overflow: TextOverflow.ellipsis),
                    onTap: () => _pickBorrower(b as Map<String, dynamic>),
                  );
                },
              ),
            ),
          ),
        if (_selected != null)
          Container(
            margin: const EdgeInsets.only(top: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFF6EE7B7), width: 2)),
            child: Row(
              children: [
                Container(width: 32, height: 32, decoration: const BoxDecoration(color: Color(0xFFD1FAE5), shape: BoxShape.circle), child: const Icon(Icons.check, size: 16, color: Color(0xFF059669))),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_selected!['borrower_name'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF065F46)), overflow: TextOverflow.ellipsis),
                      if (_selected!['rf_id'] != null) Text('RF ID: ${_selected!['rf_id']}', style: const TextStyle(fontSize: 11, color: Color(0xFF059669)), overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

// ── Scan tab ───────────────────────────────────────────────────────────────

class _ScanTab extends StatefulWidget {
  const _ScanTab();
  @override
  State<_ScanTab> createState() => _ScanTabState();
}

class _ScanTabState extends State<_ScanTab> {
  Map<String, dynamic>? _selectedBorrower;
  List<dynamic> _issuedBooks = [];
  bool _loadingIssued = false;

  // Book search
  final _bookSearchCtrl = TextEditingController();
  List<dynamic> _bookResults = [];
  bool _searchingBooks = false;
  Map<String, dynamic>? _selectedBook;
  DateTime? _lastBookType;

  // Copies
  List<dynamic> _copies = [];
  bool _loadingCopies = false;
  Map<String, dynamic>? _selectedCopy;

  // Copy code input
  final _copyCodeCtrl = TextEditingController();
  String? _copyCodeError;
  bool _validatingCopy = false;
  DateTime? _lastCopyType;

  Map<String, dynamic>? _scanResult;
  bool _loading = false;
  bool _returnMode = false;

  @override
  void dispose() {
    _bookSearchCtrl.dispose();
    _copyCodeCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchIssuedBooks(int borrowerId) async {
    setState(() => _loadingIssued = true);
    try {
      final res = await ApiService.get('/borrowers/$borrowerId/issues');
      final issues = (res.data['issues'] as List?)?.where((i) => i['check_in'] == null).toList() ?? [];
      setState(() => _issuedBooks = issues);
    } catch (_) {
      setState(() => _issuedBooks = []);
    } finally {
      if (mounted) setState(() => _loadingIssued = false);
    }
  }

  void _onBorrowerSelected(Map<String, dynamic> b) {
    setState(() => _selectedBorrower = b);
    _fetchIssuedBooks(b['borrower_id']);
  }

  void _onBorrowerCleared() {
    setState(() {
      _selectedBorrower = null;
      _issuedBooks = [];
    });
  }

  void _onBookSearchChanged(String val) {
    if (_selectedBook != null) {
      setState(() {
        _selectedBook = null;
        _copies = [];
        _selectedCopy = null;
      });
    }
    final now = DateTime.now();
    _lastBookType = now;
    if (val.trim().isEmpty) {
      setState(() => _bookResults = []);
      return;
    }
    if (val.length < 2) return;

    Future.delayed(const Duration(milliseconds: 300), () async {
      if (_lastBookType != now) return;
      setState(() => _searchingBooks = true);
      try {
        final res = await ApiService.get('/search', params: {'q': val});
        setState(() => _bookResults = res.data['results']?['books'] ?? []);
      } catch (_) {
        setState(() => _bookResults = []);
      } finally {
        if (mounted) setState(() => _searchingBooks = false);
      }
    });
  }

  Future<void> _selectBook(Map<String, dynamic> book) async {
    setState(() {
      _selectedBook = book;
      _bookSearchCtrl.text = book['title'];
      _bookResults = [];
      _selectedCopy = null;
      _returnMode = false;
      _copyCodeError = null;
    });
    await _fetchCopies(book['book_id']);
  }

  Future<void> _fetchCopies(int bookId) async {
    setState(() => _loadingCopies = true);
    try {
      final res = await ApiService.get('/books/$bookId/copies');
      setState(() => _copies = res.data['copies'] ?? []);
    } catch (_) {
      setState(() => _copies = []);
    } finally {
      if (mounted) setState(() => _loadingCopies = false);
    }
  }

  void _selectCopy(Map<String, dynamic> copy) {
    final isReturnable = _selectedBorrower != null && copy['status'] == 'Issued' && copy['borrower']?['borrower_id'] == _selectedBorrower!['borrower_id'];
    setState(() {
      _selectedCopy = copy;
      _copyCodeCtrl.text = copy['copy_code'];
      _returnMode = isReturnable;
      _copyCodeError = null;
    });
  }

  void _selectIssuedBook(Map<String, dynamic> issue) {
    setState(() {
      _copyCodeCtrl.text = issue['copy_code'];
      _selectedBook = null;
      _selectedCopy = null;
      _bookSearchCtrl.clear();
      _returnMode = true;
      _copyCodeError = null;
    });
  }

  void _onCopyCodeChanged(String val) {
    if (_selectedCopy != null || _selectedBook != null) {
      setState(() {
        _copyCodeError = null;
        _validatingCopy = false;
      });
      return;
    }
    final trimmed = val.trim();
    if (trimmed.isEmpty) {
      setState(() {
        _copyCodeError = null;
        _validatingCopy = false;
      });
      return;
    }

    final now = DateTime.now();
    _lastCopyType = now;
    setState(() => _validatingCopy = true);

    Future.delayed(const Duration(milliseconds: 400), () async {
      if (_lastCopyType != now) return;
      try {
        await ApiService.get('/books/copies/by-code/$trimmed');
        if (mounted) setState(() => _copyCodeError = null);
      } catch (e) {
        if (mounted) setState(() => _copyCodeError = 'Copy code not found.');
      } finally {
        if (mounted) setState(() => _validatingCopy = false);
      }
    });
  }

  Future<void> _scan() async {
    final rfId = _selectedBorrower?['rf_id']?.toString() ?? _selectedBorrower?['borrower_id']?.toString() ?? '';
    final code = _copyCodeCtrl.text.trim();
    if (rfId.isEmpty || code.isEmpty) {
      setState(() => _scanResult = {'error': 'Please select a borrower and enter a copy code.'});
      return;
    }
    setState(() {
      _loading = true;
      _scanResult = null;
    });
    try {
      final res = await ApiService.post('/scan', data: {'rf_id': rfId, 'copy_code': code});
      setState(() {
        _scanResult = res.data;
        _returnMode = false;
      });
      if (res.data['action'] != null) {
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) _clear();
        });
      }
    } catch (_) {
      setState(() => _scanResult = {'error': 'Scan failed. Please try again.'});
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _clear() => setState(() {
        _selectedBorrower = null;
        _issuedBooks = [];
        _bookSearchCtrl.clear();
        _bookResults = [];
        _selectedBook = null;
        _copies = [];
        _selectedCopy = null;
        _copyCodeCtrl.clear();
        _copyCodeError = null;
        _scanResult = null;
        _returnMode = false;
      });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Scan RF ID or Search Borrower', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
        const SizedBox(height: 8),
        _BorrowerSearchField(
          accentColor: const Color(0xFF2563EB),
          onSelected: _onBorrowerSelected,
          onCleared: _onBorrowerCleared,
        ),

        // Issued books
        if (_issuedBooks.isNotEmpty) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFFED7AA), width: 2)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Books issued to ${_selectedBorrower!['borrower_name']}',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF9A3412)),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (_loadingIssued) const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFF97316))),
                  ],
                ),
                const SizedBox(height: 4),
                const Text('Click to select for return', style: TextStyle(fontSize: 11, color: Color(0xFFC2410C))),
                const SizedBox(height: 10),
                ...(_issuedBooks.map((issue) {
                  final isSelected = _copyCodeCtrl.text == issue['copy_code'];
                  final overdue = issue['due_date'] != null && DateTime.tryParse(issue['due_date'])?.isBefore(DateTime.now()) == true;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: GestureDetector(
                      onTap: () => _selectIssuedBook(issue),
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFFFED7AA) : Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: isSelected ? const Color(0xFFF97316) : const Color(0xFFE5E7EB), width: 2),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(issue['book_title'] ?? '—', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF1F2937)), overflow: TextOverflow.ellipsis),
                                  Text(issue['copy_code'] ?? '', style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Color(0xFF6B7280))),
                                  Text(
                                    issue['due_date'] != null ? 'Due: ${issue['due_date'].toString().substring(0, 10)}${overdue ? ' · Overdue' : ''}' : '—',
                                    style: TextStyle(fontSize: 10, color: overdue ? const Color(0xFFDC2626) : const Color(0xFF9CA3AF), fontWeight: overdue ? FontWeight.w600 : FontWeight.normal),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            if (isSelected) const Icon(Icons.check_circle, size: 18, color: Color(0xFFF97316)),
                          ],
                        ),
                      ),
                    ),
                  );
                })).toList(),
              ],
            ),
          ),
        ],

        const SizedBox(height: 20),
        const Divider(),
        const SizedBox(height: 16),

        Text(_selectedBorrower != null && _issuedBooks.isNotEmpty ? 'Or Issue a New Book' : 'Select Book & Copy', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF4B5563))),
        const SizedBox(height: 12),

        // Book search
        const Text('Search by title or ISBN', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
        const SizedBox(height: 6),
        Stack(
          alignment: Alignment.centerRight,
          children: [
            TextField(
              controller: _bookSearchCtrl,
              onChanged: _onBookSearchChanged,
              style: const TextStyle(fontSize: 14),
              decoration: _inputDec(hint: 'Search...', focusColor: const Color(0xFF2563EB)),
            ),
            Positioned(
              right: 12,
              child: _searchingBooks
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2563EB)))
                  : _selectedBook != null
                      ? GestureDetector(
                          onTap: () => setState(() {
                            _selectedBook = null;
                            _bookSearchCtrl.clear();
                            _copies = [];
                            _selectedCopy = null;
                            _returnMode = false;
                          }),
                          child: const Icon(Icons.close, size: 18, color: Color(0xFF9CA3AF)),
                        )
                      : const SizedBox.shrink(),
            ),
          ],
        ),

        // Book results dropdown
        if (_bookResults.isNotEmpty && _selectedBook == null) ...[
          const SizedBox(height: 4),
          Container(
            constraints: const BoxConstraints(maxHeight: 180),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE5E7EB)),
              boxShadow: const [BoxShadow(color: Color(0x1A000000), blurRadius: 12, offset: Offset(0, 4))],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: _bookResults.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (_, i) {
                  final book = _bookResults[i];
                  return ListTile(
                    dense: true,
                    title: Text(book['title'] ?? '', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis),
                    subtitle: Text('ISBN: ${book['isbn']} · ${book['publication_year']}', style: const TextStyle(fontSize: 10), overflow: TextOverflow.ellipsis),
                    onTap: () => _selectBook(book),
                  );
                },
              ),
            ),
          ),
        ],

        // Selected book with copies
        if (_selectedBook != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFBFDBFE), width: 2)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(_selectedBook!['title'], style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1E3A8A)), overflow: TextOverflow.ellipsis)),
                    if (_loadingCopies) const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2563EB))),
                  ],
                ),
                const SizedBox(height: 10),
                if (_copies.isEmpty && !_loadingCopies)
                  const Text('No copies available', style: TextStyle(fontSize: 12, color: Color(0xFFDC2626)))
                else ...[
                  const Text('Select a copy:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF1E40AF))),
                  const SizedBox(height: 6),
                  ...(_copies.map((copy) {
                    final isReturnable = _selectedBorrower != null && copy['status'] == 'Issued' && copy['borrower']?['borrower_id'] == _selectedBorrower!['borrower_id'];
                    final isAvailable = copy['status'] == 'Available';
                    final isClickable = isAvailable || isReturnable;
                    final isSelected = _selectedCopy?['copy_id'] == copy['copy_id'];

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: GestureDetector(
                        onTap: isClickable ? () => _selectCopy(copy) : null,
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? (isReturnable ? const Color(0xFFFED7AA) : const Color(0xFFBFDBFE))
                                : isReturnable
                                    ? const Color(0xFFFFF7ED)
                                    : isAvailable
                                        ? Colors.white
                                        : const Color(0xFFF9FAFB),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: isSelected
                                  ? (isReturnable ? const Color(0xFFF97316) : const Color(0xFF2563EB))
                                  : isReturnable
                                      ? const Color(0xFFFED7AA)
                                      : isAvailable
                                          ? const Color(0xFFE5E7EB)
                                          : const Color(0xFFE5E7EB),
                              width: 2,
                            ),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(copy['copy_code'] ?? '', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, fontFamily: 'monospace', color: Color(0xFF1F2937)), overflow: TextOverflow.ellipsis),
                                    Text(
                                      isReturnable ? 'Return this book' : copy['status'] ?? '',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: isReturnable
                                            ? const Color(0xFFF97316)
                                            : isAvailable
                                                ? const Color(0xFF10B981)
                                                : const Color(0xFFDC2626),
                                      ),
                                    ),
                                    if (copy['borrower'] != null)
                                      Text(
                                        '${isReturnable ? 'Issued to you' : 'Issued to: ${copy['borrower']['borrower_name']}'}${copy['borrower']['due_date'] != null ? ' · Due: ${copy['borrower']['due_date'].toString().substring(0, 10)}' : ''}',
                                        style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF)),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                  ],
                                ),
                              ),
                              if (isSelected) Icon(Icons.check_circle, size: 16, color: isReturnable ? const Color(0xFFF97316) : const Color(0xFF2563EB)),
                            ],
                          ),
                        ),
                      ),
                    );
                  })).toList(),
                ],
              ],
            ),
          ),
        ],

        // OR divider + copy code input
        if (_issuedBooks.isEmpty) ...[
          const SizedBox(height: 16),
          Row(
            children: const [
              Expanded(child: Divider()),
              Padding(padding: EdgeInsets.symmetric(horizontal: 12), child: Text('OR', style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w600))),
              Expanded(child: Divider()),
            ],
          ),
          const SizedBox(height: 16),
          const Text('Scan Book Barcode', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
          const SizedBox(height: 6),
          Stack(
            alignment: Alignment.centerRight,
            children: [
              TextField(
                controller: _copyCodeCtrl,
                style: const TextStyle(fontSize: 14),
                decoration: _inputDec(
                  hint: 'Scan copy barcode...',
                  focusColor: const Color(0xFF2563EB),
                  borderColor: _copyCodeError != null ? const Color(0xFFEF4444) : null,
                ),
                onChanged: (val) {
                  if (val.isNotEmpty) {
                    setState(() {
                      _selectedBook = null;
                      _selectedCopy = null;
                      _bookSearchCtrl.clear();
                      _returnMode = false;
                    });
                  }
                  _onCopyCodeChanged(val);
                },
                onSubmitted: (_) => _scan(),
              ),
              Positioned(
                right: 12,
                child: _validatingCopy
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2563EB)))
                    : _copyCodeError == null && _copyCodeCtrl.text.isNotEmpty && !_validatingCopy
                        ? const Icon(Icons.check_circle, size: 18, color: Color(0xFF10B981))
                        : const SizedBox.shrink(),
              ),
            ],
          ),
          if (_copyCodeError != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text(_copyCodeError!, style: const TextStyle(fontSize: 11, color: Color(0xFFEF4444)))),
        ],

        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _loading ? null : _scan,
            style: ElevatedButton.styleFrom(
              backgroundColor: _returnMode ? const Color(0xFFF97316) : const Color(0xFF2563EB),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              disabledBackgroundColor: const Color(0xFF9CA3AF),
            ),
            child: Text(_loading ? 'Processing…' : _returnMode ? 'Return Book' : 'Issue Book', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          ),
        ),
        if (_selectedBorrower != null || _selectedBook != null || _copyCodeCtrl.text.isNotEmpty) ...[
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: _clear,
              style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: const Text('Clear Form'),
            ),
          ),
        ],
        if (_scanResult != null) ...[const SizedBox(height: 16), _ResultBanner(result: _scanResult!)],
      ],
    );
  }
}

// ── Renew tab ──────────────────────────────────────────────────────────────

class _RenewTab extends StatefulWidget {
  const _RenewTab();
  @override
  State<_RenewTab> createState() => _RenewTabState();
}

class _RenewTabState extends State<_RenewTab> {
  Map<String, dynamic>? _selectedBorrower;

  // Book search
  final _bookSearchCtrl = TextEditingController();
  List<dynamic> _bookResults = [];
  bool _searchingBooks = false;
  Map<String, dynamic>? _selectedBook;
  DateTime? _lastBookType;

  // Copies
  List<dynamic> _copies = [];
  bool _loadingCopies = false;
  Map<String, dynamic>? _selectedCopy;

  // Copy code input
  final _copyCodeCtrl = TextEditingController();
  String? _copyCodeError;
  bool _validatingCopy = false;
  DateTime? _lastCopyType;

  Map<String, dynamic>? _result;
  bool _loading = false;

  @override
  void dispose() {
    _bookSearchCtrl.dispose();
    _copyCodeCtrl.dispose();
    super.dispose();
  }

  void _onBookSearchChanged(String val) {
    if (_selectedBook != null) {
      setState(() {
        _selectedBook = null;
        _copies = [];
        _selectedCopy = null;
      });
    }
    final now = DateTime.now();
    _lastBookType = now;
    if (val.trim().isEmpty) {
      setState(() => _bookResults = []);
      return;
    }
    if (val.length < 2) return;

    Future.delayed(const Duration(milliseconds: 300), () async {
      if (_lastBookType != now) return;
      setState(() => _searchingBooks = true);
      try {
        final res = await ApiService.get('/search', params: {'q': val});
        setState(() => _bookResults = res.data['results']?['books'] ?? []);
      } catch (_) {
        setState(() => _bookResults = []);
      } finally {
        if (mounted) setState(() => _searchingBooks = false);
      }
    });
  }

  Future<void> _selectBook(Map<String, dynamic> book) async {
    setState(() {
      _selectedBook = book;
      _bookSearchCtrl.text = book['title'];
      _bookResults = [];
      _selectedCopy = null;
      _copyCodeError = null;
    });
    await _fetchCopies(book['book_id']);
  }

  Future<void> _fetchCopies(int bookId) async {
    setState(() => _loadingCopies = true);
    try {
      final res = await ApiService.get('/books/$bookId/copies');
      setState(() => _copies = res.data['copies'] ?? []);
    } catch (_) {
      setState(() => _copies = []);
    } finally {
      if (mounted) setState(() => _loadingCopies = false);
    }
  }

  void _selectCopy(Map<String, dynamic> copy) {
    setState(() {
      _selectedCopy = copy;
      _copyCodeCtrl.text = copy['copy_code'];
      _copyCodeError = null;
    });
  }

  void _onCopyCodeChanged(String val) {
    if (_selectedCopy != null || _selectedBook != null) {
      setState(() {
        _copyCodeError = null;
        _validatingCopy = false;
      });
      return;
    }
    final trimmed = val.trim();
    if (trimmed.isEmpty) {
      setState(() {
        _copyCodeError = null;
        _validatingCopy = false;
      });
      return;
    }

    final now = DateTime.now();
    _lastCopyType = now;
    setState(() => _validatingCopy = true);

    Future.delayed(const Duration(milliseconds: 400), () async {
      if (_lastCopyType != now) return;
      try {
        await ApiService.get('/books/copies/by-code/$trimmed');
        if (mounted) setState(() => _copyCodeError = null);
      } catch (e) {
        if (mounted) setState(() => _copyCodeError = 'Copy code not found.');
      } finally {
        if (mounted) setState(() => _validatingCopy = false);
      }
    });
  }

  Future<void> _renew() async {
    final rfId = _selectedBorrower?['rf_id']?.toString() ?? _selectedBorrower?['borrower_id']?.toString() ?? '';
    final code = _copyCodeCtrl.text.trim();
    if (rfId.isEmpty || code.isEmpty) {
      setState(() => _result = {'error': 'Please select a borrower and enter a copy code.'});
      return;
    }
    setState(() {
      _loading = true;
      _result = null;
    });
    try {
      final res = await ApiService.post('/issues/renew', data: {'rf_id': rfId, 'copy_code': code});
      setState(() => _result = {'success': true, 'message': 'Book renewed successfully', 'new_due_date': res.data['new_due_date']});
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) _clear();
      });
    } catch (_) {
      setState(() => _result = {'error': 'Renewal failed. Please try again.'});
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _clear() => setState(() {
        _selectedBorrower = null;
        _bookSearchCtrl.clear();
        _bookResults = [];
        _selectedBook = null;
        _copies = [];
        _selectedCopy = null;
        _copyCodeCtrl.clear();
        _copyCodeError = null;
        _result = null;
      });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Scan RF ID or Search Borrower', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
        const SizedBox(height: 8),
        _BorrowerSearchField(
          accentColor: const Color(0xFF10B981),
          onSelected: (b) => setState(() => _selectedBorrower = b),
          onCleared: () => setState(() => _selectedBorrower = null),
        ),
        const SizedBox(height: 20),
        const Divider(),
        const SizedBox(height: 16),
        const Text('Select Book & Copy', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF4B5563))),
        const SizedBox(height: 12),

        // Book search
        const Text('Search by title or ISBN', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
        const SizedBox(height: 6),
        Stack(
          alignment: Alignment.centerRight,
          children: [
            TextField(
              controller: _bookSearchCtrl,
              onChanged: _onBookSearchChanged,
              style: const TextStyle(fontSize: 14),
              decoration: _inputDec(hint: 'Search...', focusColor: const Color(0xFF10B981)),
            ),
            Positioned(
              right: 12,
              child: _searchingBooks
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF10B981)))
                  : _selectedBook != null
                      ? GestureDetector(
                          onTap: () => setState(() {
                            _selectedBook = null;
                            _bookSearchCtrl.clear();
                            _copies = [];
                            _selectedCopy = null;
                          }),
                          child: const Icon(Icons.close, size: 18, color: Color(0xFF9CA3AF)),
                        )
                      : const SizedBox.shrink(),
            ),
          ],
        ),

        // Book results dropdown
        if (_bookResults.isNotEmpty && _selectedBook == null) ...[
          const SizedBox(height: 4),
          Container(
            constraints: const BoxConstraints(maxHeight: 180),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE5E7EB)),
              boxShadow: const [BoxShadow(color: Color(0x1A000000), blurRadius: 12, offset: Offset(0, 4))],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: _bookResults.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (_, i) {
                  final book = _bookResults[i];
                  return ListTile(
                    dense: true,
                    title: Text(book['title'] ?? '', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis),
                    subtitle: Text('ISBN: ${book['isbn']} · ${book['publication_year']}', style: const TextStyle(fontSize: 10), overflow: TextOverflow.ellipsis),
                    onTap: () => _selectBook(book),
                  );
                },
              ),
            ),
          ),
        ],

        // Selected book with copies
        if (_selectedBook != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFF6EE7B7), width: 2)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(_selectedBook!['title'], style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF065F46)), overflow: TextOverflow.ellipsis)),
                    if (_loadingCopies) const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF10B981))),
                  ],
                ),
                const SizedBox(height: 10),
                if (_copies.isEmpty && !_loadingCopies)
                  const Text('No copies found', style: TextStyle(fontSize: 12, color: Color(0xFFDC2626)))
                else ...[
                  ...(_copies.map((copy) {
                    final isSelected = _selectedCopy?['copy_id'] == copy['copy_id'];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: GestureDetector(
                        onTap: () => _selectCopy(copy),
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFF6EE7B7) : Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: isSelected ? const Color(0xFF10B981) : const Color(0xFFE5E7EB), width: 2),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(copy['copy_code'] ?? '', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, fontFamily: 'monospace', color: Color(0xFF1F2937)), overflow: TextOverflow.ellipsis),
                                    Text(
                                      copy['status'] ?? '',
                                      style: TextStyle(fontSize: 11, color: copy['status'] == 'Available' ? const Color(0xFF10B981) : const Color(0xFFDC2626)),
                                    ),
                                    if (copy['borrower'] != null)
                                      Text(
                                        'Issued to: ${copy['borrower']['borrower_name']}${copy['borrower']['due_date'] != null ? ' · Due: ${copy['borrower']['due_date'].toString().substring(0, 10)}' : ''}',
                                        style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF)),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                  ],
                                ),
                              ),
                              if (isSelected) const Icon(Icons.check_circle, size: 16, color: Color(0xFF10B981)),
                            ],
                          ),
                        ),
                      ),
                    );
                  })).toList(),
                ],
              ],
            ),
          ),
        ],

        const SizedBox(height: 16),
        Row(
          children: const [
            Expanded(child: Divider()),
            Padding(padding: EdgeInsets.symmetric(horizontal: 12), child: Text('OR', style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w600))),
            Expanded(child: Divider()),
          ],
        ),
        const SizedBox(height: 16),

        const Text('Scan Barcode', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
        const SizedBox(height: 6),
        Stack(
          alignment: Alignment.centerRight,
          children: [
            TextField(
              controller: _copyCodeCtrl,
              style: const TextStyle(fontSize: 14),
              decoration: _inputDec(
                hint: 'Scan copy barcode...',
                focusColor: const Color(0xFF10B981),
                borderColor: _copyCodeError != null ? const Color(0xFFEF4444) : null,
              ),
              onChanged: (val) {
                if (val.isNotEmpty) {
                  setState(() {
                    _selectedBook = null;
                    _selectedCopy = null;
                    _bookSearchCtrl.clear();
                  });
                }
                _onCopyCodeChanged(val);
              },
              onSubmitted: (_) => _renew(),
            ),
            Positioned(
              right: 12,
              child: _validatingCopy
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF10B981)))
                  : _copyCodeError == null && _copyCodeCtrl.text.isNotEmpty && !_validatingCopy
                      ? const Icon(Icons.check_circle, size: 18, color: Color(0xFF10B981))
                      : const SizedBox.shrink(),
            ),
          ],
        ),
        if (_copyCodeError != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text(_copyCodeError!, style: const TextStyle(fontSize: 11, color: Color(0xFFEF4444)))),

        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _loading ? null : _renew,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              disabledBackgroundColor: const Color(0xFF9CA3AF),
            ),
            child: Text(_loading ? 'Processing…' : 'Renew Now', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          ),
        ),
        if (_selectedBorrower != null || _selectedBook != null || _copyCodeCtrl.text.isNotEmpty) ...[
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: _clear,
              style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: const Text('Clear Form'),
            ),
          ),
        ],
        if (_result != null) ...[const SizedBox(height: 16), _ResultBanner(result: _result!)],
      ],
    );
  }
}

// ── Renewal requests tab ───────────────────────────────────────────────────

class _RenewalRequestsTab extends StatefulWidget {
  final VoidCallback onUpdate;
  const _RenewalRequestsTab({required this.onUpdate});

  @override
  State<_RenewalRequestsTab> createState() => _RenewalRequestsTabState();
}

class _RenewalRequestsTabState extends State<_RenewalRequestsTab> {
  List<dynamic> _requests = [];
  bool _loading = true;
  String _filter = 'pending';
  int? _actioning;

  @override
  void initState() {
    super.initState();
    _fetchRequests();
  }

  Future<void> _fetchRequests() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.get('/renewal-requests', params: {'status': _filter});
      setState(() => _requests = res.data['requests'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _approve(dynamic req) async {
    setState(() => _actioning = req['id']);
    try {
      await ApiService.put('/renewal-requests/${req['id']}/approve');
      _fetchRequests();
      widget.onUpdate();
    } catch (_) {
    } finally {
      if (mounted) setState(() => _actioning = null);
    }
  }

  Future<void> _deny(dynamic req) async {
    final notesCtrl = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Deny Renewal?', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('The borrower will be notified.', style: TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
            const SizedBox(height: 12),
            TextField(
              controller: notesCtrl,
              maxLines: 2,
              style: const TextStyle(fontSize: 13),
              decoration: InputDecoration(hintText: 'Reason (optional)', border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)), contentPadding: const EdgeInsets.all(10)),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444), foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Deny'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      setState(() => _actioning = req['id']);
      try {
        await ApiService.put('/renewal-requests/${req['id']}/deny', data: {'notes': notesCtrl.text.isEmpty ? null : notesCtrl.text});
        _fetchRequests();
        widget.onUpdate();
      } catch (_) {
      } finally {
        if (mounted) setState(() => _actioning = null);
      }
    }
    notesCtrl.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Filter pills
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final f in [
                ['pending', 'Pending', const Color(0xFFFEF3C7), const Color(0xFF92400E)],
                ['approved', 'Approved', const Color(0xFFD1FAE5), const Color(0xFF065F46)],
                ['denied', 'Denied', const Color(0xFFFEE2E2), const Color(0xFF991B1B)],
              ]) ...[
                GestureDetector(
                  onTap: () {
                    setState(() => _filter = f[0] as String);
                    _fetchRequests();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: _filter == f[0] ? f[2] as Color : Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: _filter == f[0] ? (f[3] as Color).withOpacity(0.4) : const Color(0xFFE5E7EB)),
                    ),
                    child: Text(f[1] as String, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _filter == f[0] ? f[3] as Color : const Color(0xFF6B7280))),
                  ),
                ),
                const SizedBox(width: 8),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),

        if (_loading)
          const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator(color: Color(0xFFF59E0B), strokeWidth: 2)))
        else if (_requests.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(
              child: Column(
                children: [
                  Icon(Icons.autorenew, size: 40, color: Color(0xFFE5E7EB)),
                  SizedBox(height: 8),
                  Text('No renewal requests', style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
                ],
              ),
            ),
          )
        else
          ...(_requests.map((req) {
            final borrower = req['Borrower'] ?? {};
            final issue = req['Issue'] ?? {};
            final copy = issue['Copy'] ?? {};
            final book = copy['Book'] ?? {};
            final overdue = issue['due_date'] != null && DateTime.tryParse(issue['due_date'])?.isBefore(DateTime.now()) == true;
            final isActioning = _actioning == req['id'];
            final isPending = req['status'] == 'pending';

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE5E7EB))),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Borrower row + status badge
                  Row(
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF60A5FA), Color(0xFF6366F1)]), shape: BoxShape.circle),
                        child: Center(child: Text((borrower['borrower_name'] ?? '?')[0].toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold))),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(borrower['borrower_name'] ?? '—', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1F2937)), overflow: TextOverflow.ellipsis),
                            Text('ID #${borrower['borrower_id'] ?? ''}', style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF))),
                          ],
                        ),
                      ),
                      if (!isPending)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: req['status'] == 'approved' ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: req['status'] == 'approved' ? const Color(0xFF6EE7B7) : const Color(0xFFFECACA)),
                          ),
                          child: Text(req['status'] == 'approved' ? 'Approved' : 'Denied', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: req['status'] == 'approved' ? const Color(0xFF059669) : const Color(0xFFDC2626))),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Book info
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(color: const Color(0xFFF9FAFB), borderRadius: BorderRadius.circular(8)),
                    child: Row(
                      children: [
                        const Icon(Icons.menu_book_outlined, size: 14, color: Color(0xFF9CA3AF)),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(book['title'] ?? '—', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF1F2937)), overflow: TextOverflow.ellipsis, maxLines: 2),
                              Text(copy['copy_code'] ?? '', style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Color(0xFF9CA3AF))),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Due date
                  Row(
                    children: [
                      Icon(Icons.access_time, size: 13, color: overdue ? const Color(0xFFEF4444) : const Color(0xFF9CA3AF)),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          issue['due_date'] != null ? 'Due: ${issue['due_date'].toString().substring(0, 10)}${overdue ? ' (Overdue)' : ''}' : '—',
                          style: TextStyle(fontSize: 11, color: overdue ? const Color(0xFFDC2626) : const Color(0xFF6B7280), fontWeight: overdue ? FontWeight.w600 : FontWeight.normal),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),

                  if (req['status'] == 'denied' && req['notes'] != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                      decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(6), border: Border.all(color: const Color(0xFFFECACA))),
                      child: Text('Note: ${req['notes']}', style: const TextStyle(fontSize: 11, color: Color(0xFFDC2626))),
                    ),
                  ],
                  if (req['status'] == 'approved') ...[
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                      decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(6), border: Border.all(color: const Color(0xFF6EE7B7))),
                      child: const Text('Approved — due date extended', style: TextStyle(fontSize: 11, color: Color(0xFF059669), fontWeight: FontWeight.w500)),
                    ),
                  ],

                  // Approve / Deny buttons
                  if (isPending) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: _SmallBtn(label: 'Approve', color: const Color(0xFF10B981), loading: isActioning, onTap: () => _approve(req))),
                        const SizedBox(width: 8),
                        Expanded(child: _SmallBtn(label: 'Deny', color: const Color(0xFFEF4444), loading: isActioning, onTap: () => _deny(req))),
                      ],
                    ),
                  ],
                ],
              ),
            );
          })).toList(),
      ],
    );
  }
}

// ── Small action button ────────────────────────────────────────────────────

class _SmallBtn extends StatelessWidget {
  final String label;
  final Color color;
  final bool loading;
  final VoidCallback onTap;
  const _SmallBtn({required this.label, required this.color, required this.loading, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: loading ? null : onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8), border: Border.all(color: color.withOpacity(0.3))),
        child: Center(
          child: loading ? SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: color)) : Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
        ),
      ),
    );
  }
}

// ── Result banner ──────────────────────────────────────────────────────────

class _ResultBanner extends StatelessWidget {
  final Map<String, dynamic> result;
  const _ResultBanner({required this.result});

  @override
  Widget build(BuildContext context) {
    final isError = result['error'] != null;
    final isSuccess = result['success'] == true || result['action'] != null;
    String message = '';
    if (isError)
      message = result['error'];
    else if (result['action'] == 'ISSUED')
      message = '✓ Book Issued · Due: ${result['due_date']?.toString().substring(0, 10) ?? ''}';
    else if (result['action'] == 'RETURNED')
      message = '✓ Book Returned · Fine: ₹${result['fine'] ?? 0}';
    else if (isSuccess) message = '✓ ${result['message'] ?? 'Success'}${result['new_due_date'] != null ? ' · New due: ${result['new_due_date'].toString().substring(0, 10)}' : ''}';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isError ? const Color(0xFFFEF2F2) : const Color(0xFFECFDF5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isError ? const Color(0xFFFECACA) : const Color(0xFF6EE7B7), width: 2),
      ),
      child: Text(message, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isError ? const Color(0xFFDC2626) : const Color(0xFF065F46))),
    );
  }
}