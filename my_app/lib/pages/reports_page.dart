// lib/pages/reports_page.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';

class ReportsPage extends StatefulWidget {
  const ReportsPage({super.key});

  @override
  State<ReportsPage> createState() => _ReportsPageState();
}

class _ReportsPageState extends State<ReportsPage> {
  List<dynamic> _issues    = [];
  bool _loading            = true;
  String? _error;

  // Pagination
  int _page       = 1;
  int _limit      = 10;
  int _totalPages = 1;
  int _totalCount = 0;

  // Filters
  String _filterType   = 'all';
  String _statusFilter = '';
  String _fineFilter   = '';

  // Sort
  String _sortBy = 'due_date';
  String _order  = 'ASC';

  // Borrower search
  final _borrowerCtrl         = TextEditingController();
  List<dynamic> _borrowerResults = [];
  bool _showBorrowerDrop      = false;
  Map<String, dynamic>? _selBorrower;
  bool _searchingBorrower     = false;

  // Book search
  final _bookCtrl            = TextEditingController();
  List<dynamic> _bookResults = [];
  bool _showBookDrop         = false;
  Map<String, dynamic>? _selBook;
  bool _searchingBook        = false;

  bool _filtersOpen = false;

  Timer? _borrowerTimer;
  Timer? _bookTimer;

  @override
  void initState() {
    super.initState();
    _fetchIssues();
  }

  @override
  void dispose() {
    _borrowerTimer?.cancel();
    _bookTimer?.cancel();
    _borrowerCtrl.dispose();
    _bookCtrl.dispose();
    super.dispose();
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  Future<void> _fetchIssues() async {
    setState(() { _loading = true; _error = null; });
    try {
      String endpoint;
      final params = <String, dynamic>{
        'page': _page, 'limit': _limit,
        'sortBy': _sortBy, 'order': _order,
      };
      if (_filterType == 'active') {
        endpoint = '/reports/active';
      } else if (_filterType == 'overdue') {
        endpoint = '/reports/overdue';
      } else {
        endpoint = '/reports';
        if (_selBorrower != null) params['borrower_id'] = _selBorrower!['borrower_id'];
        if (_selBook     != null) params['book_id']     = _selBook!['book_id'];
        if (_statusFilter.isNotEmpty) params['status']      = _statusFilter;
        if (_fineFilter.isNotEmpty)   params['fine_filter'] = _fineFilter;
      }
      final query = params.entries.map((e) => '${e.key}=${e.value}').join('&');
      final res   = await ApiService.get('$endpoint?$query');
      final data  = res.data;
      setState(() {
        _issues     = data['issues'] ?? [];
        _totalPages = data['totalPages'] ?? 1;
        _totalCount = data['totalCount'] ?? _issues.length;
      });
    } catch (_) {
      setState(() { _error = 'Failed to load issues.'; _issues = []; });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _resetPage() { setState(() => _page = 1); _fetchIssues(); }

  void _onBorrowerChanged(String val) {
    if (_selBorrower != null) setState(() => _selBorrower = null);
    _borrowerTimer?.cancel();
    if (val.length < 2) { setState(() { _borrowerResults = []; _showBorrowerDrop = false; }); return; }
    _borrowerTimer = Timer(const Duration(milliseconds: 300), () async {
      setState(() => _searchingBorrower = true);
      try {
        final res = await ApiService.get('/borrowers/search?q=$val');
        setState(() { _borrowerResults = res.data['borrowers'] ?? []; _showBorrowerDrop = true; });
      } catch (_) { setState(() => _borrowerResults = []); }
      finally { if (mounted) setState(() => _searchingBorrower = false); }
    });
  }

  void _onBookChanged(String val) {
    if (_selBook != null) setState(() => _selBook = null);
    _bookTimer?.cancel();
    if (val.length < 2) { setState(() { _bookResults = []; _showBookDrop = false; }); return; }
    _bookTimer = Timer(const Duration(milliseconds: 300), () async {
      setState(() => _searchingBook = true);
      try {
        final res = await ApiService.get('/search?q=${Uri.encodeComponent(val)}');
        setState(() { _bookResults = res.data['results']?['books'] ?? []; _showBookDrop = true; });
      } catch (_) { setState(() => _bookResults = []); }
      finally { if (mounted) setState(() => _searchingBook = false); }
    });
  }

  void _selectBorrower(Map<String, dynamic> b) {
    setState(() {
      _selBorrower = b;
      _borrowerCtrl.text = '${b['borrower_name']} (ID: ${b['borrower_id']})';
      _showBorrowerDrop = false; _borrowerResults = [];
    });
    _resetPage();
  }

  void _selectBook(Map<String, dynamic> b) {
    setState(() {
      _selBook = b; _bookCtrl.text = b['title'] ?? '';
      _showBookDrop = false; _bookResults = [];
    });
    _resetPage();
  }

  void _clearAllFilters() {
    setState(() {
      _selBorrower = null; _borrowerCtrl.clear();
      _selBook     = null; _bookCtrl.clear();
      _statusFilter = ''; _fineFilter = '';
      _borrowerResults = []; _bookResults = [];
    });
    _resetPage();
  }

  int get _activeFilterCount =>
      (_selBorrower != null ? 1 : 0) + (_selBook != null ? 1 : 0) +
      (_statusFilter.isNotEmpty ? 1 : 0) + (_fineFilter.isNotEmpty ? 1 : 0);

  void _toggleSort(String field) {
    setState(() {
      if (_sortBy == field) _order = _order == 'ASC' ? 'DESC' : 'ASC';
      else { _sortBy = field; _order = 'ASC'; }
    });
    _resetPage();
  }

  Future<void> _sendNotification(dynamic issueId) async {
    try {
      await ApiService.post('/notifications/send-manual/$issueId', data: {'type': 'overdue'});
      if (mounted) _showSnack('Notification sent');
    } catch (_) { if (mounted) _showSnack('Failed to send notification'); }
  }

  Future<void> _calculateFines() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Calculate Fines?', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        content: const Text('This will update fine amounts for all overdue books.', style: TextStyle(fontSize: 13)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7C3AED), elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
            child: const Text('Calculate', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try { await ApiService.post('/fines/calculate-overdue'); _fetchIssues(); } catch (_) {}
  }

  void _showSnack(String msg) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));

  String _fmt(dynamic d) {
    if (d == null) return '—';
    final dt = DateTime.tryParse(d.toString());
    if (dt == null) return '—';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  int _daysOverdue(dynamic d) {
    if (d == null) return 0;
    final dt = DateTime.tryParse(d.toString());
    if (dt == null) return 0;
    final diff = DateTime.now().difference(dt).inDays;
    return diff > 0 ? diff : 0;
  }

  ({String label, Color bg, Color border, Color text}) _statusLabel(Map<String, dynamic> issue) {
    if (issue['status'] == 'returned') {
      return (label: 'Returned', bg: const Color(0xFFECFDF5), border: const Color(0xFFA7F3D0), text: const Color(0xFF059669));
    }
    final due      = DateTime.tryParse(issue['due_date']?.toString() ?? '');
    final isOverdue = due != null && due.isBefore(DateTime.now()) && issue['status'] == 'issued';
    if (isOverdue) {
      return (label: 'Overdue', bg: const Color(0xFFFEF2F2), border: const Color(0xFFFECACA), text: const Color(0xFFEF4444));
    }
    return (label: 'Active', bg: const Color(0xFFEFF6FF), border: const Color(0xFFBFDBFE), text: const Color(0xFF2563EB));
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final isMobile = constraints.maxWidth < 700;
      return Scaffold(
        backgroundColor: const Color(0xFFF9FAFB),
        body: SingleChildScrollView(
          padding: EdgeInsets.all(isMobile ? 14 : 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(isMobile),
              const SizedBox(height: 14),
              if (_error != null) _buildErrorBanner(),
              _buildToolbar(isMobile),
              if (_filtersOpen) ...[const SizedBox(height: 8), _buildFilterPanel(isMobile)],
              const SizedBox(height: 12),
              if (_loading)
                const Center(child: Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(color: Color(0xFF2563EB)),
                ))
              else if (_issues.isEmpty)
                _buildEmptyState()
              else
                isMobile ? _buildCardList() : _buildTable(),
              if (!_loading && _issues.isNotEmpty) ...[
                const SizedBox(height: 14),
                _buildPagination(isMobile),
              ],
              const SizedBox(height: 24),
            ],
          ),
        ),
      );
    });
  }

  // ── Header ────────────────────────────────────────────────────────────────

  Widget _buildHeader(bool isMobile) {
    if (isMobile) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Issue Management',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
          Text(_loading ? 'Loading…' : '$_totalCount records',
              style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: _headerBtn(label: 'Calc Fines', icon: Icons.currency_rupee,
                color: const Color(0xFF374151), bg: Colors.white, onTap: _calculateFines)),
            const SizedBox(width: 8),
            Expanded(child: _headerBtn(label: 'Notify All', icon: Icons.notifications_outlined,
                color: Colors.white, bg: const Color(0xFFF97316),
                onTap: () => context.go('/notifications'))),
          ]),
        ],
      );
    }
    return Row(children: [
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Issue Management',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
        Text(_loading ? 'Loading…' : '$_totalCount records',
            style: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
      ]),
      const Spacer(),
      _headerBtn(label: 'Fines', icon: Icons.currency_rupee,
          color: const Color(0xFF374151), bg: Colors.white, onTap: _calculateFines),
      const SizedBox(width: 8),
      _headerBtn(label: 'Notify', icon: Icons.notifications_outlined,
          color: Colors.white, bg: const Color(0xFFF97316),
          onTap: () => context.go('/notifications')),
    ]);
  }

  // ── Toolbar ───────────────────────────────────────────────────────────────

  Widget _buildToolbar(bool isMobile) {
    final tabs = Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(8)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        _typeTab('all', 'All'),
        _typeTab('active', 'Active'),
        _typeTab('overdue', 'Overdue'),
      ]),
    );

    final sortRow = Row(mainAxisSize: MainAxisSize.min, children: [
      _sortDropdown(),
      const SizedBox(width: 6),
      GestureDetector(
        onTap: () { setState(() => _order = _order == 'ASC' ? 'DESC' : 'ASC'); _resetPage(); },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFE5E7EB)),
              borderRadius: BorderRadius.circular(8)),
          child: Text(_order == 'ASC' ? '↑ Asc' : '↓ Desc',
              style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
        ),
      ),
      const SizedBox(width: 6),
      _filterToggleBtn(),
    ]);

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5E7EB))),
      child: isMobile
          ? Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              tabs,
              const SizedBox(height: 10),
              sortRow,
            ])
          : Row(children: [tabs, const Spacer(), sortRow]),
    );
  }

  Widget _filterToggleBtn() {
    return GestureDetector(
      onTap: () => setState(() => _filtersOpen = !_filtersOpen),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: _filtersOpen || _activeFilterCount > 0 ? const Color(0xFFEFF6FF) : Colors.white,
          border: Border.all(
              color: _filtersOpen || _activeFilterCount > 0
                  ? const Color(0xFF93C5FD) : const Color(0xFFE5E7EB)),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.tune, size: 14, color: Color(0xFF6B7280)),
          const SizedBox(width: 4),
          const Text('Filters', style: TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
          if (_activeFilterCount > 0) ...[
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(color: const Color(0xFF2563EB), borderRadius: BorderRadius.circular(10)),
              child: Text('$_activeFilterCount',
                  style: const TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.w700)),
            ),
          ],
          const SizedBox(width: 4),
          Icon(_filtersOpen ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
              size: 14, color: const Color(0xFF9CA3AF)),
        ]),
      ),
    );
  }

  // ── Filter Panel ──────────────────────────────────────────────────────────

  Widget _buildFilterPanel(bool isMobile) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5E7EB))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (isMobile) ...[
          _filterSearchField(
            label: 'Borrower', controller: _borrowerCtrl,
            loading: _searchingBorrower, selected: _selBorrower != null,
            onChanged: _onBorrowerChanged,
            onClear: () { setState(() { _selBorrower = null; _borrowerCtrl.clear(); }); _resetPage(); },
            results: _showBorrowerDrop && _borrowerResults.isNotEmpty && _selBorrower == null ? _borrowerResults : null,
            onSelectResult: (b) => _selectBorrower(b as Map<String, dynamic>),
            resultTitle: (b) => b['borrower_name'] ?? '', resultSub: (b) => 'ID: ${b['borrower_id']}',
          ),
          const SizedBox(height: 10),
          _filterSearchField(
            label: 'Book', controller: _bookCtrl,
            loading: _searchingBook, selected: _selBook != null,
            onChanged: _onBookChanged,
            onClear: () { setState(() { _selBook = null; _bookCtrl.clear(); }); _resetPage(); },
            results: _showBookDrop && _bookResults.isNotEmpty && _selBook == null ? _bookResults : null,
            onSelectResult: (b) => _selectBook(b as Map<String, dynamic>),
            resultTitle: (b) => b['title'] ?? '', resultSub: (b) => 'ISBN: ${b['isbn']}',
          ),
        ] else
          Row(children: [
            Expanded(child: _filterSearchField(
              label: 'Borrower', controller: _borrowerCtrl,
              loading: _searchingBorrower, selected: _selBorrower != null,
              onChanged: _onBorrowerChanged,
              onClear: () { setState(() { _selBorrower = null; _borrowerCtrl.clear(); }); _resetPage(); },
              results: _showBorrowerDrop && _borrowerResults.isNotEmpty && _selBorrower == null ? _borrowerResults : null,
              onSelectResult: (b) => _selectBorrower(b as Map<String, dynamic>),
              resultTitle: (b) => b['borrower_name'] ?? '', resultSub: (b) => 'ID: ${b['borrower_id']}',
            )),
            const SizedBox(width: 10),
            Expanded(child: _filterSearchField(
              label: 'Book', controller: _bookCtrl,
              loading: _searchingBook, selected: _selBook != null,
              onChanged: _onBookChanged,
              onClear: () { setState(() { _selBook = null; _bookCtrl.clear(); }); _resetPage(); },
              results: _showBookDrop && _bookResults.isNotEmpty && _selBook == null ? _bookResults : null,
              onSelectResult: (b) => _selectBook(b as Map<String, dynamic>),
              resultTitle: (b) => b['title'] ?? '', resultSub: (b) => 'ISBN: ${b['isbn']}',
            )),
          ]),
        const SizedBox(height: 14),
        if (isMobile) ...[
          _filterGroup('Return Status', [
            _filterPill('', 'All', _statusFilter, (v) { setState(() => _statusFilter = v); _resetPage(); }),
            _filterPill('issued', 'Issued', _statusFilter, (v) { setState(() => _statusFilter = v); _resetPage(); }, activeColor: const Color(0xFF2563EB)),
            _filterPill('returned', 'Returned', _statusFilter, (v) { setState(() => _statusFilter = v); _resetPage(); }, activeColor: const Color(0xFF10B981)),
          ]),
          const SizedBox(height: 10),
          _filterGroup('Fine', [
            _filterPill('', 'All', _fineFilter, (v) { setState(() => _fineFilter = v); _resetPage(); }),
            _filterPill('has_fine', 'Has Fine', _fineFilter, (v) { setState(() => _fineFilter = v); _resetPage(); }, activeColor: const Color(0xFFEF4444)),
            _filterPill('no_fine', 'No Fine', _fineFilter, (v) { setState(() => _fineFilter = v); _resetPage(); }),
          ]),
        ] else
          Row(children: [
            Expanded(child: _filterGroup('Return Status', [
              _filterPill('', 'All', _statusFilter, (v) { setState(() => _statusFilter = v); _resetPage(); }),
              _filterPill('issued', 'Issued', _statusFilter, (v) { setState(() => _statusFilter = v); _resetPage(); }, activeColor: const Color(0xFF2563EB)),
              _filterPill('returned', 'Returned', _statusFilter, (v) { setState(() => _statusFilter = v); _resetPage(); }, activeColor: const Color(0xFF10B981)),
            ])),
            const SizedBox(width: 10),
            Expanded(child: _filterGroup('Fine', [
              _filterPill('', 'All', _fineFilter, (v) { setState(() => _fineFilter = v); _resetPage(); }),
              _filterPill('has_fine', 'Has Fine', _fineFilter, (v) { setState(() => _fineFilter = v); _resetPage(); }, activeColor: const Color(0xFFEF4444)),
              _filterPill('no_fine', 'No Fine', _fineFilter, (v) { setState(() => _fineFilter = v); _resetPage(); }),
            ])),
          ]),
        if (_activeFilterCount > 0) ...[
          const SizedBox(height: 12),
          const Divider(color: Color(0xFFF3F4F6)),
          const SizedBox(height: 8),
          Wrap(spacing: 6, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
            const Text('Active:', style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
            if (_selBorrower != null)
              _chip('👤 ${_selBorrower!['borrower_name']}',
                  () { setState(() { _selBorrower = null; _borrowerCtrl.clear(); }); _resetPage(); }),
            if (_selBook != null)
              _chip('📚 ${_selBook!['title']}',
                  () { setState(() { _selBook = null; _bookCtrl.clear(); }); _resetPage(); }),
            if (_statusFilter.isNotEmpty)
              _chip(_statusFilter, () { setState(() => _statusFilter = ''); _resetPage(); }),
            if (_fineFilter.isNotEmpty)
              _chip(_fineFilter == 'has_fine' ? 'Has fine' : 'No fine',
                  () { setState(() => _fineFilter = ''); _resetPage(); }),
            GestureDetector(
              onTap: _clearAllFilters,
              child: const Text('Clear all', style: TextStyle(fontSize: 11, color: Color(0xFFEF4444))),
            ),
          ]),
        ],
      ]),
    );
  }

  // ── Mobile card list ──────────────────────────────────────────────────────

  Widget _buildCardList() {
    return Column(children: _issues.map<Widget>((issue) {
      final sl      = _statusLabel(issue as Map<String, dynamic>);
      final isOvrd  = sl.label == 'Overdue';
      final authors = (issue['Copy']?['Book']?['Authors'] as List?)
          ?.map((a) => a['author_name'] as String? ?? '').join(', ') ?? '—';

      return Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isOvrd ? const Color(0xFFFECACA) : const Color(0xFFE5E7EB)),
        ),
        child: Column(children: [
          // Card header
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(issue['Copy']?['Book']?['title'] ?? '—',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF111827)),
                      maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  Text(authors,
                      style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                ])),
                const SizedBox(width: 10),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                        color: sl.bg, borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: sl.border)),
                    child: Text(sl.label,
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: sl.text)),
                  ),
                  if ((issue['fine'] ?? 0) > 0) ...[
                    const SizedBox(height: 4),
                    Text('₹${issue['fine']}',
                        style: const TextStyle(fontSize: 11, color: Color(0xFFEF4444), fontWeight: FontWeight.w700)),
                  ],
                ]),
              ],
            ),
          ),
          // Divider
          const Divider(height: 1, color: Color(0xFFF3F4F6)),
          // Card body — info grid
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
            child: Column(children: [
              _infoRow('Borrower', '${issue['Borrower']?['borrower_name'] ?? '—'}  #${issue['borrower_id']}'),
              const SizedBox(height: 6),
              Row(children: [
                Expanded(child: _infoRow('Copy', issue['Copy']?['copy_code'] ?? '—')),
                Expanded(child: _infoRow('ISBN', issue['Copy']?['Book']?['isbn'] ?? '—')),
              ]),
              const SizedBox(height: 6),
              Row(children: [
                Expanded(child: _infoRow('Issued', _fmt(issue['check_out']))),
                Expanded(child: _infoRow('Due', _fmt(issue['due_date']),
                    valueColor: isOvrd ? const Color(0xFFEF4444) : null)),
              ]),
              if (isOvrd) ...[
                const SizedBox(height: 4),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(6)),
                  child: Text('${_daysOverdue(issue['due_date'])} days overdue',
                      style: const TextStyle(fontSize: 11, color: Color(0xFFEF4444), fontWeight: FontWeight.w600)),
                ),
              ],
              if (issue['check_in'] != null) ...[
                const SizedBox(height: 6),
                _infoRow('Returned', _fmt(issue['check_in'])),
              ],
            ]),
          ),
          // Card footer — actions
          Container(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 12),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Color(0xFFF3F4F6))),
            ),
            child: Row(children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => context.go('/reports/${issue['issue_id']}'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFBFDBFE))),
                    child: const Center(
                      child: Text('View Details',
                          style: TextStyle(fontSize: 12, color: Color(0xFF2563EB), fontWeight: FontWeight.w600)),
                    ),
                  ),
                ),
              ),
              if (isOvrd) ...[
                const SizedBox(width: 8),
                Expanded(
                  child: GestureDetector(
                    onTap: () => _sendNotification(issue['issue_id']),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                          color: const Color(0xFFFFF7ED),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFFED7AA))),
                      child: const Center(
                        child: Text('Send Notify',
                            style: TextStyle(fontSize: 12, color: Color(0xFFF97316), fontWeight: FontWeight.w600)),
                      ),
                    ),
                  ),
                ),
              ],
            ]),
          ),
        ]),
      );
    }).toList());
  }

  Widget _infoRow(String label, String value, {Color? valueColor}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w500)),
      const SizedBox(height: 1),
      Text(value,
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
              color: valueColor ?? const Color(0xFF374151)),
          maxLines: 1, overflow: TextOverflow.ellipsis),
    ]);
  }

  // ── Desktop table ─────────────────────────────────────────────────────────

  Widget _buildTable() {
    return Container(
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5E7EB))),
      child: Column(children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            headingRowHeight: 40,
            dataRowMinHeight: 56,
            dataRowMaxHeight: 72,
            headingRowColor: WidgetStateProperty.all(const Color(0xFFF9FAFB)),
            columnSpacing: 16,
            horizontalMargin: 16,
            columns: [
              const DataColumn(label: _TableHeader(label: 'Book')),
              const DataColumn(label: _TableHeader(label: 'Authors')),
              const DataColumn(label: _TableHeader(label: 'Copy')),
              const DataColumn(label: _TableHeader(label: 'Borrower')),
              DataColumn(label: _SortableHeader(label: 'Issue Date', field: 'check_out', sortBy: _sortBy, order: _order, onTap: () => _toggleSort('check_out'))),
              DataColumn(label: _SortableHeader(label: 'Due Date',   field: 'due_date',  sortBy: _sortBy, order: _order, onTap: () => _toggleSort('due_date'))),
              DataColumn(label: _SortableHeader(label: 'Returned',   field: 'check_in',  sortBy: _sortBy, order: _order, onTap: () => _toggleSort('check_in'))),
              const DataColumn(label: _TableHeader(label: 'Status')),
              const DataColumn(label: Text('')),
            ],
            rows: _issues.map((issue) {
              final sl      = _statusLabel(issue as Map<String, dynamic>);
              final isOvrd  = sl.label == 'Overdue';
              final authors = (issue['Copy']?['Book']?['Authors'] as List?)
                  ?.map((a) => a['author_name'] as String? ?? '').join(', ') ?? '—';

              return DataRow(cells: [
                DataCell(SizedBox(width: 120, child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text(issue['Copy']?['Book']?['title'] ?? '—',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                      maxLines: 2, overflow: TextOverflow.ellipsis),
                  Text(issue['Copy']?['Book']?['isbn'] ?? '',
                      style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF))),
                ]))),
                DataCell(SizedBox(width: 100, child: Text(authors,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                    maxLines: 2, overflow: TextOverflow.ellipsis))),
                DataCell(Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(4)),
                  child: Text(issue['Copy']?['copy_code'] ?? '—',
                      style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Color(0xFF374151))),
                )),
                DataCell(Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text(issue['Borrower']?['borrower_name'] ?? '—',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                  Text('#${issue['borrower_id']}',
                      style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF))),
                ])),
                DataCell(Text(_fmt(issue['check_out']), style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)))),
                DataCell(Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text(_fmt(issue['due_date']), style: const TextStyle(fontSize: 11, color: Color(0xFF374151))),
                  if (isOvrd)
                    Text('${_daysOverdue(issue['due_date'])}d overdue',
                        style: const TextStyle(fontSize: 10, color: Color(0xFFEF4444), fontWeight: FontWeight.w600)),
                ])),
                DataCell(Text(_fmt(issue['check_in']), style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)))),
                DataCell(Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(color: sl.bg, borderRadius: BorderRadius.circular(20), border: Border.all(color: sl.border)),
                    child: Text(sl.label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: sl.text)),
                  ),
                  if ((issue['fine'] ?? 0) > 0)
                    Text('₹${issue['fine']}',
                        style: const TextStyle(fontSize: 10, color: Color(0xFFEF4444), fontWeight: FontWeight.w600)),
                ])),
                DataCell(Row(mainAxisSize: MainAxisSize.min, children: [
                  GestureDetector(
                    onTap: () => context.go('/reports/${issue['issue_id']}'),
                    child: const Text('View', style: TextStyle(fontSize: 11, color: Color(0xFF2563EB), fontWeight: FontWeight.w500)),
                  ),
                  if (isOvrd) ...[
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: () => _sendNotification(issue['issue_id']),
                      child: const Text('Notify', style: TextStyle(fontSize: 11, color: Color(0xFFF97316), fontWeight: FontWeight.w500)),
                    ),
                  ],
                ])),
              ]);
            }).toList(),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: const BoxDecoration(border: Border(top: BorderSide(color: Color(0xFFF3F4F6)))),
          child: Text('Page $_page of $_totalPages · $_totalCount total records',
              style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
        ),
      ]),
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5E7EB))),
      child: Column(children: [
        const Icon(Icons.menu_book_outlined, size: 40, color: Color(0xFFE5E7EB)),
        const SizedBox(height: 12),
        Text(
          _activeFilterCount > 0 ? 'No issues match your filters' : 'No issues found',
          style: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)),
        ),
        if (_activeFilterCount > 0) ...[
          const SizedBox(height: 8),
          GestureDetector(onTap: _clearAllFilters,
              child: const Text('Clear filters', style: TextStyle(fontSize: 12, color: Color(0xFF2563EB)))),
        ],
      ]),
    );
  }

  // ── Error banner ──────────────────────────────────────────────────────────

  Widget _buildErrorBanner() {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
          color: const Color(0xFFFEF2F2),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFFECACA))),
      child: Row(children: [
        Expanded(child: Text(_error!, style: const TextStyle(color: Color(0xFF991B1B), fontSize: 12))),
        GestureDetector(
          onTap: () => setState(() => _error = null),
          child: const Text('Dismiss',
              style: TextStyle(color: Color(0xFF991B1B), fontSize: 12, decoration: TextDecoration.underline)),
        ),
      ]),
    );
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  Widget _buildPagination(bool isMobile) {
    final pageNums = List.generate(
      _totalPages <= 5 ? _totalPages : 5,
      (i) {
        if (_totalPages <= 5) return i + 1;
        if (_page <= 3) return i + 1;
        if (_page >= _totalPages - 2) return _totalPages - 4 + i;
        return _page - 2 + i;
      },
    );

    if (isMobile) {
      return Column(children: [
        Row(mainAxisAlignment: MainAxisAlignment.center, children: pageNums.map((p) {
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 3),
            child: GestureDetector(
              onTap: () { setState(() => _page = p); _fetchIssues(); },
              child: Container(
                width: 36, height: 36,
                decoration: BoxDecoration(
                  color: _page == p ? const Color(0xFF2563EB) : Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: _page == p ? const Color(0xFF2563EB) : const Color(0xFFE5E7EB)),
                ),
                child: Center(child: Text('$p',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
                        color: _page == p ? Colors.white : const Color(0xFF6B7280)))),
              ),
            ),
          );
        }).toList()),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: _pageBtn('‹ Prev', _page > 1, () { setState(() => _page--); _fetchIssues(); })),
          const SizedBox(width: 8),
          Expanded(child: _pageBtn('Next ›', _page < _totalPages, () { setState(() => _page++); _fetchIssues(); })),
        ]),
        const SizedBox(height: 6),
        Center(child: Text('Page $_page of $_totalPages',
            style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)))),
      ]);
    }

    return Row(children: [
      _pageBtn('«', _page > 1, () { setState(() => _page = 1); _fetchIssues(); }),
      const SizedBox(width: 6),
      _pageBtn('‹ Prev', _page > 1, () { setState(() => _page--); _fetchIssues(); }),
      const Spacer(),
      ...pageNums.map((p) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 2),
        child: GestureDetector(
          onTap: () { setState(() => _page = p); _fetchIssues(); },
          child: Container(
            width: 32, height: 32,
            decoration: BoxDecoration(
              color: _page == p ? const Color(0xFF2563EB) : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: _page == p ? const Color(0xFF2563EB) : Colors.transparent),
            ),
            child: Center(child: Text('$p',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500,
                    color: _page == p ? Colors.white : const Color(0xFF6B7280)))),
          ),
        ),
      )),
      const Spacer(),
      _pageBtn('Next ›', _page < _totalPages, () { setState(() => _page++); _fetchIssues(); }),
      const SizedBox(width: 6),
      _pageBtn('»', _page < _totalPages, () { setState(() => _page = _totalPages); _fetchIssues(); }),
    ]);
  }

  // ── Small widget helpers ───────────────────────────────────────────────────

  Widget _headerBtn({required String label, required IconData icon,
      required Color color, required Color bg, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: bg, borderRadius: BorderRadius.circular(8),
          border: bg == Colors.white ? Border.all(color: const Color(0xFFE5E7EB)) : null,
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: 15, color: color),
          const SizedBox(width: 5),
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: color)),
        ]),
      ),
    );
  }

  Widget _typeTab(String val, String label) {
    final active = _filterType == val;
    Color? activeBg;
    if (val == 'overdue') activeBg = const Color(0xFFEF4444);
    else if (val == 'active') activeBg = const Color(0xFF3B82F6);
    else activeBg = Colors.white;

    return GestureDetector(
      onTap: () { setState(() { _filterType = val; _page = 1; }); _fetchIssues(); },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
            color: active ? activeBg : Colors.transparent,
            borderRadius: BorderRadius.circular(6)),
        child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500,
            color: active ? Colors.white : const Color(0xFF6B7280))),
      ),
    );
  }

  Widget _sortDropdown() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFE5E7EB)),
          borderRadius: BorderRadius.circular(8)),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _sortBy,
          items: const [
            DropdownMenuItem(value: 'due_date',  child: Text('Due Date',    style: TextStyle(fontSize: 11))),
            DropdownMenuItem(value: 'check_out', child: Text('Issue Date',  style: TextStyle(fontSize: 11))),
            DropdownMenuItem(value: 'check_in',  child: Text('Return Date', style: TextStyle(fontSize: 11))),
          ],
          onChanged: (v) { if (v != null) { setState(() => _sortBy = v); _resetPage(); } },
          style: const TextStyle(fontSize: 11, color: Color(0xFF374151)),
          iconSize: 16, isDense: true,
        ),
      ),
    );
  }

  Widget _filterGroup(String label, List<Widget> pills) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
      const SizedBox(height: 6),
      Wrap(spacing: 6, runSpacing: 4, children: pills),
    ]);
  }

  Widget _filterSearchField({
    required String label,
    required TextEditingController controller,
    required bool loading,
    required bool selected,
    required ValueChanged<String> onChanged,
    required VoidCallback onClear,
    List<dynamic>? results,
    required Function(dynamic) onSelectResult,
    required String Function(dynamic) resultTitle,
    required String Function(dynamic) resultSub,
  }) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
      const SizedBox(height: 6),
      Stack(children: [
        TextField(
          controller: controller, onChanged: onChanged,
          style: const TextStyle(fontSize: 12),
          decoration: InputDecoration(
            hintText: 'Search…',
            hintStyle: const TextStyle(fontSize: 12, color: Color(0xFFD1D5DB)),
            contentPadding: const EdgeInsets.fromLTRB(10, 10, 36, 10),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF93C5FD))),
            filled: true, fillColor: Colors.white,
          ),
        ),
        Positioned(
          right: 8, top: 0, bottom: 0,
          child: Center(child: loading
            ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF9CA3AF)))
            : selected
                ? GestureDetector(onTap: onClear, child: const Icon(Icons.close, size: 14, color: Color(0xFFD1D5DB)))
                : const SizedBox.shrink()),
        ),
      ]),
      if (results != null && results.isNotEmpty)
        Container(
          margin: const EdgeInsets.only(top: 4),
          decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFFE5E7EB)),
            boxShadow: const [BoxShadow(color: Color(0x10000000), blurRadius: 6, offset: Offset(0, 3))],
          ),
          constraints: const BoxConstraints(maxHeight: 150),
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: results.length,
            itemBuilder: (_, i) => GestureDetector(
              onTap: () => onSelectResult(results[i]),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFF9FAFB)))),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(resultTitle(results[i]), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                  Text(resultSub(results[i]),   style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF))),
                ]),
              ),
            ),
          ),
        ),
    ]);
  }

  Widget _filterPill(String val, String label, String current, ValueChanged<String> onChange, {Color? activeColor}) {
    final active = current == val;
    final color  = activeColor ?? const Color(0xFF374151);
    return GestureDetector(
      onTap: () => onChange(val),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: active ? color.withOpacity(0.1) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: active ? color.withOpacity(0.4) : const Color(0xFFE5E7EB)),
        ),
        child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500,
            color: active ? color : const Color(0xFF6B7280))),
      ),
    );
  }

  Widget _chip(String label, VoidCallback onRemove) {
    return Container(
      padding: const EdgeInsets.fromLTRB(8, 4, 4, 4),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFBFDBFE)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF2563EB))),
        const SizedBox(width: 4),
        GestureDetector(onTap: onRemove,
            child: const Icon(Icons.close, size: 12, color: Color(0xFF93C5FD))),
      ]),
    );
  }

  Widget _pageBtn(String label, bool enabled, VoidCallback onTap) {
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFE5E7EB)),
            borderRadius: BorderRadius.circular(8)),
        child: Center(child: Text(label, style: TextStyle(fontSize: 12,
            color: enabled ? const Color(0xFF374151) : const Color(0xFFD1D5DB)))),
      ),
    );
  }
}

// ── Table header widgets ──────────────────────────────────────────────────────

class _TableHeader extends StatelessWidget {
  final String label;
  const _TableHeader({required this.label});

  @override
  Widget build(BuildContext context) => Text(label,
      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700,
          color: Color(0xFF9CA3AF), letterSpacing: 0.4));
}

class _SortableHeader extends StatelessWidget {
  final String label, field, sortBy, order;
  final VoidCallback onTap;
  const _SortableHeader({required this.label, required this.field,
      required this.sortBy, required this.order, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final active = sortBy == field;
    return GestureDetector(
      onTap: onTap,
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700,
            color: active ? const Color(0xFF2563EB) : const Color(0xFF9CA3AF), letterSpacing: 0.4)),
        const SizedBox(width: 4),
        Icon(active ? (order == 'ASC' ? Icons.arrow_upward : Icons.arrow_downward) : Icons.unfold_more,
            size: 12, color: active ? const Color(0xFF2563EB) : const Color(0xFFD1D5DB)),
      ]),
    );
  }
}