// lib/pages/borrower_details_page.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';
import '../utils/auth.dart';

class BorrowerDetailsPage extends StatefulWidget {
  final String? borrowerId;
  const BorrowerDetailsPage({super.key, this.borrowerId});

  @override
  State<BorrowerDetailsPage> createState() => _BorrowerDetailsPageState();
}

class _BorrowerDetailsPageState extends State<BorrowerDetailsPage> {
  String? _id;

  Map<String, dynamic>? _borrower;
  List<dynamic> _activeIssues       = [];
  double _outstandingFines          = 0;
  int    _totalBorrowed             = 0;
  List<dynamic> _fines              = [];
  List<dynamic> _requests           = [];
  Map<int, Map<String, dynamic>> _renewalMap = {};

  bool _loading          = true;
  bool _finesLoading     = false;
  bool _requestsLoading  = false;
  bool _renewalLoading   = false;
  String? _error;

  late bool _canEdit;
  late bool _isOwnData;

  int _tab = 0;

  final Set<int> _requestingRenewal = {};
  final Set<int> _cancellingIds     = {};

  bool _showEditModal = false;
  final _editNameCtrl    = TextEditingController();
  final _editEmailCtrl   = TextEditingController();
  final _editPhoneCtrl   = TextEditingController();
  final _editAddressCtrl = TextEditingController();
  final _editRfCtrl      = TextEditingController();

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void dispose() {
    _editNameCtrl.dispose(); _editEmailCtrl.dispose();
    _editPhoneCtrl.dispose(); _editAddressCtrl.dispose(); _editRfCtrl.dispose();
    super.dispose();
  }

  // ── FIXED _init ──────────────────────────────────────────────────────────
  Future<void> _init() async {
    final role = AuthService.getUserRole();
    _canEdit   = role == 'admin' || role == 'librarian';

    // If a borrower ID was passed via route param, use it directly
    if (widget.borrowerId != null) {
      _id = widget.borrowerId;
      final myId = AuthService.getBorrowerId()?.toString();
      _isOwnData = _id == myId;
      await _fetchAll();
      return;
    }

    // Member viewing /profile — no route param, must resolve own borrower ID
    String? myId = AuthService.getBorrowerId()?.toString();

    if (myId == null) {
      // borrower_id wasn't in the stored login response — fetch it from the API
      try {
        final res = await ApiService.get('/borrowers/me');
        final fetchedId = res.data['borrower']?['borrower_id'];
        if (fetchedId != null) {
          myId = fetchedId.toString();
          // Persist so we don't need to fetch again next time
          await AuthService.saveBorrowerId(fetchedId as int);
        }
      } catch (_) {
        // /borrowers/me failed — nothing more we can do
      }
    }

    if (myId == null) {
      setState(() {
        _error   = 'Could not determine your profile. Please log out and log in again.';
        _loading = false;
      });
      return;
    }

    _id        = myId;
    _isOwnData = true;
    await _fetchAll();
  }
  // ─────────────────────────────────────────────────────────────────────────

  Future<void> _fetchAll() async {
    await Future.wait([
      _fetchBorrower(),
      _fetchFines(),
      _fetchRequests(),
    ]);
    if (_isOwnData || _canEdit) await _fetchRenewals();
  }

  Future<void> _fetchBorrower() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await ApiService.get('/borrowers/$_id');
      final d   = res.data as Map<String, dynamic>;
      setState(() {
        _borrower         = d['borrower'];
        _activeIssues     = d['active_issues']    ?? [];
        _outstandingFines = (d['outstanding_fines'] as num?)?.toDouble() ?? 0;
        _totalBorrowed    = (d['total_borrowed']  as int?) ?? 0;
      });
      _editNameCtrl.text    = _borrower?['borrower_name'] ?? '';
      _editEmailCtrl.text   = _borrower?['email']   ?? '';
      _editPhoneCtrl.text   = _borrower?['phone']   ?? '';
      _editAddressCtrl.text = _borrower?['address'] ?? '';
      _editRfCtrl.text      = _borrower?['rf_id']   ?? '';
    } catch (_) {
      setState(() => _error = 'Failed to load borrower details');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _fetchFines() async {
    setState(() => _finesLoading = true);
    try {
      final res = await ApiService.get('/borrowers/$_id/fines');
      setState(() => _fines = res.data['fines'] ?? []);
    } catch (_) {}
    finally { if (mounted) setState(() => _finesLoading = false); }
  }

  Future<void> _fetchRequests() async {
    setState(() => _requestsLoading = true);
    try {
      final res = await ApiService.get('/requests', params: {'borrower_id': _id});
      setState(() => _requests = res.data['requests'] ?? []);
    } catch (_) {}
    finally { if (mounted) setState(() => _requestsLoading = false); }
  }

  Future<void> _fetchRenewals() async {
    setState(() => _renewalLoading = true);
    try {
      final endpoint = _isOwnData ? '/renewal-requests/my' : '/renewal-requests?borrower_id=$_id';
      final res = await ApiService.get(endpoint);
      final map = <int, Map<String, dynamic>>{};
      for (final r in (res.data['requests'] as List? ?? [])) {
        final issueId = r['issue_id'] as int;
        if (!map.containsKey(issueId) ||
            DateTime.parse(r['createdAt']).isAfter(DateTime.parse(map[issueId]!['createdAt']))) {
          map[issueId] = r as Map<String, dynamic>;
        }
      }
      setState(() => _renewalMap = map);
    } catch (_) {}
    finally { if (mounted) setState(() => _renewalLoading = false); }
  }

  Future<void> _requestRenewal(int issueId) async {
    setState(() => _requestingRenewal.add(issueId));
    try {
      await ApiService.post('/renewal-requests', data: {'issue_id': issueId});
      _showSnack('Renewal request submitted — librarian will review it shortly');
      await _fetchRenewals();
    } catch (e) {
      _showSnack('Failed to submit renewal request');
    } finally {
      if (mounted) setState(() => _requestingRenewal.remove(issueId));
    }
  }

  Future<void> _cancelRequest(int requestId) async {
    setState(() => _cancellingIds.add(requestId));
    try {
      await ApiService.delete('/requests/$requestId');
      _showSnack('Request cancelled');
      await _fetchRequests();
    } catch (_) {
      _showSnack('Failed to cancel request');
    } finally {
      if (mounted) setState(() => _cancellingIds.remove(requestId));
    }
  }

  Future<void> _updateBorrower() async {
    try {
      await ApiService.put('/borrowers/$_id', data: {
        'borrower_name': _editNameCtrl.text,
        'email':   _editEmailCtrl.text,
        'phone':   _editPhoneCtrl.text,
        'address': _editAddressCtrl.text,
        'rf_id':   _editRfCtrl.text,
      });
      setState(() => _showEditModal = false);
      _showSnack('Updated successfully');
      await _fetchBorrower();
    } catch (_) { _showSnack('Failed to update'); }
  }

  Future<void> _renewMembership() async {
    final ok = await _confirm(
      title: 'Renew Membership?',
      desc: 'Renew membership for ${_borrower?['borrower_name']}?',
      confirmLabel: 'Renew',
      confirmColor: const Color(0xFF10B981),
    );
    if (!ok) return;
    try {
      await ApiService.put('/borrowers/renew/$_id');
      _showSnack('Membership renewed');
      await _fetchBorrower();
    } catch (_) { _showSnack('Failed to renew'); }
  }

  Future<void> _deleteBorrower() async {
    final ok = await _confirm(
      title: 'Delete Borrower?',
      desc: 'Delete ${_borrower?['borrower_name']}? This cannot be undone.',
      confirmLabel: 'Delete',
      confirmColor: const Color(0xFFEF4444),
    );
    if (!ok) return;
    try {
      await ApiService.delete('/borrowers/$_id');
      if (mounted) context.go('/borrowers');
    } catch (_) { _showSnack('Failed to delete'); }
  }

  Future<bool> _confirm({required String title, required String desc, required String confirmLabel, required Color confirmColor}) async {
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
            style: ElevatedButton.styleFrom(backgroundColor: confirmColor, foregroundColor: Colors.white, elevation: 0),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
    return result == true;
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  String _fmt(dynamic d) {
    final dt = DateTime.tryParse(d?.toString() ?? '');
    if (dt == null) return '—';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  bool _isExpired(dynamic d) {
    final dt = DateTime.tryParse(d?.toString() ?? '');
    return dt != null && dt.isBefore(DateTime.now());
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
        body: Center(child: Text(_error!, style: const TextStyle(color: Color(0xFFEF4444)))),
      );
    }
    if (_borrower == null) {
      return const Scaffold(body: Center(child: Text('Not found')));
    }

    final b = _borrower!;
    final membershipExpired = _isExpired(b['membership_expiry']);
    final pendingRequests   = _requests.where((r) => r['status'] == 'pending').length;

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: Stack(children: [
        SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                GestureDetector(
                  onTap: () => context.go(_canEdit ? '/borrowers' : '/dashboard'),
                  child: const Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.arrow_back, size: 18, color: Color(0xFF6B7280)),
                    SizedBox(width: 4),
                    Text('Back', style: TextStyle(fontSize: 14, color: Color(0xFF6B7280))),
                  ]),
                ),
                const SizedBox(width: 12),
                const Text('/', style: TextStyle(color: Color(0xFFD1D5DB))),
                const SizedBox(width: 12),
                Text(
                  _isOwnData && !_canEdit ? 'My Profile' : (b['borrower_name'] ?? ''),
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)),
                ),
                const Spacer(),
                if (_canEdit || _isOwnData)
                  _HeaderBtn(label: 'Edit', icon: Icons.edit_outlined,
                      bg: Colors.white, color: const Color(0xFF374151),
                      onTap: () => setState(() => _showEditModal = true)),
                if (_canEdit) ...[
                  const SizedBox(width: 8),
                  _HeaderBtn(label: 'Renew', icon: Icons.autorenew,
                      bg: const Color(0xFFECFDF5), color: const Color(0xFF065F46),
                      onTap: _renewMembership),
                  const SizedBox(width: 8),
                  _HeaderBtn(label: 'Delete', icon: Icons.delete_outline,
                      bg: const Color(0xFFFEF2F2), color: const Color(0xFFDC2626),
                      onTap: _deleteBorrower),
                ],
              ]),
              const SizedBox(height: 20),

              LayoutBuilder(builder: (_, constraints) {
                final wide = constraints.maxWidth > 700;
                if (wide) {
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(width: 280, child: _buildLeftPanel(b, membershipExpired)),
                      const SizedBox(width: 16),
                      Expanded(child: _buildRightPanel(b, pendingRequests)),
                    ],
                  );
                }
                return Column(children: [
                  _buildLeftPanel(b, membershipExpired),
                  const SizedBox(height: 16),
                  _buildRightPanel(b, pendingRequests),
                ]);
              }),
            ],
          ),
        ),

        if (_showEditModal && (_canEdit || _isOwnData)) _buildEditModal(),
      ]),
    );
  }

  Widget _buildLeftPanel(Map<String, dynamic> b, bool membershipExpired) {
    return Column(children: [
      _Card(child: Column(children: [
        Row(children: [
          Container(
            width: 44, height: 44,
            decoration: const BoxDecoration(
              gradient: LinearGradient(colors: [Color(0xFF60A5FA), Color(0xFF6366F1)]),
              shape: BoxShape.circle,
            ),
            child: Center(child: Text(
              (b['borrower_name'] as String? ?? ' ')[0].toUpperCase(),
              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            )),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(b['borrower_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Color(0xFF1F2937))),
            Text('ID #${b['borrower_id']}', style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
          ])),
        ]),
        const Divider(height: 20, color: Color(0xFFF3F4F6)),
        _ProfileRow(label: 'Email',  value: b['email']  ?? '—'),
        _ProfileRow(label: 'Phone',  value: b['phone']  ?? '—'),
        if (_canEdit || _isOwnData)
          _ProfileRow(label: 'Address', value: b['address'] ?? '—'),
        if (b['rf_id'] != null && b['rf_id'] != '') ...[
          const SizedBox(height: 8),
          Row(children: [
            const Text('RF ID', style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: Text(b['rf_id'], style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: Color(0xFF1D4ED8))),
            ),
          ]),
        ],
        if (b['membership_expiry'] != null) ...[
          const SizedBox(height: 8),
          Row(children: [
            const Text('Membership', style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
            const Spacer(),
            Text(
              '${_fmt(b['membership_expiry'])}${membershipExpired ? ' · Expired' : ''}',
              style: TextStyle(
                fontSize: 12, fontWeight: FontWeight.w600,
                color: membershipExpired ? const Color(0xFFDC2626) : const Color(0xFF374151),
              ),
            ),
          ]),
        ],
      ])),
      const SizedBox(height: 12),

      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: _outstandingFines > 0 ? const Color(0xFFFEF2F2) : const Color(0xFFECFDF5),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: _outstandingFines > 0 ? const Color(0xFFFECACA) : const Color(0xFFA7F3D0)),
        ),
        child: Row(children: [
          Icon(Icons.currency_rupee,
              color: _outstandingFines > 0 ? const Color(0xFFEF4444) : const Color(0xFF10B981),
              size: 18),
          const SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Outstanding Fines', style: TextStyle(fontSize: 11, color: Color(0xFF6B7280), fontWeight: FontWeight.w600)),
            Text('₹$_outstandingFines',
                style: TextStyle(
                    fontSize: 22, fontWeight: FontWeight.w800,
                    color: _outstandingFines > 0 ? const Color(0xFFDC2626) : const Color(0xFF059669))),
          ]),
          const Spacer(),
          if (_outstandingFines > 0 && _canEdit)
            GestureDetector(
              onTap: () => context.go('/fines'),
              child: const Text('Manage →', style: TextStyle(fontSize: 11, color: Color(0xFFDC2626))),
            ),
        ]),
      ),
      const SizedBox(height: 12),

      GridView.count(
        crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: 8, mainAxisSpacing: 8, childAspectRatio: 2,
        children: [
          _StatCard(label: 'Books Read',  value: '$_totalBorrowed',      icon: Icons.menu_book_outlined, color: const Color(0xFF6366F1)),
          _StatCard(label: 'Active Now',  value: '${_activeIssues.length}', icon: Icons.access_time,     color: const Color(0xFF2563EB)),
          _StatCard(label: 'Requests',    value: '${_requests.length}',  icon: Icons.inbox_outlined,     color: const Color(0xFFF59E0B)),
          _StatCard(label: 'Fines',       value: '${_fines.length}',     icon: Icons.receipt_outlined,   color: const Color(0xFFEF4444)),
        ],
      ),

      if (_isOwnData && _activeIssues.isNotEmpty) ...[
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFBFDBFE)),
          ),
          child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(Icons.info_outline, size: 16, color: Color(0xFF2563EB)),
            SizedBox(width: 8),
            Expanded(child: Text(
              'Need more time? Use Request Renewal on any active issue and a librarian will extend your due date.',
              style: TextStyle(fontSize: 11, color: Color(0xFF1D4ED8)),
            )),
          ]),
        ),
      ],
    ]);
  }

  Widget _buildRightPanel(Map<String, dynamic> b, int pendingRequests) {
    final tabs = [
      (label: 'Overview',        icon: Icons.book_outlined),
      (label: 'Reading History', icon: Icons.history),
      (label: 'Requests',        icon: Icons.inbox_outlined),
    ];

    return Column(children: [
      Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Row(children: List.generate(tabs.length, (i) {
          final active = _tab == i;
          return Expanded(child: GestureDetector(
            onTap: () => setState(() => _tab = i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              padding: const EdgeInsets.symmetric(vertical: 9),
              decoration: BoxDecoration(
                color: active ? const Color(0xFF2563EB) : Colors.transparent,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(tabs[i].icon, size: 14, color: active ? Colors.white : const Color(0xFF9CA3AF)),
                const SizedBox(width: 5),
                Text(tabs[i].label,
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                        color: active ? Colors.white : const Color(0xFF6B7280))),
                if (i == 2 && pendingRequests > 0) ...[
                  const SizedBox(width: 5),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                    decoration: BoxDecoration(
                      color: active ? Colors.white.withOpacity(0.3) : const Color(0xFFF59E0B),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text('$pendingRequests',
                        style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold,
                            color: active ? Colors.white : Colors.white)),
                  ),
                ],
              ]),
            ),
          ));
        })),
      ),
      const SizedBox(height: 12),

      if (_tab == 0) _buildOverviewTab()
      else if (_tab == 1) _HistoryTab(borrowerId: _id!)
      else _buildRequestsTab(),
    ]);
  }

  Widget _buildOverviewTab() {
    return Column(children: [
      if (_activeIssues.isEmpty)
        _Card(child: const Column(children: [
          Icon(Icons.menu_book_outlined, size: 32, color: Color(0xFFE5E7EB)),
          SizedBox(height: 8),
          Text('No active issues', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13)),
        ]))
      else
        _ExpandableSection(
          title: _isOwnData ? 'My Active Issues' : 'Active Issues',
          count: _activeIssues.length,
          icon: Icons.book_outlined,
          child: Column(children: _activeIssues.map((issue) => _buildIssueRow(issue)).toList()),
        ),
      const SizedBox(height: 12),

      if (_finesLoading)
        const _Card(child: Center(child: Text('Loading fines…', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12))))
      else if (_fines.isEmpty)
        _Card(child: const Column(children: [
          Icon(Icons.check_circle_outline, size: 32, color: Color(0xFFE5E7EB)),
          SizedBox(height: 8),
          Text('No fines', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13)),
        ]))
      else
        _ExpandableSection(
          title: _isOwnData ? 'My Fines' : 'Fines',
          count: _fines.length,
          icon: Icons.receipt_outlined,
          child: Column(children: _fines.map((fine) => _buildFineRow(fine)).toList()),
        ),
    ]);
  }

  Widget _buildIssueRow(Map<String, dynamic> issue) {
    final issueId  = issue['issue_id'] as int;
    final overdue  = _isExpired(issue['due_date']);
    final renewal  = _renewalMap[issueId];
    final canRequest = _isOwnData &&
        (renewal == null || renewal['status'] == 'denied') &&
        !_requestingRenewal.contains(issueId);
    final title    = issue['Copy']?['Book']?['title'] ?? '—';
    final copyCode = issue['Copy']?['copy_code'] ?? '';

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFF9FAFB))),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
          Text(copyCode, style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF), fontFamily: 'monospace')),
          const SizedBox(height: 4),
          Text('Issued ${_fmt(issue['check_out'])}',
              style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
          if (renewal != null) ...[
            const SizedBox(height: 4),
            _RenewalBadge(status: renewal['status']),
            if (renewal['status'] == 'denied' && renewal['notes'] != null)
              Text('Note: ${renewal['notes']}',
                  style: const TextStyle(fontSize: 10, color: Color(0xFFEF4444))),
          ],
        ])),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('Due ${_fmt(issue['due_date'])}',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                  color: overdue ? const Color(0xFFDC2626) : const Color(0xFF059669))),
          if (overdue)
            const Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.warning_amber, size: 11, color: Color(0xFFEF4444)),
              SizedBox(width: 2),
              Text('Overdue', style: TextStyle(fontSize: 10, color: Color(0xFFEF4444))),
            ]),
          if (_isOwnData) ...[
            const SizedBox(height: 4),
            if (renewal?['status'] == 'pending')
              const Text('Awaiting review',
                  style: TextStyle(fontSize: 10, color: Color(0xFFF59E0B), fontWeight: FontWeight.w500))
            else if (canRequest)
              GestureDetector(
                onTap: () => _requestRenewal(issueId),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(7),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: const Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.autorenew, size: 11, color: Color(0xFF2563EB)),
                    SizedBox(width: 4),
                    Text('Request Renewal', style: TextStyle(fontSize: 10, color: Color(0xFF2563EB), fontWeight: FontWeight.w600)),
                  ]),
                ),
              ),
          ],
        ]),
      ]),
    );
  }

  Widget _buildFineRow(Map<String, dynamic> fine) {
    final amount = fine['fine'] ?? fine['amount'];
    final status = fine['status'] as String? ?? 'pending';
    final isPaid   = status == 'paid';
    final isWaived = status == 'waived';

    return GestureDetector(
      onTap: _canEdit ? () {
        if (fine['type'] == 'custom_fine') context.go('/fines/custom/${fine['payment_id']}');
        else context.go('/fines/${fine['issue_id']}');
      } : null,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFF9FAFB)))),
        child: Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(fine['book_title'] ?? fine['reason'] ?? '—',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
            Text(fine['type'] == 'custom_fine' ? 'Custom fine' : 'Late return',
                style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('₹$amount', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFFDC2626))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                color: isPaid ? const Color(0xFFECFDF5) : isWaived ? const Color(0xFFFEF3C7) : const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(isPaid ? 'Paid' : isWaived ? 'Waived' : 'Pending',
                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700,
                      color: isPaid ? const Color(0xFF059669) : isWaived ? const Color(0xFFB45309) : const Color(0xFFDC2626))),
            ),
          ]),
        ]),
      ),
    );
  }

  Widget _buildRequestsTab() {
    return _RequestsTab(
      requests: _requests,
      loading: _requestsLoading,
      cancellingIds: _cancellingIds,
      canCancel: _canEdit || _isOwnData,
      onCancel: _cancelRequest,
    );
  }

  Widget _buildEditModal() {
    return GestureDetector(
      onTap: () => setState(() => _showEditModal = false),
      child: Container(
        color: const Color(0x80000000),
        child: Center(
          child: GestureDetector(
            onTap: () {},
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              constraints: const BoxConstraints(maxWidth: 460),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
              child: SingleChildScrollView(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(_isOwnData && !_canEdit ? 'Edit My Info' : 'Edit Borrower',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 20),
                    if (_canEdit) ...[
                      _EditField(label: 'Name *', ctrl: _editNameCtrl),
                      _EditField(label: 'RF ID',  ctrl: _editRfCtrl),
                    ],
                    _EditField(label: 'Email',   ctrl: _editEmailCtrl, type: TextInputType.emailAddress),
                    _EditField(label: 'Phone',   ctrl: _editPhoneCtrl, type: TextInputType.phone),
                    _EditField(label: 'Address', ctrl: _editAddressCtrl, maxLines: 2),
                    const SizedBox(height: 16),
                    Row(children: [
                      Expanded(child: ElevatedButton(
                        onPressed: _updateBorrower,
                        style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(vertical: 13), elevation: 0),
                        child: const Text('Save Changes', style: TextStyle(fontWeight: FontWeight.w600)),
                      )),
                      const SizedBox(width: 10),
                      Expanded(child: OutlinedButton(
                        onPressed: () => setState(() => _showEditModal = false),
                        style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFFE5E7EB)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(vertical: 13)),
                        child: const Text('Cancel', style: TextStyle(color: Color(0xFF6B7280))),
                      )),
                    ]),
                  ]),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ── History Tab ───────────────────────────────────────────────────────────────

class _HistoryTab extends StatefulWidget {
  final String borrowerId;
  const _HistoryTab({required this.borrowerId});

  @override
  State<_HistoryTab> createState() => _HistoryTabState();
}

class _HistoryTabState extends State<_HistoryTab> {
  List<dynamic> _issues = [];
  bool _loading = true;
  String _filter = 'all';
  int _page = 1;
  Map<String, dynamic>? _pagination;

  @override
  void initState() { super.initState(); _fetch(); }

  Future<void> _fetch({int page = 1, String? filter}) async {
    final f = filter ?? _filter;
    setState(() { _loading = true; _page = page; _filter = f; });
    try {
      final res = await ApiService.get(
        '/borrowers/${widget.borrowerId}/issues',
        params: {'page': page, 'limit': 20, 'filter': f},
      );
      setState(() {
        _issues     = res.data['issues'] ?? [];
        _pagination = res.data['pagination'];
      });
    } catch (_) {}
    finally { if (mounted) setState(() => _loading = false); }
  }

  String _fmt(dynamic d) {
    final dt = DateTime.tryParse(d?.toString() ?? '');
    return dt == null ? '—' : '${dt.day}/${dt.month}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    const filters = [
      ('all', 'All'), ('returned', 'Returned'), ('active', 'Active'),
    ];

    return _Card(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.history, size: 16, color: Color(0xFF9CA3AF)),
          const SizedBox(width: 8),
          const Text('Reading History', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
          if ((_pagination?['total'] ?? 0) > 0) ...[
            const SizedBox(width: 8),
            _CountBadge('${_pagination!['total']}'),
          ],
        ]),
        const Divider(height: 20, color: Color(0xFFF3F4F6)),

        Row(children: filters.map((f) => GestureDetector(
          onTap: () => _fetch(page: 1, filter: f.$1),
          child: Container(
            margin: const EdgeInsets.only(right: 6),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: _filter == f.$1 ? const Color(0xFF2563EB) : Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: _filter == f.$1 ? const Color(0xFF2563EB) : const Color(0xFFE5E7EB)),
            ),
            child: Text(f.$2,
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                    color: _filter == f.$1 ? Colors.white : const Color(0xFF6B7280))),
          ),
        )).toList()),
        const SizedBox(height: 12),

        if (_loading)
          const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()))
        else if (_issues.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 32),
            child: Center(child: Text('No issue history found', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13))),
          )
        else
          Column(children: [
            ..._issues.map((issue) {
              final returned = issue['check_in'] != null;
              final overdue  = issue['was_overdue'] == true;
              final hasFine  = (issue['fine'] as num? ?? 0) > 0;

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(issue['book_title'] ?? '—',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
                    Text(issue['copy_code'] ?? '',
                        style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Color(0xFF9CA3AF))),
                    const SizedBox(height: 6),
                    Text('Borrowed ${_fmt(issue['check_out'])}',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                    if (returned)
                      Text('Returned ${_fmt(issue['check_in'])}',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF059669)))
                    else
                      Text('Due ${_fmt(issue['due_date'])}${overdue ? ' · Overdue' : ''}',
                          style: TextStyle(fontSize: 11, fontWeight: overdue ? FontWeight.w700 : FontWeight.normal,
                              color: overdue ? const Color(0xFFDC2626) : const Color(0xFF2563EB))),
                  ])),
                  Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                    _StatusBadge(
                      label: returned ? 'Returned' : overdue ? 'Overdue' : 'Active',
                      color: returned ? const Color(0xFF059669) : overdue ? const Color(0xFFDC2626) : const Color(0xFF2563EB),
                      bg: returned ? const Color(0xFFECFDF5) : overdue ? const Color(0xFFFEF2F2) : const Color(0xFFEFF6FF),
                      border: returned ? const Color(0xFFA7F3D0) : overdue ? const Color(0xFFFECACA) : const Color(0xFFBFDBFE),
                    ),
                    if (hasFine) ...[
                      const SizedBox(height: 4),
                      _StatusBadge(
                        label: '₹${issue['fine']} ${issue['fine_paid'] == true ? 'paid' : 'fine'}',
                        color: issue['fine_paid'] == true ? const Color(0xFF6B7280) : const Color(0xFFDC2626),
                        bg: issue['fine_paid'] == true ? const Color(0xFFF3F4F6) : const Color(0xFFFEF2F2),
                        border: issue['fine_paid'] == true ? const Color(0xFFE5E7EB) : const Color(0xFFFECACA),
                      ),
                    ],
                  ]),
                ]),
              );
            }),

            if ((_pagination?['totalPages'] ?? 1) > 1)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                  GestureDetector(
                    onTap: _page > 1 ? () => _fetch(page: _page - 1) : null,
                    child: _PageBtn(label: '← Prev', enabled: _page > 1),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: _pagination?['hasMore'] == true ? () => _fetch(page: _page + 1) : null,
                    child: _PageBtn(label: 'Next →', enabled: _pagination?['hasMore'] == true),
                  ),
                ]),
              ),
          ]),
      ]),
    );
  }
}

// ── Requests Tab ──────────────────────────────────────────────────────────────

class _RequestsTab extends StatefulWidget {
  final List<dynamic> requests;
  final bool loading;
  final Set<int> cancellingIds;
  final bool canCancel;
  final Function(int) onCancel;

  const _RequestsTab({
    required this.requests, required this.loading, required this.cancellingIds,
    required this.canCancel, required this.onCancel,
  });

  @override
  State<_RequestsTab> createState() => _RequestsTabState();
}

class _RequestsTabState extends State<_RequestsTab> {
  String _filter = 'all';

  String _fmt(dynamic d) {
    final dt = DateTime.tryParse(d?.toString() ?? '');
    return dt == null ? '—' : '${dt.day}/${dt.month}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    const statuses = ['all', 'pending', 'fulfilled', 'cancelled', 'expired'];

    final filtered = _filter == 'all'
        ? widget.requests
        : widget.requests.where((r) => r['status'] == _filter).toList();

    return _Card(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.inbox_outlined, size: 16, color: Color(0xFF9CA3AF)),
          const SizedBox(width: 8),
          const Text('Requests', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
          if (widget.requests.isNotEmpty) ...[
            const SizedBox(width: 8),
            _CountBadge('${widget.requests.length}'),
          ],
        ]),
        const Divider(height: 20, color: Color(0xFFF3F4F6)),

        Wrap(spacing: 6, runSpacing: 6, children: statuses.map((s) => GestureDetector(
          onTap: () => setState(() => _filter = s),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: _filter == s ? const Color(0xFF2563EB) : Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: _filter == s ? const Color(0xFF2563EB) : const Color(0xFFE5E7EB)),
            ),
            child: Text(s[0].toUpperCase() + s.substring(1),
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                    color: _filter == s ? Colors.white : const Color(0xFF6B7280))),
          ),
        )).toList()),
        const SizedBox(height: 12),

        if (widget.loading)
          const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()))
        else if (filtered.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 32),
            child: Center(child: Text('No requests found', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13))),
          )
        else
          Column(children: filtered.map((req) {
            final status    = req['status'] as String? ?? '';
            final isPending = status == 'pending';
            final reqId     = req['request_id'] as int;
            final isCancelling = widget.cancellingIds.contains(reqId);

            final (Color statusColor, Color statusBg, Color statusBorder) = switch (status) {
              'pending'   => (const Color(0xFFB45309), const Color(0xFFFEF3C7), const Color(0xFFFDE68A)),
              'fulfilled' => (const Color(0xFF059669), const Color(0xFFECFDF5), const Color(0xFFA7F3D0)),
              'cancelled' => (const Color(0xFFDC2626), const Color(0xFFFEF2F2), const Color(0xFFFECACA)),
              _           => (const Color(0xFF6B7280), const Color(0xFFF3F4F6), const Color(0xFFE5E7EB)),
            };

            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFFE5E7EB)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    _StatusBadge(label: status, color: statusColor, bg: statusBg, border: statusBorder),
                    const SizedBox(width: 8),
                    Text('#$reqId', style: const TextStyle(fontSize: 10, color: Color(0xFFD1D5DB))),
                  ]),
                  const SizedBox(height: 6),
                  Text(req['Copy']?['Book']?['title'] ?? '—',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
                  Text(req['Copy']?['copy_code'] ?? '',
                      style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Color(0xFF9CA3AF))),
                  const SizedBox(height: 4),
                  Text('Requested ${_fmt(req['request_date'])}',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                ])),
                if (isPending && widget.canCancel)
                  GestureDetector(
                    onTap: isCancelling ? null : () => widget.onCancel(reqId),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(7),
                        border: Border.all(color: const Color(0xFFFECACA)),
                      ),
                      child: Text(isCancelling ? '…' : 'Cancel',
                          style: const TextStyle(fontSize: 11, color: Color(0xFFDC2626), fontWeight: FontWeight.w600)),
                    ),
                  ),
              ]),
            );
          }).toList()),
      ]),
    );
  }
}

// ── Shared small widgets ──────────────────────────────────────────────────────

class _Card extends StatelessWidget {
  final Widget child;
  const _Card({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: child,
    );
  }
}

class _ExpandableSection extends StatefulWidget {
  final String title;
  final int count;
  final IconData icon;
  final Widget child;

  const _ExpandableSection({required this.title, required this.count, required this.icon, required this.child});

  @override
  State<_ExpandableSection> createState() => _ExpandableSectionState();
}

class _ExpandableSectionState extends State<_ExpandableSection> {
  bool _expanded = true;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(children: [
        GestureDetector(
          onTap: () => setState(() => _expanded = !_expanded),
          behavior: HitTestBehavior.opaque,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Icon(widget.icon, size: 16, color: const Color(0xFF9CA3AF)),
              const SizedBox(width: 8),
              Text(widget.title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
              const SizedBox(width: 8),
              _CountBadge('${widget.count}'),
              const Spacer(),
              Icon(_expanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                  size: 16, color: const Color(0xFF9CA3AF)),
            ]),
          ),
        ),
        if (_expanded) ...[
          const Divider(height: 1, color: Color(0xFFF3F4F6)),
          Padding(padding: const EdgeInsets.fromLTRB(16, 8, 16, 16), child: widget.child),
        ],
      ]),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Color color;
  const _StatCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 8),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF1F2937))),
          Text(label, style: const TextStyle(fontSize: 9, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w500)),
        ]),
      ]),
    );
  }
}

class _HeaderBtn extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color bg, color;
  final VoidCallback onTap;
  const _HeaderBtn({required this.label, required this.icon, required this.bg, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: bg, borderRadius: BorderRadius.circular(8),
          border: bg == Colors.white ? Border.all(color: const Color(0xFFE5E7EB)) : null,
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 5),
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
        ]),
      ),
    );
  }
}

class _RenewalBadge extends StatelessWidget {
  final String status;
  const _RenewalBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final cfg = switch (status) {
      'pending'  => (label: 'Renewal Pending',  color: const Color(0xFFB45309), bg: const Color(0xFFFEF3C7), border: const Color(0xFFFDE68A)),
      'approved' => (label: 'Renewal Approved', color: const Color(0xFF059669), bg: const Color(0xFFECFDF5), border: const Color(0xFFA7F3D0)),
      'denied'   => (label: 'Renewal Denied',   color: const Color(0xFFDC2626), bg: const Color(0xFFFEF2F2), border: const Color(0xFFFECACA)),
      _          => (label: status,              color: const Color(0xFF6B7280), bg: const Color(0xFFF3F4F6), border: const Color(0xFFE5E7EB)),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: cfg.bg, borderRadius: BorderRadius.circular(6),
        border: Border.all(color: cfg.border),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.autorenew, size: 10),
        const SizedBox(width: 3),
        Text(cfg.label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: cfg.color)),
      ]),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String label;
  final Color color, bg, border;
  const _StatusBadge({required this.label, required this.color, required this.bg, required this.border});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20), border: Border.all(color: border)),
      child: Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: color)),
    );
  }
}

class _CountBadge extends StatelessWidget {
  final String value;
  const _CountBadge(this.value);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(20)),
      child: Text(value, style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280), fontWeight: FontWeight.w500)),
    );
  }
}

class _ProfileRow extends StatelessWidget {
  final String label, value;
  const _ProfileRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
        const Spacer(),
        Flexible(child: Text(value,
            textAlign: TextAlign.end,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF374151)))),
      ]),
    );
  }
}

class _EditField extends StatelessWidget {
  final String label;
  final TextEditingController ctrl;
  final TextInputType? type;
  final int? maxLines;
  const _EditField({required this.label, required this.ctrl, this.type, this.maxLines});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF4B5563))),
      const SizedBox(height: 5),
      TextField(
        controller: ctrl,
        keyboardType: type,
        maxLines: maxLines,
        style: const TextStyle(fontSize: 13),
        decoration: InputDecoration(
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF93C5FD), width: 1.5)),
        ),
      ),
      const SizedBox(height: 12),
    ]);
  }
}

class _PageBtn extends StatelessWidget {
  final String label;
  final bool enabled;
  const _PageBtn({required this.label, required this.enabled});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFE5E7EB)),
        borderRadius: BorderRadius.circular(7),
      ),
      child: Text(label,
          style: TextStyle(fontSize: 12, color: enabled ? const Color(0xFF374151) : const Color(0xFFD1D5DB))),
    );
  }
}