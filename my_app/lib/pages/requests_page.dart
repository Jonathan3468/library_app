// lib/pages/requests_page.dart
import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api.dart';
import '../utils/auth.dart';

class RequestsPage extends StatefulWidget {
  const RequestsPage({super.key});

  @override
  State<RequestsPage> createState() => _RequestsPageState();
}

class _RequestsPageState extends State<RequestsPage> {
  int _tab = 0; // 0 = create, 1 = view

  // ── Create form state ────────────────────────────────────────────────────
  final _borrowerCtrl = TextEditingController();
  final _bookCtrl     = TextEditingController();
  final _copyCodeCtrl = TextEditingController();

  Map<String, dynamic>? _selectedBorrower;
  Map<String, dynamic>? _selectedBook;
  Map<String, dynamic>? _selectedCopy;

  List<dynamic> _borrowerResults = [];
  List<dynamic> _bookResults     = [];
  List<dynamic> _copies          = [];

  bool _showBorrowerDrop  = false;
  bool _showBookDrop      = false;
  bool _searchingBorrower = false;
  bool _searchingBook     = false;
  bool _loadingCopies     = false;
  bool _creating          = false;

  Map<String, dynamic>? _createResult;

  Timer? _borrowerTimer;
  Timer? _bookTimer;

  // ── View state ───────────────────────────────────────────────────────────
  List<dynamic> _requests   = [];
  bool _viewLoading         = false;
  String _statusFilter      = 'pending';
  Set<int> _notifyingIds    = {};

  @override
  void initState() {
    super.initState();
    if (AuthService.isMember()) {
      final id = AuthService.getBorrowerId();
      if (id != null) _loadMemberBorrower(id);
    }
  }

  @override
  void dispose() {
    _borrowerTimer?.cancel();
    _bookTimer?.cancel();
    _borrowerCtrl.dispose();
    _bookCtrl.dispose();
    _copyCodeCtrl.dispose();
    super.dispose();
  }

  // ── Data fetchers ─────────────────────────────────────────────────────────

  Future<void> _loadMemberBorrower(dynamic id) async {
    try {
      final res = await ApiService.get('/borrowers/$id');
      if (!mounted) return;
      setState(() => _selectedBorrower = res.data['borrower'] ?? res.data);
    } catch (_) {}
  }

  void _onBorrowerChanged(String val) {
    if (_selectedBorrower != null) setState(() => _selectedBorrower = null);
    _borrowerTimer?.cancel();
    if (val.length < 2) {
      setState(() { _borrowerResults = []; _showBorrowerDrop = false; });
      return;
    }
    _borrowerTimer = Timer(const Duration(milliseconds: 300), () {
      if (RegExp(r'^\d+$').hasMatch(val)) {
        _lookupByRfId(val);
      } else {
        _searchBorrowers(val);
      }
    });
  }

  Future<void> _lookupByRfId(String rfId) async {
    if (!mounted) return;
    setState(() => _searchingBorrower = true);
    try {
      final res = await ApiService.get('/borrowers/rf/$rfId');
      if (!mounted) return;
      if (res.data['borrower'] != null) {
        _selectBorrower(res.data['borrower']);
      } else {
        _searchBorrowers(rfId);
      }
    } catch (_) {
      if (!mounted) return;
      _searchBorrowers(rfId);
    } finally {
      if (mounted) setState(() => _searchingBorrower = false);
    }
  }

  Future<void> _searchBorrowers(String q) async {
    if (!mounted) return;
    setState(() => _searchingBorrower = true);
    try {
      final res = await ApiService.get('/borrowers/search?q=$q');
      if (!mounted) return;
      setState(() { _borrowerResults = res.data['borrowers'] ?? []; _showBorrowerDrop = true; });
    } catch (_) {
      if (!mounted) return;
      setState(() => _borrowerResults = []);
    } finally {
      if (mounted) setState(() => _searchingBorrower = false);
    }
  }

  void _selectBorrower(Map<String, dynamic> b) {
    if (!mounted) return;
    setState(() {
      _selectedBorrower = b;
      _borrowerCtrl.text =
          '${b['borrower_name']} (${b['rf_id'] != null ? 'RF: ${b['rf_id']}' : 'ID: ${b['borrower_id']}'})';
      _showBorrowerDrop = false;
      _borrowerResults  = [];
    });
  }

  void _onBookChanged(String val) {
    if (_selectedBook != null) {
      setState(() { _selectedBook = null; _copies = []; _selectedCopy = null; });
    }
    _bookTimer?.cancel();
    if (val.length < 2) {
      setState(() { _bookResults = []; _showBookDrop = false; });
      return;
    }
    _bookTimer = Timer(const Duration(milliseconds: 300), () => _searchBooks(val));
  }

  Future<void> _searchBooks(String q) async {
    if (!mounted) return;
    setState(() => _searchingBook = true);
    try {
      final res = await ApiService.get('/search?q=${Uri.encodeComponent(q)}');
      if (!mounted) return;
      setState(() { _bookResults = res.data['results']?['books'] ?? []; _showBookDrop = true; });
    } catch (_) {
      if (!mounted) return;
      setState(() => _bookResults = []);
    } finally {
      if (mounted) setState(() => _searchingBook = false);
    }
  }

  Future<void> _selectBook(Map<String, dynamic> b) async {
    if (!mounted) return;
    setState(() {
      _selectedBook  = b;
      _bookCtrl.text = b['title'] ?? '';
      _showBookDrop  = false;
      _bookResults   = [];
      _selectedCopy  = null;
    });
    await _fetchCopies(b['book_id']);
  }

  Future<void> _fetchCopies(dynamic bookId) async {
    if (!mounted) return;
    setState(() => _loadingCopies = true);
    try {
      final res = await ApiService.get('/books/$bookId/copies');
      if (!mounted) return;
      setState(() => _copies = res.data['copies'] ?? []);
    } catch (_) {
      if (!mounted) return;
      setState(() => _copies = []);
    } finally {
      if (mounted) setState(() => _loadingCopies = false);
    }
  }

  Future<void> _fetchRequests() async {
    if (!mounted) return;
    setState(() => _viewLoading = true);
    try {
      final q   = _statusFilter.isNotEmpty ? '?status=$_statusFilter' : '';
      final res = await ApiService.get('/requests$q');
      if (!mounted) return;
      setState(() => _requests = res.data['requests'] ?? []);
    } catch (_) {}
    finally {
      if (mounted) setState(() => _viewLoading = false);
    }
  }

  Future<void> _createRequest() async {
    if (_selectedBorrower == null) { _showSnack('Please select a borrower'); return; }
    if (_selectedCopy == null && _copyCodeCtrl.text.trim().isEmpty) {
      _showSnack('Please select a copy or enter a barcode'); return;
    }
    if (!mounted) return;
    setState(() { _creating = true; _createResult = null; });
    try {
      final res = await ApiService.post('/requests', data: {
        'rf_id': _selectedBorrower!['rf_id'] ?? _selectedBorrower!['borrower_id'].toString(),
        'copy_code': _selectedCopy != null ? _selectedCopy!['copy_code'] : _copyCodeCtrl.text.trim(),
      });
      if (!mounted) return;
      setState(() => _createResult = {
        'success': true,
        'message': res.data['message'],
        'book_title': res.data['book_title'],
        'expiry_date': res.data['expiry_date'],
      });
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) { _clearForm(); setState(() => _createResult = null); }
      });
    } catch (e) {
      if (!mounted) return;
      final msg = (e as dynamic).response?.data?['error'] ?? 'Failed to create request';
      setState(() => _createResult = { 'success': false, 'message': msg });
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  void _clearForm() {
    if (!mounted) return;
    _bookCtrl.clear();
    _copyCodeCtrl.clear();
    setState(() {
      _selectedBook = null; _selectedCopy = null; _copies = []; _bookResults = [];
    });
    if (!AuthService.isMember()) {
      _borrowerCtrl.clear();
      setState(() { _selectedBorrower = null; _borrowerResults = []; });
    }
  }

  Future<void> _requestAction(String type, int requestId) async {
    final labels = {
      'cancel':  ('Cancel Request?',  'This reservation will be permanently cancelled.', 'Yes, Cancel', const Color(0xFFEF4444)),
      'fulfill': ('Fulfill Request?', 'This will issue the book to the borrower.',        'Issue Book',  const Color(0xFF10B981)),
      'notify':  ('Notify Borrower?', 'An availability email will be sent.',              'Send',        const Color(0xFF2563EB)),
    };
    final cfg = labels[type]!;

    // FIX: capture context before await — showDialog is fine with mounted check after
    if (!mounted) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => _ConfirmDialog(
        title: cfg.$1, description: cfg.$2, confirmLabel: cfg.$3, confirmColor: cfg.$4,
      ),
    );
    // FIX: mounted check immediately after the async gap
    if (!mounted || confirmed != true) return;

    try {
      if (type == 'cancel') {
        await ApiService.delete('/requests/$requestId');
        if (!mounted) return;
        _showSnack('Request cancelled');
      } else if (type == 'fulfill') {
        final res = await ApiService.post('/requests/$requestId/fulfill');
        if (!mounted) return;
        _showSnack('${res.data['message']}');
      } else if (type == 'notify') {
        setState(() => _notifyingIds = {..._notifyingIds, requestId});
        final res = await ApiService.post('/notifications/send-request-available/$requestId');
        if (!mounted) return;
        _showSnack(res.data['sent'] == true ? 'Notification sent!' : res.data['message'] ?? 'Failed');
        setState(() => _notifyingIds = _notifyingIds.where((e) => e != requestId).toSet());
      }
      _fetchRequests();
    } catch (e) {
      if (!mounted) return;
      _showSnack('Action failed');
    }
  }

  void _showSnack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final isMember = AuthService.isMember();

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      // FIX: SafeArea prevents content from rendering behind status bar / notch
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Book Requests',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
              const SizedBox(height: 2),
              const Text('Reserve and manage book requests',
                  style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
              const SizedBox(height: 20),

              // Tabs
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _tabBtn(0, 'Create Request'),
                    if (!isMember) _tabBtn(1, 'View Requests'),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              if (_tab == 0) _buildCreateTab(isMember),
              if (_tab == 1 && !isMember) _buildViewTab(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _tabBtn(int index, String label) {
    final active = _tab == index;
    return GestureDetector(
      onTap: () {
        setState(() => _tab = index);
        if (index == 1) _fetchRequests();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: active ? const Color(0xFF2563EB) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: active ? Colors.white : const Color(0xFF6B7280),
          ),
        ),
      ),
    );
  }

  // ── Create tab ────────────────────────────────────────────────────────────

  Widget _buildCreateTab(bool isMember) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Request a Book',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
          const SizedBox(height: 4),
          const Text('Create a reservation for a currently issued book',
              style: TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
          const SizedBox(height: 20),

          if (isMember && _selectedBorrower != null)
            _infoBox(
              label: 'Requesting as',
              title: _selectedBorrower!['borrower_name'] ?? '',
              subtitle: _selectedBorrower!['rf_id'] != null
                  ? 'RF ID: ${_selectedBorrower!['rf_id']}'
                  : null,
            )
          else if (!isMember)
            _SearchField(
              controller: _borrowerCtrl,
              label: 'Borrower',
              placeholder: 'Scan RF ID or search by name…',
              loading: _searchingBorrower,
              showClear: _selectedBorrower != null,
              onChanged: _onBorrowerChanged,
              onClear: () {
                setState(() { _selectedBorrower = null; _borrowerCtrl.clear(); });
              },
              dropdown: _showBorrowerDrop && _borrowerResults.isNotEmpty && _selectedBorrower == null
                  ? _borrowerResults.map<Widget>((b) => _DropItem(
                        title: b['borrower_name'] ?? '',
                        subtitle: 'ID: ${b['borrower_id']}${b['rf_id'] != null ? ' · RF: ${b['rf_id']}' : ''}',
                        onTap: () => _selectBorrower(b as Map<String, dynamic>),
                      )).toList()
                  : null,
              selected: _selectedBorrower != null
                  ? '${_selectedBorrower!['borrower_name']}  ·  ID: ${_selectedBorrower!['borrower_id']}'
                  : null,
            ),

          const SizedBox(height: 20),
          const Divider(color: Color(0xFFF3F4F6)),
          const SizedBox(height: 16),

          const Text('Select Book & Copy',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(0xFF374151))),
          const SizedBox(height: 12),

          _SearchField(
            controller: _bookCtrl,
            label: 'Search by title or ISBN',
            placeholder: 'Start typing…',
            loading: _searchingBook,
            showClear: _selectedBook != null,
            onChanged: _onBookChanged,
            onClear: () {
              setState(() {
                _selectedBook = null; _bookCtrl.clear();
                _copies = []; _selectedCopy = null;
              });
            },
            dropdown: _showBookDrop && _bookResults.isNotEmpty && _selectedBook == null
                ? _bookResults.map<Widget>((b) => _DropItem(
                      title: b['title'] ?? '',
                      subtitle: 'ISBN: ${b['isbn']} · ${b['publication_year']}',
                      onTap: () => _selectBook(b as Map<String, dynamic>),
                    )).toList()
                : null,
          ),

          if (_selectedBook != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Expanded(child: Text(_selectedBook!['title'] ?? '',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                        overflow: TextOverflow.ellipsis)),
                    if (_loadingCopies)
                      const SizedBox(width: 16, height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2563EB))),
                  ]),
                  const SizedBox(height: 10),
                  if (_copies.isEmpty && !_loadingCopies)
                    const Text('No copies available for this book',
                        style: TextStyle(fontSize: 12, color: Color(0xFFEF4444)))
                  else ...[
                    const Text('Select an issued copy to reserve:',
                        style: TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                    const SizedBox(height: 8),
                    ..._copies.map((copy) {
                      final isIssued   = copy['status'] == 'Issued';
                      final isSelected = _selectedCopy?['copy_id'] == copy['copy_id'];
                      return GestureDetector(
                        onTap: isIssued ? () => setState(() => _selectedCopy = copy as Map<String, dynamic>) : null,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? const Color(0xFFEFF6FF)
                                : isIssued ? Colors.white : const Color(0xFFF3F4F6),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSelected ? const Color(0xFF93C5FD) : const Color(0xFFE5E7EB),
                            ),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Copy: ${copy['copy_code']}',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                                    Text(copy['status'] ?? '',
                                        style: TextStyle(
                                            fontSize: 11,
                                            color: isIssued ? const Color(0xFFF97316) : const Color(0xFF10B981))),
                                    if (copy['borrower']?['due_date'] != null)
                                      Text('Due: ${_fmt(copy['borrower']['due_date'])}',
                                          style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                                  ],
                                ),
                              ),
                              if (isSelected)
                                const Icon(Icons.check_circle, color: Color(0xFF2563EB), size: 18),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],
                ],
              ),
            ),
          ],

          const SizedBox(height: 16),
          Row(children: [
            const Expanded(child: Divider(color: Color(0xFFE5E7EB))),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text('OR', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey.shade400)),
            ),
            const Expanded(child: Divider(color: Color(0xFFE5E7EB))),
          ]),
          const SizedBox(height: 16),

          const Text('Scan barcode directly', style: TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
          const SizedBox(height: 6),
          TextField(
            controller: _copyCodeCtrl,
            onChanged: (v) {
              if (v.isNotEmpty) {
                setState(() { _selectedBook = null; _selectedCopy = null; _bookCtrl.clear(); });
              }
            },
            style: const TextStyle(fontSize: 13),
            decoration: _inputDec('Scan copy barcode…'),
          ),

          const SizedBox(height: 16),

          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: _creating ? null : _createRequest,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    decoration: BoxDecoration(
                      color: _creating ? const Color(0xFF93C5FD) : const Color(0xFF2563EB),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: _creating
                          ? const SizedBox(width: 18, height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Create Request',
                              style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                    ),
                  ),
                ),
              ),
              if (_selectedBook != null || _copyCodeCtrl.text.isNotEmpty) ...[
                const SizedBox(width: 10),
                GestureDetector(
                  onTap: _clearForm,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text('Clear', style: TextStyle(color: Color(0xFF6B7280), fontSize: 13)),
                  ),
                ),
              ],
            ],
          ),

          if (_createResult != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _createResult!['success'] == true
                    ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _createResult!['success'] == true
                      ? const Color(0xFFA7F3D0) : const Color(0xFFFECACA),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _createResult!['success'] == true ? 'Request Created!' : 'Error',
                    style: TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600,
                      color: _createResult!['success'] == true
                          ? const Color(0xFF065F46) : const Color(0xFF991B1B),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(_createResult!['message'] ?? '',
                      style: TextStyle(
                        fontSize: 12,
                        color: _createResult!['success'] == true
                            ? const Color(0xFF059669) : const Color(0xFFEF4444),
                      )),
                  if (_createResult!['expiry_date'] != null)
                    Text('Expires: ${_fmt(_createResult!['expiry_date'])}',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF059669))),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ── View tab ──────────────────────────────────────────────────────────────

  Widget _buildViewTab() {
    final statusColors = {
      'pending':   (const Color(0xFFFFFBEB), const Color(0xFFF59E0B), const Color(0xFF92400E)),
      'fulfilled': (const Color(0xFFECFDF5), const Color(0xFF10B981), const Color(0xFF065F46)),
      'cancelled': (const Color(0xFFFEF2F2), const Color(0xFFEF4444), const Color(0xFF991B1B)),
      'expired':   (const Color(0xFFF3F4F6), const Color(0xFF9CA3AF), const Color(0xFF374151)),
    };

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('All Requests',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
                Text('${_requests.length} records',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
              ]),
            ],
          ),
          const SizedBox(height: 14),

          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                ['', 'All'], ['pending', 'Pending'], ['fulfilled', 'Fulfilled'],
                ['cancelled', 'Cancelled'], ['expired', 'Expired'],
              ].map((e) {
                final val = e[0]; final lbl = e[1];
                final active = _statusFilter == val;
                return GestureDetector(
                  onTap: () { setState(() => _statusFilter = val); _fetchRequests(); },
                  child: Container(
                    margin: const EdgeInsets.only(right: 6),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: active ? const Color(0xFF2563EB) : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: active ? const Color(0xFF2563EB) : const Color(0xFFE5E7EB)),
                    ),
                    child: Text(lbl,
                        style: TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w500,
                            color: active ? Colors.white : const Color(0xFF6B7280))),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 16),

          if (_viewLoading)
            const Center(child: Padding(
              padding: EdgeInsets.all(32),
              child: CircularProgressIndicator(color: Color(0xFF2563EB)),
            ))
          else if (_requests.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text('No requests found', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13)),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _requests.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final req    = _requests[i];
                final status = req['status'] as String? ?? '';
                final colors = statusColors[status] ?? statusColors['expired']!;
                final isPending = status == 'pending';
                final isLib     = AuthService.isLibrarian();

                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFF3F4F6)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: colors.$1,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: colors.$2),
                                ),
                                child: Text(status,
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: colors.$3)),
                              ),
                              const SizedBox(width: 8),
                              Text('#${req['request_id']}',
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                            ]),
                            const SizedBox(height: 6),
                            Text(req['Copy']?['Book']?['title'] ?? '—',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                maxLines: 1, overflow: TextOverflow.ellipsis),
                            Text('Copy: ${req['Copy']?['copy_code'] ?? '—'}',
                                style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                            const SizedBox(height: 6),
                            // FIX: Row wrapped properly to avoid overflow on narrow screens
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(req['Borrower']?['borrower_name'] ?? '—',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                                        overflow: TextOverflow.ellipsis),
                                    Text(req['Borrower']?['email'] ?? '',
                                        style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                                        overflow: TextOverflow.ellipsis),
                                  ]),
                                ),
                                const SizedBox(width: 8),
                                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                                  Text('Req: ${_fmt(req['request_date'])}',
                                      style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF))),
                                  Text('Exp: ${_fmt(req['expiry_date'])}',
                                      style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF))),
                                ]),
                              ],
                            ),
                          ],
                        ),
                      ),
                      if (isLib && isPending) ...[
                        const SizedBox(width: 10),
                        Column(
                          children: [
                            _actionBtn('Fulfill', const Color(0xFF10B981), const Color(0xFFD1FAE5),
                                () => _requestAction('fulfill', req['request_id'])),
                            const SizedBox(height: 6),
                            _actionBtn('Notify', const Color(0xFF2563EB), const Color(0xFFDBEAFE),
                                () => _requestAction('notify', req['request_id'])),
                            const SizedBox(height: 6),
                            _actionBtn('Cancel', const Color(0xFFEF4444), const Color(0xFFFEE2E2),
                                () => _requestAction('cancel', req['request_id'])),
                          ],
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _actionBtn(String label, Color color, Color bg, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withOpacity(0.4)),
        ),
        child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: color)),
      ),
    );
  }

  Widget _infoBox({required String label, required String title, String? subtitle}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFBFDBFE)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label.toUpperCase(),
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF60A5FA), letterSpacing: 0.5)),
        const SizedBox(height: 4),
        Text(title,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1E40AF)),
            overflow: TextOverflow.ellipsis),
        if (subtitle != null)
          Text(subtitle, style: const TextStyle(fontSize: 11, color: Color(0xFF3B82F6))),
      ]),
    );
  }

  InputDecoration _inputDec(String hint) => InputDecoration(
    hintText: hint,
    hintStyle: const TextStyle(fontSize: 13, color: Color(0xFFD1D5DB)),
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF93C5FD))),
    filled: true,
    fillColor: Colors.white,
  );

  String _fmt(dynamic d) {
    if (d == null) return '—';
    final date = DateTime.tryParse(d.toString());
    if (date == null) return '—';
    return '${date.month}/${date.day}/${date.year}';
  }
}

// ── Search field with dropdown ────────────────────────────────────────────

class _SearchField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String placeholder;
  final bool loading;
  final bool showClear;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;
  final List<Widget>? dropdown;
  final String? selected;

  const _SearchField({
    required this.controller,
    required this.label,
    required this.placeholder,
    required this.loading,
    required this.showClear,
    required this.onChanged,
    required this.onClear,
    this.dropdown,
    this.selected,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(0xFF374151))),
        const SizedBox(height: 6),
        Stack(
          children: [
            TextField(
              controller: controller,
              onChanged: onChanged,
              style: const TextStyle(fontSize: 13),
              decoration: InputDecoration(
                hintText: placeholder,
                hintStyle: const TextStyle(fontSize: 13, color: Color(0xFFD1D5DB)),
                contentPadding: const EdgeInsets.fromLTRB(14, 12, 44, 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF93C5FD))),
                filled: true, fillColor: Colors.white,
              ),
            ),
            Positioned(
              right: 12, top: 0, bottom: 0,
              child: Center(
                child: loading
                    ? const SizedBox(width: 16, height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF9CA3AF)))
                    : showClear
                        ? GestureDetector(
                            onTap: onClear,
                            child: const Icon(Icons.close, size: 16, color: Color(0xFFD1D5DB)),
                          )
                        : const SizedBox.shrink(),
              ),
            ),
          ],
        ),
        if (dropdown != null && dropdown!.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E7EB)),
              boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 8, offset: Offset(0, 4))],
            ),
            child: Column(children: dropdown!),
          ),
        if (selected != null)
          Container(
            margin: const EdgeInsets.only(top: 8),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFA7F3D0)),
            ),
            child: Row(children: [
              const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 16),
              const SizedBox(width: 8),
              Expanded(
                child: Text(selected!,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF065F46)),
                    overflow: TextOverflow.ellipsis),
              ),
            ]),
          ),
      ],
    );
  }
}

class _DropItem extends StatelessWidget {
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _DropItem({required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: Color(0xFFF9FAFB))),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(0xFF1F2937)),
              overflow: TextOverflow.ellipsis),
          Text(subtitle,
              style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
              overflow: TextOverflow.ellipsis),
        ]),
      ),
    );
  }
}

// ── Confirm dialog ────────────────────────────────────────────────────────

class _ConfirmDialog extends StatelessWidget {
  final String title;
  final String description;
  final String confirmLabel;
  final Color confirmColor;

  const _ConfirmDialog({
    required this.title,
    required this.description,
    required this.confirmLabel,
    required this.confirmColor,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(title,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(description,
                style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
                textAlign: TextAlign.center),
            const SizedBox(height: 20),
            Row(children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context, false),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFFE5E7EB)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text('Cancel', style: TextStyle(color: Color(0xFF6B7280))),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context, true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: confirmColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    elevation: 0,
                  ),
                  child: Text(confirmLabel,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}