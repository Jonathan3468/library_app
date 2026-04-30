// lib/pages/fines_page.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';

class FinesPage extends StatefulWidget {
  const FinesPage({super.key});

  @override
  State<FinesPage> createState() => _FinesPageState();
}

class _FinesPageState extends State<FinesPage> {
  int _tab = 0; // 0=outstanding, 1=history, 2=stats

  List<dynamic> _fines   = [];
  List<dynamic> _history = [];
  Map<String, dynamic>? _stats;

  bool _loading = true;
  String? _error;

  // ── Outstanding modals ──────────────────────────────────────────────────
  bool _showPaymentModal    = false;
  bool _showRecalcModal     = false;
  Map<String, dynamic>? _selFine;
  String _paymentMethod     = 'cash';

  // ── Payment modal state ─────────────────────────────────────────────────
  bool _payLoading          = false;
  String? _payError;

  // ── Custom fine modal ───────────────────────────────────────────────────
  bool _showCustomModal        = false;
  String? _customError;
  bool _submitting             = false;

  final _borrowerCtrl          = TextEditingController();
  final _amountCtrl            = TextEditingController();
  final _reasonCtrl            = TextEditingController();
  Map<String, dynamic>? _selBorrower;
  List<dynamic> _borrowerResults = [];
  bool _showBorrowerDrop       = false;
  bool _searchingBorrower      = false;
  bool _markAsPaid             = false;
  bool _linkToCopy             = false;
  String _customPayMethod      = 'cash';

  final _customBookCtrl        = TextEditingController();
  List<dynamic> _customBooks   = [];
  bool _showCustomBookDrop     = false;
  Map<String, dynamic>? _selCustomBook;
  bool _searchingCustomBook    = false;
  List<dynamic> _customCopies  = [];
  Map<String, dynamic>? _selCustomCopy;
  bool _loadingCustomCopies    = false;

  // ── History filters ─────────────────────────────────────────────────────
  final _histSearchCtrl = TextEditingController();
  String _histFilter    = 'all';
  String _histSortBy    = 'date';
  String _histSortOrder = 'desc';

  Timer? _borrowerTimer;
  Timer? _bookTimer;

  @override
  void initState() {
    super.initState();
    _fetchTab();
  }

  @override
  void dispose() {
    _borrowerTimer?.cancel();
    _bookTimer?.cancel();
    _borrowerCtrl.dispose();
    _amountCtrl.dispose();
    _reasonCtrl.dispose();
    _customBookCtrl.dispose();
    _histSearchCtrl.dispose();
    super.dispose();
  }

  // ── Data ─────────────────────────────────────────────────────────────────

  Future<void> _fetchTab() async {
    if (!mounted) return;
    setState(() { _loading = true; _error = null; });
    try {
      if (_tab == 0) {
        final res = await ApiService.get('/fines/outstanding');
        if (!mounted) return;
        setState(() => _fines = res.data['issues'] ?? []);
      } else if (_tab == 1) {
        final res = await ApiService.get('/fines/history');
        if (!mounted) return;
        setState(() => _history = res.data['history'] ?? []);
      } else {
        final res = await ApiService.get('/fines/stats');
        if (!mounted) return;
        setState(() => _stats = res.data['stats']);
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Failed to load data');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Borrower search ──────────────────────────────────────────────────────

  void _onBorrowerChanged(String val) {
    if (_selBorrower != null) setState(() => _selBorrower = null);
    _borrowerTimer?.cancel();
    if (val.length < 2) { setState(() { _borrowerResults = []; _showBorrowerDrop = false; }); return; }
    _borrowerTimer = Timer(const Duration(milliseconds: 300), () {
      if (RegExp(r'^\d+$').hasMatch(val)) _lookupRfId(val);
      else _searchBorrowers(val);
    });
  }

  Future<void> _lookupRfId(String rfId) async {
    if (!mounted) return;
    setState(() => _searchingBorrower = true);
    try {
      final res = await ApiService.get('/borrowers/rf/$rfId');
      if (!mounted) return;
      if (res.data['borrower'] != null) _selectBorrower(res.data['borrower']);
      else _searchBorrowers(rfId);
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
    } finally {
      if (mounted) setState(() => _searchingBorrower = false);
    }
  }

  void _selectBorrower(Map<String, dynamic> b) {
    if (!mounted) return;
    setState(() {
      _selBorrower = b;
      _borrowerCtrl.text =
          '${b['borrower_name']} (${b['rf_id'] != null ? 'RF: ${b['rf_id']}' : 'ID: ${b['borrower_id']}'})';
      _showBorrowerDrop = false;
      _borrowerResults  = [];
    });
  }

  // ── Custom fine book search ──────────────────────────────────────────────

  void _onCustomBookChanged(String val) {
    if (_selCustomBook != null) {
      setState(() { _selCustomBook = null; _customCopies = []; _selCustomCopy = null; });
    }
    _bookTimer?.cancel();
    if (val.length < 2) { setState(() { _customBooks = []; _showCustomBookDrop = false; }); return; }
    _bookTimer = Timer(const Duration(milliseconds: 300), () async {
      if (!mounted) return;
      setState(() => _searchingCustomBook = true);
      try {
        final res = await ApiService.get('/search?q=${Uri.encodeComponent(val)}');
        if (!mounted) return;
        setState(() { _customBooks = res.data['results']?['books'] ?? []; _showCustomBookDrop = true; });
      } catch (_) {
        if (!mounted) return;
      } finally {
        if (mounted) setState(() => _searchingCustomBook = false);
      }
    });
  }

  Future<void> _selectCustomBook(Map<String, dynamic> b) async {
    if (!mounted) return;
    setState(() {
      _selCustomBook = b;
      _customBookCtrl.text = b['title'] ?? '';
      _showCustomBookDrop  = false;
      _customBooks         = [];
      _selCustomCopy       = null;
      _loadingCustomCopies = true;
    });
    try {
      final res = await ApiService.get('/books/${b['book_id']}/copies');
      if (!mounted) return;
      setState(() => _customCopies = res.data['copies'] ?? []);
    } catch (_) {
      if (!mounted) return;
      setState(() => _customCopies = []);
    } finally {
      if (mounted) setState(() => _loadingCustomCopies = false);
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  Future<void> _pay() async {
    if (_selFine == null) return;
    setState(() { _payLoading = true; _payError = null; });
    try {
      await ApiService.post('/fines/pay/${_selFine!['id']}', data: {
        'amount_paid': _selFine!['fine'],
        'payment_method': _paymentMethod,
      });
      if (!mounted) return;
      setState(() {
        _showPaymentModal = false;
        _selFine          = null;
        _payLoading       = false;
        _payError         = null;
      });
      _fetchTab();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _payLoading = false;
        _payError   = 'Payment failed. Please try again.';
      });
    }
  }

  Future<void> _waive(dynamic id, dynamic fine) async {
    final ok = await _confirm(
      title: 'Waive Fine of ₹$fine?',
      desc: 'This will mark the fine as waived.',
      confirmLabel: 'Waive',
      confirmColor: const Color(0xFFF59E0B),
    );
    if (!ok || !mounted) return;
    try {
      await ApiService.post('/fines/waive/$id', data: {'reason': 'Waived by librarian'});
      if (!mounted) return;
      _fetchTab();
    } catch (_) {
      if (!mounted) return;
      _showSnack('Waive failed');
    }
  }

  Future<void> _recalcIndividual(dynamic id) async {
    final ok = await _confirm(
      title: 'Recalculate this fine?',
      desc: 'This will update the fine amount.',
      confirmLabel: 'Recalculate',
      confirmColor: const Color(0xFF6366F1),
    );
    if (!ok || !mounted) return;
    try {
      await ApiService.post('/fines/$id/recalculate');
      if (!mounted) return;
      _fetchTab();
    } catch (_) {
      if (!mounted) return;
      _showSnack('Recalculation failed');
    }
  }

  Future<void> _recalcAll(String mode) async {
    try {
      await ApiService.post('/fines/recalculate-all', data: {'mode': mode});
      if (!mounted) return;
      setState(() => _showRecalcModal = false);
      _fetchTab();
    } catch (_) {
      if (!mounted) return;
      _showSnack('Recalculation failed');
    }
  }

  Future<void> _submitCustomFine() async {
    if (_selBorrower == null) {
      setState(() => _customError = 'Please select a borrower');
      return;
    }
    if (_amountCtrl.text.trim().isEmpty) {
      setState(() => _customError = 'Please enter an amount');
      return;
    }
    if (_reasonCtrl.text.trim().isEmpty) {
      setState(() => _customError = 'Please enter a reason');
      return;
    }
    setState(() { _submitting = true; _customError = null; });
    try {
      await ApiService.post('/fines/custom', data: {
        'borrower_id': _selBorrower!['borrower_id'],
        'amount': double.tryParse(_amountCtrl.text.trim()) ?? 0,
        'reason': _reasonCtrl.text.trim(),
        'payment_method': _customPayMethod,
        'mark_as_paid': _markAsPaid,
        'link_to_copy': _linkToCopy,
        if (_selCustomCopy != null) 'copy_code': _selCustomCopy!['copy_code'],
      });
      if (!mounted) return;
      _closeCustomModal();
      _fetchTab();
    } catch (_) {
      if (!mounted) return;
      setState(() => _customError = 'Failed to add fine. Please try again.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _closeCustomModal() {
    if (!mounted) return;
    setState(() {
      _showCustomModal = false;
      _customError     = null;
      _submitting      = false;
      _selBorrower = null; _borrowerCtrl.clear();
      _amountCtrl.clear(); _reasonCtrl.clear();
      _markAsPaid = false; _linkToCopy = false;
      _customPayMethod = 'cash';
      _selCustomBook = null; _customBookCtrl.clear();
      _customCopies = []; _selCustomCopy = null;
    });
  }

  void _closePaymentModal() {
    if (!mounted) return;
    setState(() {
      _showPaymentModal = false;
      _selFine          = null;
      _payLoading       = false;
      _payError         = null;
    });
  }

  // ── History helpers ──────────────────────────────────────────────────────

  List<dynamic> _filteredHistory() {
    var list = [..._history];
    final q = _histSearchCtrl.text.toLowerCase();
    if (q.isNotEmpty) {
      list = list.where((i) =>
          (i['borrower_name'] as String? ?? '').toLowerCase().contains(q) ||
          (i['book_title']    as String? ?? '').toLowerCase().contains(q) ||
          (i['reason']        as String? ?? '').toLowerCase().contains(q)).toList();
    }
    if (_histFilter == 'paid')             list = list.where((i) => i['status'] == 'paid').toList();
    else if (_histFilter == 'waived')      list = list.where((i) => i['status'] == 'waived').toList();
    else if (_histFilter == 'issue_fine')  list = list.where((i) => i['type'] == 'issue_fine').toList();
    else if (_histFilter == 'custom_fine') list = list.where((i) => i['type'] == 'custom_fine').toList();

    list.sort((a, b) {
      dynamic av, bv;
      if (_histSortBy == 'date') {
        av = DateTime.tryParse(a['payment_date'] ?? a['createdAt'] ?? '') ?? DateTime(0);
        bv = DateTime.tryParse(b['payment_date'] ?? b['createdAt'] ?? '') ?? DateTime(0);
      } else if (_histSortBy == 'amount') {
        av = (a['fine'] ?? a['amount'] ?? 0) as num;
        bv = (b['fine'] ?? b['amount'] ?? 0) as num;
      } else {
        av = (a['borrower_name'] as String? ?? '').toLowerCase();
        bv = (b['borrower_name'] as String? ?? '').toLowerCase();
      }
      final cmp = Comparable.compare(av as Comparable, bv as Comparable);
      return _histSortOrder == 'asc' ? cmp : -cmp;
    });
    return list;
  }

  // ── UI helpers ───────────────────────────────────────────────────────────

  Future<bool> _confirm({
    required String title, required String desc,
    required String confirmLabel, required Color confirmColor,
  }) async {
    if (!mounted) return false;
    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(title,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(desc,
                style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
                textAlign: TextAlign.center),
            const SizedBox(height: 20),
            Row(children: [
              Expanded(child: OutlinedButton(
                onPressed: () => Navigator.pop(dialogContext, false),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFE5E7EB)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(vertical: 11),
                ),
                child: const Text('Cancel', style: TextStyle(color: Color(0xFF6B7280))),
              )),
              const SizedBox(width: 10),
              Expanded(child: ElevatedButton(
                onPressed: () => Navigator.pop(dialogContext, true),
                style: ElevatedButton.styleFrom(
                  backgroundColor: confirmColor,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(vertical: 11),
                  elevation: 0,
                ),
                child: Text(confirmLabel,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
              )),
            ]),
          ]),
        ),
      ),
    );
    return result == true;
  }

  void _showSnack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  String _fmt(dynamic d) {
    if (d == null) return '—';
    final dt = DateTime.tryParse(d.toString());
    if (dt == null) return '—';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final isMobile = constraints.maxWidth < 700;
      return Scaffold(
        backgroundColor: const Color(0xFFF9FAFB),
        resizeToAvoidBottomInset: false,
        body: Stack(
          children: [
            SafeArea(
              child: SingleChildScrollView(
                padding: EdgeInsets.all(isMobile ? 14 : 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeader(isMobile),
                    const SizedBox(height: 16),
                    if (_error != null) _buildErrorBanner(),
                    _buildTabs(isMobile),
                    const SizedBox(height: 16),
                    if (_loading)
                      const Center(child: Padding(
                        padding: EdgeInsets.all(40),
                        child: CircularProgressIndicator(color: Color(0xFF2563EB)),
                      ))
                    else if (_tab == 0) _buildOutstanding(isMobile)
                    else if (_tab == 1) _buildHistory(isMobile)
                    else                _buildStats(),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
            if (_showRecalcModal)  _buildRecalcModal(),
            if (_showPaymentModal) _buildPaymentModal(),
            if (_showCustomModal)  _buildCustomFineModal(),
          ],
        ),
      );
    });
  }

  // ── Header ────────────────────────────────────────────────────────────────

  Widget _buildHeader(bool isMobile) {
    if (isMobile) {
      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Fine Management',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
        const SizedBox(height: 2),
        const Text('Track, collect and manage borrower fines',
            style: TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: _headerBtn(label: 'Recalculate', icon: Icons.refresh_rounded,
              color: const Color(0xFF374151), bg: Colors.white,
              onTap: () => setState(() => _showRecalcModal = true))),
          const SizedBox(width: 8),
          Expanded(child: _headerBtn(label: 'Add Fine', icon: Icons.add_rounded,
              color: Colors.white, bg: const Color(0xFF7C3AED),
              onTap: () => setState(() { _showCustomModal = true; _customError = null; }))),
        ]),
      ]);
    }
    return Row(children: [
      const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Fine Management',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
        SizedBox(height: 2),
        Text('Track, collect and manage borrower fines',
            style: TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
      ]),
      const Spacer(),
      _headerBtn(label: 'Recalculate', icon: Icons.refresh_rounded,
          color: const Color(0xFF374151), bg: Colors.white,
          onTap: () => setState(() => _showRecalcModal = true)),
      const SizedBox(width: 8),
      _headerBtn(label: 'Add Fine', icon: Icons.add_rounded,
          color: Colors.white, bg: const Color(0xFF7C3AED),
          onTap: () => setState(() { _showCustomModal = true; _customError = null; })),
    ]);
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  Widget _buildTabs(bool isMobile) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: isMobile
          ? Row(children: [
              Expanded(child: _tabBtn(0, 'Outstanding', Icons.currency_rupee, const Color(0xFFEF4444))),
              Expanded(child: _tabBtn(1, 'History', Icons.receipt_long, const Color(0xFF10B981))),
              Expanded(child: _tabBtn(2, 'Stats', Icons.bar_chart, const Color(0xFF2563EB))),
            ])
          : Row(mainAxisSize: MainAxisSize.min, children: [
              _tabBtn(0, 'Outstanding', Icons.currency_rupee, const Color(0xFFEF4444)),
              _tabBtn(1, 'History', Icons.receipt_long, const Color(0xFF10B981)),
              _tabBtn(2, 'Statistics', Icons.bar_chart, const Color(0xFF2563EB)),
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
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Text(_error!, style: const TextStyle(color: Color(0xFF991B1B), fontSize: 12)),
    );
  }

  // ── Outstanding tab ───────────────────────────────────────────────────────

  Widget _buildOutstanding(bool isMobile) {
    if (_fines.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(40),
        decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: const Column(children: [
          Icon(Icons.check_circle_outline, size: 40, color: Color(0xFFE5E7EB)),
          SizedBox(height: 10),
          Text('No outstanding fines',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF9CA3AF))),
        ]),
      );
    }
    return isMobile ? _buildOutstandingCards() : _buildOutstandingTable();
  }

  Widget _buildOutstandingCards() {
    return Column(children: _fines.map<Widget>((fine) {
      final isCustom  = fine['type'] == 'custom_fine';
      final isOverdue = fine['due_date'] != null &&
          DateTime.tryParse(fine['due_date'].toString())?.isBefore(DateTime.now()) == true;
      final fineId = fine['display_id'] ?? fine['issue_id'];

      return Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: isCustom ? const Color(0xFFF5F3FF) : const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(isCustom ? 'Custom' : 'Late Return',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700,
                            color: isCustom ? const Color(0xFF7C3AED) : const Color(0xFF2563EB))),
                  ),
                  const SizedBox(width: 8),
                  Text('#$fineId',
                      style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF), fontFamily: 'monospace')),
                ]),
                const SizedBox(height: 6),
                Text(fine['borrower_name'] ?? '—',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF111827))),
                Text('Borrower #${fine['borrower_id']}',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
              ])),
              Text('₹${fine['fine']}',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFFEF4444))),
            ]),
          ),
          const Divider(height: 1, color: Color(0xFFF3F4F6)),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
            child: Column(children: [
              if (fine['book_title'] != null && fine['book_title'] != 'N/A')
                _mobileInfoRow('Book', fine['book_title']),
              if (fine['copy_code'] != null && fine['copy_code'] != 'N/A') ...[
                const SizedBox(height: 6),
                _mobileInfoRow('Copy', fine['copy_code']),
              ],
              if (fine['reason'] != null) ...[
                const SizedBox(height: 6),
                _mobileInfoRow('Reason', fine['reason']),
              ],
              const SizedBox(height: 6),
              Row(children: [
                Expanded(child: _mobileInfoRow('Due Date', _fmt(fine['due_date']),
                    valueColor: isOverdue ? const Color(0xFFEF4444) : null)),
                Expanded(child: _mobileInfoRow('Returned',
                    fine['check_in'] != null ? _fmt(fine['check_in']) : 'Not returned',
                    valueColor: fine['check_in'] == null ? const Color(0xFFF97316) : null)),
              ]),
              if (isOverdue) ...[
                const SizedBox(height: 6),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(6)),
                  child: const Text('Overdue — book not yet returned',
                      style: TextStyle(fontSize: 11, color: Color(0xFFEF4444), fontWeight: FontWeight.w600)),
                ),
              ],
            ]),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 12),
            decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xFFF3F4F6)))),
            child: Row(children: [
              Expanded(child: _mobileActionBtn('Pay', const Color(0xFF10B981), const Color(0xFFD1FAE5), () {
                setState(() {
                  _selFine = {'id': fineId, 'fine': fine['fine']};
                  _paymentMethod = 'cash';
                  _payError      = null;
                  _payLoading    = false;
                  _showPaymentModal = true;
                });
              })),
              const SizedBox(width: 8),
              Expanded(child: _mobileActionBtn('Waive', const Color(0xFFF59E0B), const Color(0xFFFEF3C7),
                  () => _waive(fineId, fine['fine']))),
              if (!isCustom) ...[
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => _recalcIndividual(fine['issue_id']),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFC7D2FE)),
                    ),
                    child: const Icon(Icons.refresh_rounded, size: 16, color: Color(0xFF6366F1)),
                  ),
                ),
              ],
            ]),
          ),
        ]),
      );
    }).toList());
  }

  Widget _buildOutstandingTable() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          headingRowHeight: 40,
          dataRowMinHeight: 56, dataRowMaxHeight: 72,
          headingRowColor: WidgetStateProperty.all(const Color(0xFFF9FAFB)),
          columnSpacing: 12, horizontalMargin: 14,
          columns: const [
            DataColumn(label: _TH('ID')),
            DataColumn(label: _TH('Type')),
            DataColumn(label: _TH('Borrower')),
            DataColumn(label: _TH('Book')),
            DataColumn(label: _TH('Copy')),
            DataColumn(label: _TH('Reason')),
            DataColumn(label: _TH('Due')),
            DataColumn(label: _TH('Returned')),
            DataColumn(label: _TH('Fine')),
            DataColumn(label: Text('')),
          ],
          rows: _fines.map((fine) {
            final isCustom  = fine['type'] == 'custom_fine';
            final isOverdue = fine['due_date'] != null &&
                DateTime.tryParse(fine['due_date'].toString())?.isBefore(DateTime.now()) == true;
            final fineId = fine['display_id'] ?? fine['issue_id'];

            return DataRow(cells: [
              DataCell(Text('$fineId',
                  style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF), fontFamily: 'monospace'))),
              DataCell(Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: isCustom ? const Color(0xFFF5F3FF) : const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(isCustom ? 'Custom' : 'Late',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700,
                        color: isCustom ? const Color(0xFF7C3AED) : const Color(0xFF2563EB))),
              )),
              DataCell(Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(fine['borrower_name'] ?? '—', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                Text('#${fine['borrower_id']}', style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF))),
              ])),
              DataCell(SizedBox(width: 120, child: Text(
                (fine['book_title'] != null && fine['book_title'] != 'N/A') ? fine['book_title'] : '—',
                style: const TextStyle(fontSize: 11), maxLines: 2, overflow: TextOverflow.ellipsis))),
              DataCell(
                (fine['copy_code'] != null && fine['copy_code'] != 'N/A')
                    ? Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(4)),
                        child: Text(fine['copy_code'], style: const TextStyle(fontSize: 10, fontFamily: 'monospace')))
                    : const Text('—', style: TextStyle(color: Color(0xFFD1D5DB))),
              ),
              DataCell(SizedBox(width: 100, child: Text(fine['reason'] ?? '—',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                  maxLines: 2, overflow: TextOverflow.ellipsis))),
              DataCell(Text(_fmt(fine['due_date']), style: TextStyle(
                  fontSize: 11,
                  fontWeight: isOverdue ? FontWeight.w600 : FontWeight.normal,
                  color: isOverdue ? const Color(0xFFEF4444) : const Color(0xFF6B7280)))),
              DataCell(fine['check_in'] != null
                  ? Text(_fmt(fine['check_in']), style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)))
                  : const Text('Not returned',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFFF97316)))),
              DataCell(Text('₹${fine['fine']}',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFFEF4444)))),
              DataCell(Row(mainAxisSize: MainAxisSize.min, children: [
                _actionChip('Pay', const Color(0xFF10B981), const Color(0xFFD1FAE5), () {
                  setState(() {
                    _selFine = {'id': fineId, 'fine': fine['fine']};
                    _paymentMethod = 'cash';
                    _payError      = null;
                    _payLoading    = false;
                    _showPaymentModal = true;
                  });
                }),
                const SizedBox(width: 4),
                _actionChip('Waive', const Color(0xFFF59E0B), const Color(0xFFFEF3C7),
                    () => _waive(fineId, fine['fine'])),
                if (!isCustom) ...[
                  const SizedBox(width: 4),
                  GestureDetector(
                    onTap: () => _recalcIndividual(fine['issue_id']),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFFC7D2FE)),
                      ),
                      child: const Icon(Icons.refresh_rounded, size: 14, color: Color(0xFF6366F1)),
                    ),
                  ),
                ],
              ])),
            ]);
          }).toList(),
        ),
      ),
    );
  }

  // ── History tab ───────────────────────────────────────────────────────────

  Widget _buildHistory(bool isMobile) {
    final filtered = _filteredHistory();

    return Column(children: [
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (isMobile) ...[
            const Text('Search', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
            const SizedBox(height: 6),
            TextField(
              controller: _histSearchCtrl,
              onChanged: (_) => setState(() {}),
              style: const TextStyle(fontSize: 13),
              decoration: _inputDec('Borrower, book, reason…'),
            ),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Filter', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
                const SizedBox(height: 6),
                _dropdownField<String>(
                  value: _histFilter,
                  items: const {
                    'all': 'All', 'paid': 'Paid', 'waived': 'Waived',
                    'issue_fine': 'Late Return', 'custom_fine': 'Custom',
                  },
                  onChanged: (v) => setState(() => _histFilter = v!),
                ),
              ])),
              const SizedBox(width: 8),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Sort', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
                const SizedBox(height: 6),
                Row(children: [
                  Expanded(child: _dropdownField<String>(
                    value: _histSortBy,
                    items: const {'date': 'Date', 'amount': 'Amount', 'borrower': 'Name'},
                    onChanged: (v) => setState(() => _histSortBy = v!),
                  )),
                  const SizedBox(width: 6),
                  GestureDetector(
                    onTap: () => setState(() => _histSortOrder = _histSortOrder == 'asc' ? 'desc' : 'asc'),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                          border: Border.all(color: const Color(0xFFE5E7EB)),
                          borderRadius: BorderRadius.circular(8)),
                      child: Text(_histSortOrder == 'asc' ? '↑' : '↓',
                          style: const TextStyle(fontSize: 13)),
                    ),
                  ),
                ]),
              ])),
            ]),
          ] else
            Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Expanded(flex: 2, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Search', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
                const SizedBox(height: 6),
                TextField(
                  controller: _histSearchCtrl,
                  onChanged: (_) => setState(() {}),
                  style: const TextStyle(fontSize: 13),
                  decoration: _inputDec('Borrower, book, reason…'),
                ),
              ])),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Filter', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
                const SizedBox(height: 6),
                _dropdownField<String>(
                  value: _histFilter,
                  items: const {
                    'all': 'All Fines', 'paid': 'Paid Only', 'waived': 'Waived Only',
                    'issue_fine': 'Late Return', 'custom_fine': 'Custom',
                  },
                  onChanged: (v) => setState(() => _histFilter = v!),
                ),
              ])),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Sort', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
                const SizedBox(height: 6),
                Row(children: [
                  Expanded(child: _dropdownField<String>(
                    value: _histSortBy,
                    items: const {'date': 'Date', 'amount': 'Amount', 'borrower': 'Borrower'},
                    onChanged: (v) => setState(() => _histSortBy = v!),
                  )),
                  const SizedBox(width: 6),
                  GestureDetector(
                    onTap: () => setState(() => _histSortOrder = _histSortOrder == 'asc' ? 'desc' : 'asc'),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                          border: Border.all(color: const Color(0xFFE5E7EB)),
                          borderRadius: BorderRadius.circular(8)),
                      child: Text(_histSortOrder == 'asc' ? '↑' : '↓',
                          style: const TextStyle(fontSize: 13)),
                    ),
                  ),
                ]),
              ])),
            ]),
          const SizedBox(height: 10),
          Text('Showing ${filtered.length} of ${_history.length} records',
              style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
        ]),
      ),
      const SizedBox(height: 10),

      if (filtered.isEmpty)
        Container(
          padding: const EdgeInsets.all(40),
          decoration: BoxDecoration(
              color: Colors.white, borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E7EB))),
          child: const Center(child: Text('No fines match your filters',
              style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13))),
        )
      else
        isMobile ? _buildHistoryCards(filtered) : _buildHistoryTable(filtered),
    ]);
  }

  Widget _buildHistoryCards(List filtered) {
    return Column(children: filtered.map<Widget>((item) {
      final isCustom = item['type'] == 'custom_fine';
      final isWaived = item['status'] == 'waived';

      return GestureDetector(
        onTap: () {
          if (isCustom) context.go('/fines/custom/${item['id']}');
          else context.go('/fines/${item['id']}');
        },
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE5E7EB)),
          ),
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: isCustom ? const Color(0xFFF5F3FF) : const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(isCustom ? 'Custom' : 'Late Return',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700,
                              color: isCustom ? const Color(0xFF7C3AED) : const Color(0xFF2563EB))),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: isWaived ? const Color(0xFFFEF3C7) : const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(isWaived ? 'Waived' : 'Paid',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700,
                              color: isWaived ? const Color(0xFF92400E) : const Color(0xFF065F46))),
                    ),
                  ]),
                  const SizedBox(height: 6),
                  Text(item['borrower_name'] ?? '—',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF111827))),
                ])),
                Text('₹${item['fine'] ?? item['amount']}',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF1F2937))),
              ]),
            ),
            const Divider(height: 1, color: Color(0xFFF3F4F6)),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
              child: Column(children: [
                if (item['book_title'] != null && item['book_title'] != 'N/A')
                  _mobileInfoRow('Book', item['book_title']),
                if (item['reason'] != null) ...[
                  const SizedBox(height: 6),
                  _mobileInfoRow('Reason', item['reason']),
                ],
                const SizedBox(height: 6),
                Row(children: [
                  Expanded(child: _mobileInfoRow('Date', _fmt(item['payment_date'] ?? item['createdAt']))),
                  Expanded(child: _mobileInfoRow('Method', item['payment_method'] ?? '—')),
                ]),
              ]),
            ),
          ]),
        ),
      );
    }).toList());
  }

  Widget _buildHistoryTable(List filtered) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          headingRowHeight: 40,
          dataRowMinHeight: 52, dataRowMaxHeight: 68,
          headingRowColor: WidgetStateProperty.all(const Color(0xFFF9FAFB)),
          columnSpacing: 12, horizontalMargin: 14,
          columns: const [
            DataColumn(label: _TH('Date')),
            DataColumn(label: _TH('Type')),
            DataColumn(label: _TH('Borrower')),
            DataColumn(label: _TH('Book / Reason')),
            DataColumn(label: _TH('Copy')),
            DataColumn(label: _TH('Amount')),
            DataColumn(label: _TH('Method')),
            DataColumn(label: _TH('Status')),
          ],
          rows: filtered.map((item) {
            final isCustom = item['type'] == 'custom_fine';
            final isWaived = item['status'] == 'waived';
            return DataRow(
              onSelectChanged: (_) {
                if (isCustom) context.go('/fines/custom/${item['id']}');
                else context.go('/fines/${item['id']}');
              },
              cells: [
                DataCell(Text(_fmt(item['payment_date'] ?? item['createdAt']),
                    style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)))),
                DataCell(Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: isCustom ? const Color(0xFFF5F3FF) : const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(isCustom ? 'Custom' : 'Late',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700,
                          color: isCustom ? const Color(0xFF7C3AED) : const Color(0xFF2563EB))),
                )),
                DataCell(Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text(item['borrower_name'] ?? '—', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                  Text('#${item['borrower_id']}', style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF))),
                ])),
                DataCell(SizedBox(width: 130, child: Text(item['book_title'] ?? item['reason'] ?? '—',
                    style: const TextStyle(fontSize: 11), maxLines: 2, overflow: TextOverflow.ellipsis))),
                DataCell(
                  (item['copy_code'] != null && item['copy_code'] != 'N/A')
                      ? Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                          decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(4)),
                          child: Text(item['copy_code'], style: const TextStyle(fontSize: 10, fontFamily: 'monospace')))
                      : const Text('—', style: TextStyle(color: Color(0xFFD1D5DB))),
                ),
                DataCell(Text('₹${item['fine'] ?? item['amount']}',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)))),
                DataCell(Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(6)),
                  child: Text(item['payment_method'] ?? '—',
                      style: const TextStyle(fontSize: 10, color: Color(0xFF6B7280))),
                )),
                DataCell(Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: isWaived ? const Color(0xFFFEF3C7) : const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(isWaived ? 'Waived' : 'Paid',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700,
                          color: isWaived ? const Color(0xFF92400E) : const Color(0xFF065F46))),
                )),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }

  // ── Stats tab ─────────────────────────────────────────────────────────────

  Widget _buildStats() {
    final statItems = [
      {'label': 'Total Generated', 'value': '₹${_stats?['total_fines_generated'] ?? 0}',
       'icon': Icons.currency_rupee, 'color': const Color(0xFF2563EB), 'bg': const Color(0xFFEFF6FF)},
      {'label': 'Total Collected', 'value': '₹${_stats?['total_collected'] ?? 0}',
       'icon': Icons.check_circle_outline, 'color': const Color(0xFF10B981), 'bg': const Color(0xFFECFDF5)},
      {'label': 'Outstanding', 'value': '₹${_stats?['total_outstanding'] ?? 0}',
       'icon': Icons.warning_amber_outlined, 'color': const Color(0xFFEF4444), 'bg': const Color(0xFFFEF2F2)},
      {'label': 'Issues w/ Fines', 'value': '${_stats?['issues_with_fines'] ?? 0}',
       'icon': Icons.receipt_long_outlined, 'color': const Color(0xFFF97316), 'bg': const Color(0xFFFFF7ED)},
    ];

    return LayoutBuilder(builder: (_, c) {
      final cols = c.maxWidth < 480 ? 2 : 4;
      final rows = <Widget>[];
      for (var i = 0; i < statItems.length; i += cols) {
        final slice = statItems.sublist(i, (i + cols).clamp(0, statItems.length));
        rows.add(Row(children: slice.map((s) => Expanded(child: Container(
          margin: const EdgeInsets.only(right: 10, bottom: 10),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE5E7EB)),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(color: s['bg'] as Color, borderRadius: BorderRadius.circular(10)),
              child: Icon(s['icon'] as IconData, color: s['color'] as Color, size: 18),
            ),
            const SizedBox(height: 12),
            Text(s['label'] as String,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                    color: Color(0xFF9CA3AF), letterSpacing: 0.4)),
            const SizedBox(height: 4),
            Text(s['value'] as String,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
          ]),
        ))).toList()));
      }
      return Column(children: rows);
    });
  }

  // ── Modals ────────────────────────────────────────────────────────────────

  Widget _buildRecalcModal() {
    final opts = [
      {'mode': 'overdue',  'label': 'Overdue Only',        'desc': 'Books still checked out',    'color': const Color(0xFFF97316)},
      {'mode': 'returned', 'label': 'Returned Books Only',  'desc': 'Already returned books',    'color': const Color(0xFF2563EB)},
      {'mode': 'all',      'label': 'All Fines',            'desc': 'Both overdue and returned', 'color': const Color(0xFF6366F1)},
    ];
    return _modalOverlay(
      onDismiss: () => setState(() => _showRecalcModal = false),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Padding(padding: EdgeInsets.fromLTRB(20, 20, 20, 4),
            child: Text('Recalculate Fines',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)))),
        const Padding(padding: EdgeInsets.fromLTRB(20, 0, 20, 16),
            child: Text('Choose which fines to recalculate',
                style: TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)))),
        const Divider(height: 1, color: Color(0xFFF3F4F6)),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(children: opts.map((o) => GestureDetector(
            onTap: () => _recalcAll(o['mode'] as String),
            child: Container(
              width: double.infinity, margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE5E7EB))),
              child: Row(children: [
                Container(width: 10, height: 10, decoration: BoxDecoration(color: o['color'] as Color, shape: BoxShape.circle)),
                const SizedBox(width: 12),
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(o['label'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
                  Text(o['desc'] as String,  style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                ]),
              ]),
            ),
          )).toList()),
        ),
        Padding(padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
          child: SizedBox(width: double.infinity,
            child: OutlinedButton(
              onPressed: () => setState(() => _showRecalcModal = false),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFFE5E7EB)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF6B7280))),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _buildPaymentModal() {
    return _modalOverlay(
      onDismiss: _closePaymentModal,
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Padding(padding: EdgeInsets.fromLTRB(20, 20, 20, 4),
            child: Text('Record Payment',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)))),
        const Divider(height: 1, color: Color(0xFFF3F4F6)),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Column(children: [
            Container(
              width: double.infinity, padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: Column(children: [
                const Text('Amount to collect', style: TextStyle(fontSize: 11, color: Color(0xFF059669))),
                const SizedBox(height: 6),
                Text('₹${_selFine?['fine'] ?? 0}',
                    style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w700, color: Color(0xFF065F46))),
              ]),
            ),
            const SizedBox(height: 16),
            const Align(alignment: Alignment.centerLeft,
                child: Text('Payment Method', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF374151)))),
            const SizedBox(height: 6),
            _dropdownField<String>(
              value: _paymentMethod,
              items: const {'cash': 'Cash', 'card': 'Card', 'upi': 'UPI', 'online': 'Online Transfer'},
              onChanged: (v) => setState(() => _paymentMethod = v!),
            ),
            const SizedBox(height: 16),

            // ── Inline error banner ─────────────────────────────────────────
            if (_payError != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Row(children: [
                  const Icon(Icons.error_outline, size: 14, color: Color(0xFFDC2626)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(_payError!,
                      style: const TextStyle(fontSize: 12, color: Color(0xFFDC2626)))),
                ]),
              ),
              const SizedBox(height: 12),
            ],

            Row(children: [
              Expanded(child: ElevatedButton(
                onPressed: _payLoading ? null : _pay,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  disabledBackgroundColor: const Color(0xFF10B981).withOpacity(0.6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(vertical: 12), elevation: 0,
                ),
                child: _payLoading
                    ? const SizedBox(width: 18, height: 18,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Confirm Payment',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
              )),
              const SizedBox(width: 10),
              Expanded(child: OutlinedButton(
                onPressed: _payLoading ? null : _closePaymentModal,
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
      ]),
    );
  }

  Widget _buildCustomFineModal() {
    return _modalOverlay(
      onDismiss: _closeCustomModal,
      scrollable: true,
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Padding(padding: EdgeInsets.fromLTRB(20, 20, 20, 4),
            child: Text('Add Custom Fine',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)))),
        const Divider(height: 1, color: Color(0xFFF3F4F6)),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

            if (_customError != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Row(children: [
                  const Icon(Icons.error_outline, size: 14, color: Color(0xFFDC2626)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(_customError!,
                      style: const TextStyle(fontSize: 12, color: Color(0xFFDC2626)))),
                ]),
              ),
              const SizedBox(height: 14),
            ],

            _label('Borrower *'), const SizedBox(height: 6),
            Stack(children: [
              TextField(controller: _borrowerCtrl, onChanged: _onBorrowerChanged,
                  style: const TextStyle(fontSize: 13), decoration: _inputDec('Scan RF ID or search…')),
              Positioned(right: 12, top: 0, bottom: 0, child: Center(child: _searchingBorrower
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF9CA3AF)))
                  : _selBorrower != null
                      ? GestureDetector(onTap: () => setState(() { _selBorrower = null; _borrowerCtrl.clear(); }),
                          child: const Icon(Icons.close, size: 16, color: Color(0xFFD1D5DB)))
                      : const SizedBox.shrink())),
            ]),
            if (_showBorrowerDrop && _borrowerResults.isNotEmpty && _selBorrower == null)
              _dropList(_borrowerResults,
                title: (b) => b['borrower_name'] ?? '',
                sub:   (b) => '#${b['borrower_id']}${b['rf_id'] != null ? ' · RF: ${b['rf_id']}' : ''}',
                onTap: (b) => _selectBorrower(b as Map<String, dynamic>)),
            if (_selBorrower != null) _selectedChip('${_selBorrower!['borrower_name']}'),
            const SizedBox(height: 14),

            _label('Amount (₹) *'), const SizedBox(height: 6),
            TextField(controller: _amountCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                style: const TextStyle(fontSize: 13), decoration: _inputDec('0.00')),
            const SizedBox(height: 14),

            _label('Reason *'), const SizedBox(height: 6),
            TextField(controller: _reasonCtrl, maxLines: 3,
                style: const TextStyle(fontSize: 13),
                decoration: _inputDec('e.g. Lost book, Damaged pages…')),
            const SizedBox(height: 14),

            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE5E7EB))),
              child: Column(children: [
                Row(children: [
                  Switch(value: _linkToCopy, activeColor: const Color(0xFF2563EB),
                    onChanged: (v) => setState(() { _linkToCopy = v; if (!v) { _selCustomBook = null; _customBookCtrl.clear(); _selCustomCopy = null; _customCopies = []; } })),
                  const SizedBox(width: 8),
                  const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Link to a book copy', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
                    Text('For fines related to a specific copy', style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                  ])),
                ]),
                if (_linkToCopy) ...[
                  const SizedBox(height: 12),
                  Stack(children: [
                    TextField(controller: _customBookCtrl, onChanged: _onCustomBookChanged,
                        style: const TextStyle(fontSize: 13), decoration: _inputDec('Search book by title or ISBN…')),
                    if (_searchingCustomBook)
                      const Positioned(right: 12, top: 0, bottom: 0,
                          child: Center(child: SizedBox(width: 16, height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF9CA3AF))))),
                  ]),
                  if (_showCustomBookDrop && _customBooks.isNotEmpty && _selCustomBook == null)
                    _dropList(_customBooks,
                      title: (b) => b['title'] ?? '', sub: (b) => 'ISBN: ${b['isbn']}',
                      onTap: (b) => _selectCustomBook(b as Map<String, dynamic>)),
                  if (_selCustomBook != null) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: const Color(0xFFF9FAFB),
                          borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE5E7EB))),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(_selCustomBook!['title'] ?? '',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 8),
                        if (_loadingCustomCopies)
                          const Text('Loading copies…', style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)))
                        else if (_customCopies.isEmpty)
                          const Text('No copies found', style: TextStyle(fontSize: 11, color: Color(0xFFEF4444)))
                        else
                          ..._customCopies.map((copy) {
                            final isAvail = copy['status'] == 'Available';
                            final isIssuedToSel = _selBorrower != null && copy['status'] == 'Issued' &&
                                copy['borrower']?['borrower_id'] == _selBorrower!['borrower_id'];
                            final clickable = isAvail || isIssuedToSel;
                            final selected  = _selCustomCopy?['copy_id'] == copy['copy_id'];
                            return GestureDetector(
                              onTap: clickable ? () => setState(() => _selCustomCopy = copy as Map<String, dynamic>) : null,
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 6), padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: selected ? const Color(0xFFEFF6FF) : clickable ? Colors.white : const Color(0xFFF9FAFB),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: selected ? const Color(0xFF93C5FD) : const Color(0xFFE5E7EB)),
                                ),
                                child: Row(children: [
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(copy['copy_code'] ?? '',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, fontFamily: 'monospace')),
                                    Text(
                                      isIssuedToSel ? 'Issued to this borrower' : isAvail ? 'Available' : copy['status'],
                                      style: TextStyle(fontSize: 10,
                                          color: isIssuedToSel ? const Color(0xFFF97316)
                                              : isAvail ? const Color(0xFF10B981) : const Color(0xFFEF4444)),
                                    ),
                                  ])),
                                  if (selected) const Icon(Icons.check_circle, size: 16, color: Color(0xFF2563EB)),
                                ]),
                              ),
                            );
                          }),
                      ]),
                    ),
                  ],
                ],
              ]),
            ),
            const SizedBox(height: 12),

            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE5E7EB))),
              child: Column(children: [
                Row(children: [
                  Switch(value: _markAsPaid, activeColor: const Color(0xFF10B981),
                      onChanged: (v) => setState(() => _markAsPaid = v)),
                  const SizedBox(width: 8),
                  const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Mark as paid immediately', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
                    Text('Borrower has already paid', style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                  ])),
                ]),
                if (_markAsPaid) ...[
                  const SizedBox(height: 10),
                  _label('Payment Method'), const SizedBox(height: 6),
                  _dropdownField<String>(
                    value: _customPayMethod,
                    items: const {'cash': 'Cash', 'card': 'Card', 'upi': 'UPI', 'online': 'Online Transfer'},
                    onChanged: (v) => setState(() => _customPayMethod = v!),
                  ),
                ],
              ]),
            ),
            const SizedBox(height: 16),

            Row(children: [
              Expanded(child: ElevatedButton(
                onPressed: _submitting ? null : _submitCustomFine,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C3AED),
                  disabledBackgroundColor: const Color(0xFF7C3AED).withOpacity(0.6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(vertical: 13), elevation: 0,
                ),
                child: _submitting
                    ? const SizedBox(width: 18, height: 18,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Add Fine', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
              )),
              const SizedBox(width: 10),
              Expanded(child: OutlinedButton(
                onPressed: _submitting ? null : _closeCustomModal,
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFE5E7EB)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(vertical: 13),
                ),
                child: const Text('Cancel', style: TextStyle(color: Color(0xFF6B7280))),
              )),
            ]),
          ]),
        ),
      ]),
    );
  }

  Widget _modalOverlay({required Widget child, required VoidCallback onDismiss, bool scrollable = false}) {
    return GestureDetector(
      onTap: onDismiss,
      child: Container(
        color: const Color(0x80000000),
        child: SafeArea(
          child: Center(
            child: GestureDetector(
              onTap: () {},
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 40),
                constraints: BoxConstraints(
                  maxWidth: 480,
                  maxHeight: MediaQuery.of(context).size.height * 0.85 -
                      MediaQuery.of(context).viewInsets.bottom,
                ),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
                child: scrollable
                    ? SingleChildScrollView(
                        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
                        child: child,
                      )
                    : child,
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ── Small shared widgets ──────────────────────────────────────────────────

  Widget _mobileInfoRow(String label, String value, {Color? valueColor}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w500)),
      const SizedBox(height: 1),
      Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
          color: valueColor ?? const Color(0xFF374151)),
          maxLines: 2, overflow: TextOverflow.ellipsis),
    ]);
  }

  Widget _mobileActionBtn(String label, Color color, Color bg, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 9),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8),
            border: Border.all(color: color.withOpacity(0.4))),
        child: Center(child: Text(label,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color))),
      ),
    );
  }

  Widget _tabBtn(int index, String label, IconData icon, Color activeColor) {
    final active = _tab == index;
    return GestureDetector(
      onTap: () { setState(() => _tab = index); _fetchTab(); },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
            color: active ? activeColor : Colors.transparent,
            borderRadius: BorderRadius.circular(8)),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: 14, color: active ? Colors.white : const Color(0xFF9CA3AF)),
          const SizedBox(width: 5),
          Flexible(
            child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500,
                color: active ? Colors.white : const Color(0xFF6B7280)),
                overflow: TextOverflow.ellipsis),
          ),
        ]),
      ),
    );
  }

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
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 5),
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: color)),
        ]),
      ),
    );
  }

  Widget _actionChip(String label, Color color, Color bg, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6),
            border: Border.all(color: color.withOpacity(0.4))),
        child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: color)),
      ),
    );
  }

  Widget _dropdownField<T>({
    required T value, required Map<T, String> items, required ValueChanged<T?> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE5E7EB)), borderRadius: BorderRadius.circular(8)),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value, isExpanded: true, isDense: true,
          items: items.entries.map((e) => DropdownMenuItem<T>(
              value: e.key, child: Text(e.value, style: const TextStyle(fontSize: 12, color: Color(0xFF374151))))).toList(),
          onChanged: onChanged,
          style: const TextStyle(fontSize: 12, color: Color(0xFF374151)), iconSize: 16,
        ),
      ),
    );
  }

  Widget _dropList(List items, {
    required String Function(dynamic) title,
    required String Function(dynamic) sub,
    required void Function(dynamic) onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(top: 4),
      constraints: const BoxConstraints(maxHeight: 180),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE5E7EB)),
        boxShadow: const [BoxShadow(color: Color(0x10000000), blurRadius: 8, offset: Offset(0, 4))],
      ),
      child: ListView.builder(
        shrinkWrap: true,
        itemCount: items.length,
        itemBuilder: (_, i) => GestureDetector(
          onTap: () => onTap(items[i]),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFF9FAFB)))),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title(items[i]),
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                  overflow: TextOverflow.ellipsis),
              Text(sub(items[i]),
                  style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                  overflow: TextOverflow.ellipsis),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _selectedChip(String label) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFA7F3D0)),
      ),
      child: Row(children: [
        const Icon(Icons.check_circle, size: 14, color: Color(0xFF10B981)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(label,
              style: const TextStyle(fontSize: 12, color: Color(0xFF065F46), fontWeight: FontWeight.w500),
              overflow: TextOverflow.ellipsis),
        ),
      ]),
    );
  }

  Widget _label(String text) => Text(text,
      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF374151)));

  InputDecoration _inputDec(String hint) => InputDecoration(
    hintText: hint,
    hintStyle: const TextStyle(fontSize: 13, color: Color(0xFFD1D5DB)),
    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF93C5FD), width: 1.5)),
    filled: true, fillColor: Colors.white,
  );
}

class _TH extends StatelessWidget {
  final String label;
  const _TH(this.label);

  @override
  Widget build(BuildContext context) => Text(label,
      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700,
          color: Color(0xFF9CA3AF), letterSpacing: 0.4));
}