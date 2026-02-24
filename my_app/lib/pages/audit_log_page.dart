// lib/pages/audit_log_page.dart
import 'package:flutter/material.dart';
import '../services/api.dart';

class AuditLogPage extends StatefulWidget {
  const AuditLogPage({super.key});

  @override
  State<AuditLogPage> createState() => _AuditLogPageState();
}

class _AuditLogPageState extends State<AuditLogPage> {
  List<dynamic> _logs = [];
  List<String> _actions = [];
  bool _loading = true;
  int _page = 1;
  int _totalPages = 1;
  int _total = 0;
  int? _expandedId;

  final _searchCtrl = TextEditingController();
  String _selectedAction = '';
  String _selectedTarget = '';
  String _dateFrom = '';
  String _dateTo = '';
  bool _filtersOpen = false;

  static const _targets = ['', 'ISSUE', 'BORROWER', 'COPY', 'FINE', 'USER'];
  static const _targetLabels = {
    'ISSUE': 'Issue',
    'BORROWER': 'Borrower',
    'COPY': 'Copy',
    'FINE': 'Fine',
    'USER': 'User',
  };

  static const _actionMeta = <String, _ActionMeta>{
    'BOOK_ISSUED':          _ActionMeta('Issued',             Color(0xFF3B82F6), Color(0xFFEFF6FF), Color(0xFF1D4ED8), Color(0xFFBFDBFE)),
    'BOOK_RETURNED':        _ActionMeta('Returned',           Color(0xFF94A3B8), Color(0xFFF8FAFC), Color(0xFF475569), Color(0xFFE2E8F0)),
    'BOOK_RENEWED':         _ActionMeta('Renewed',            Color(0xFF06B6D4), Color(0xFFECFEFF), Color(0xFF0E7490), Color(0xFFA5F3FC)),
    'RENEWAL_APPROVED':     _ActionMeta('Renewal Approved',   Color(0xFF10B981), Color(0xFFECFDF5), Color(0xFF065F46), Color(0xFFA7F3D0)),
    'RENEWAL_DENIED':       _ActionMeta('Renewal Denied',     Color(0xFFF87171), Color(0xFFFEF2F2), Color(0xFFB91C1C), Color(0xFFFECACA)),
    'FINE_PAID':            _ActionMeta('Fine Paid',          Color(0xFF10B981), Color(0xFFECFDF5), Color(0xFF065F46), Color(0xFFA7F3D0)),
    'FINE_WAIVED':          _ActionMeta('Fine Waived',        Color(0xFF8B5CF6), Color(0xFFF5F3FF), Color(0xFF5B21B6), Color(0xFFDDD6FE)),
    'FINE_CUSTOM_CREATED':  _ActionMeta('Custom Fine',        Color(0xFFF97316), Color(0xFFFFF7ED), Color(0xFFC2410C), Color(0xFFFED7AA)),
    'REPLACEMENT_FINE':     _ActionMeta('Replacement Fine',   Color(0xFFEF4444), Color(0xFFFEF2F2), Color(0xFFB91C1C), Color(0xFFFECACA)),
    'COPY_ADDED':           _ActionMeta('Copy Added',         Color(0xFF14B8A6), Color(0xFFF0FDFA), Color(0xFF0F766E), Color(0xFF99F6E4)),
    'COPY_DELETED':         _ActionMeta('Copy Deleted',       Color(0xFFF87171), Color(0xFFFEF2F2), Color(0xFFB91C1C), Color(0xFFFECACA)),
    'COPY_MARKED_LOST':     _ActionMeta('Marked Lost',        Color(0xFFDC2626), Color(0xFFFEF2F2), Color(0xFF7F1D1D), Color(0xFFFCA5A5)),
    'COPY_RESTORED':        _ActionMeta('Copy Restored',      Color(0xFF34D399), Color(0xFFECFDF5), Color(0xFF065F46), Color(0xFFA7F3D0)),
    'BORROWER_CREATED':     _ActionMeta('Borrower Created',   Color(0xFF60A5FA), Color(0xFFEFF6FF), Color(0xFF1E40AF), Color(0xFFBFDBFE)),
    'BORROWER_UPDATED':     _ActionMeta('Borrower Updated',   Color(0xFFFBBF24), Color(0xFFFFFBEB), Color(0xFF92400E), Color(0xFFFDE68A)),
    'BORROWER_DELETED':     _ActionMeta('Borrower Deleted',   Color(0xFFEF4444), Color(0xFFFEF2F2), Color(0xFFB91C1C), Color(0xFFFECACA)),
    'MEMBERSHIP_RENEWED':   _ActionMeta('Membership Renewed', Color(0xFF6366F1), Color(0xFFEEF2FF), Color(0xFF3730A3), Color(0xFFC7D2FE)),
    'CSV_IMPORT':           _ActionMeta('CSV Import',         Color(0xFF059669), Color(0xFFECFDF5), Color(0xFF064E3B), Color(0xFFA7F3D0)),
    'USER_CREATED':         _ActionMeta('User Created',       Color(0xFF38BDF8), Color(0xFFF0F9FF), Color(0xFF0369A1), Color(0xFFBAE6FD)),
    'USER_ROLE_CHANGED':    _ActionMeta('Role Changed',       Color(0xFFA855F7), Color(0xFFFAF5FF), Color(0xFF6B21A8), Color(0xFFE9D5FF)),
    'USER_DELETED':         _ActionMeta('User Deleted',       Color(0xFFEF4444), Color(0xFFFEF2F2), Color(0xFFB91C1C), Color(0xFFFECACA)),
    'LOGIN':                _ActionMeta('Login',              Color(0xFF9CA3AF), Color(0xFFF9FAFB), Color(0xFF374151), Color(0xFFE5E7EB)),
    'PASSWORD_RESET':       _ActionMeta('Password Reset',     Color(0xFFF59E0B), Color(0xFFFFFBEB), Color(0xFF92400E), Color(0xFFFDE68A)),
    'ACCOUNT_CREATED_FOR_BORROWER': _ActionMeta('Account Created', Color(0xFF38BDF8), Color(0xFFF0F9FF), Color(0xFF0369A1), Color(0xFFBAE6FD)),
  };

  static _ActionMeta _meta(String action) =>
      _actionMeta[action] ?? const _ActionMeta('Unknown', Color(0xFF9CA3AF), Color(0xFFF9FAFB), Color(0xFF374151), Color(0xFFE5E7EB));

  @override
  void initState() {
    super.initState();
    _fetch();
    _fetchActions();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetch({int page = 1}) async {
    setState(() { _loading = true; _page = page; });
    try {
      final params = <String, dynamic>{'page': page, 'limit': 50};
      if (_searchCtrl.text.isNotEmpty) params['search'] = _searchCtrl.text;
      if (_selectedAction.isNotEmpty) params['action'] = _selectedAction;
      if (_selectedTarget.isNotEmpty) params['target_type'] = _selectedTarget;
      if (_dateFrom.isNotEmpty) params['date_from'] = _dateFrom;
      if (_dateTo.isNotEmpty) params['date_to'] = _dateTo;

      final res = await ApiService.get('/audit-logs', params: params);
      final pagination = res.data['pagination'] as Map<String, dynamic>? ?? {};
      setState(() {
        _logs = res.data['logs'] ?? [];
        _total = (pagination['total'] as int?) ?? 0;
        _totalPages = (pagination['totalPages'] as int?) ?? 1;
      });
    } catch (_) {}
    finally { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _fetchActions() async {
    try {
      final res = await ApiService.get('/audit-logs/actions');
      setState(() => _actions = List<String>.from(res.data['actions'] ?? []));
    } catch (_) {}
  }

  void _clearFilters() {
    setState(() {
      _searchCtrl.clear();
      _selectedAction = '';
      _selectedTarget = '';
      _dateFrom = '';
      _dateTo = '';
    });
    _fetch(page: 1);
  }

  bool get _hasFilters =>
      _searchCtrl.text.isNotEmpty || _selectedAction.isNotEmpty ||
      _selectedTarget.isNotEmpty || _dateFrom.isNotEmpty || _dateTo.isNotEmpty;

  String _fmt(String? iso) {
    if (iso == null) return '—';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '—';
    final local = dt.toLocal();
    final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
    final min = local.minute.toString().padLeft(2, '0');
    final ampm = local.hour >= 12 ? 'PM' : 'AM';
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${local.day.toString().padLeft(2, '0')} ${months[local.month - 1]} ${local.year}, $hour:$min $ampm';
  }

  String _fmtDateShort(String? iso) {
    if (iso == null) return '—';
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null) return '—';
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${dt.day.toString().padLeft(2, '0')} ${months[dt.month - 1]}';
  }

  String _fmtTime(String? iso) {
    if (iso == null) return '—';
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null) return '—';
    final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
    final min = dt.minute.toString().padLeft(2, '0');
    return '$hour:$min ${dt.hour >= 12 ? 'PM' : 'AM'}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

            // ── Header ──
            Row(children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.security, color: Color(0xFFCBD5E1), size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Audit Log', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF1F2937))),
                Text('$_total events recorded', style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
              ])),
              _HeaderBtn(label: 'Refresh', icon: Icons.refresh, onTap: () => _fetch(page: _page)),
            ]),
            const SizedBox(height: 16),

            // ── Search & Filters ──
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(children: [

                // Search field (full width)
                Container(
                  height: 40,
                  decoration: BoxDecoration(
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(children: [
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 10),
                      child: Icon(Icons.search, size: 16, color: Color(0xFF9CA3AF)),
                    ),
                    Expanded(child: TextField(
                      controller: _searchCtrl,
                      onChanged: (_) { setState(() {}); _fetch(page: 1); },
                      style: const TextStyle(fontSize: 13),
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        hintText: 'Search by name, action, target ID…',
                        hintStyle: TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
                        isDense: true,
                      ),
                    )),
                    if (_searchCtrl.text.isNotEmpty)
                      GestureDetector(
                        onTap: () { _searchCtrl.clear(); _fetch(page: 1); },
                        child: const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 8),
                          child: Icon(Icons.close, size: 14, color: Color(0xFFD1D5DB)),
                        ),
                      ),
                  ]),
                ),
                const SizedBox(height: 8),

                // Action dropdown + filters toggle (row, wraps on tiny screens)
                Row(children: [
                  // Action dropdown
                  Expanded(child: Container(
                    height: 38,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedAction,
                        isExpanded: true,
                        hint: const Text('All actions', style: TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                        style: const TextStyle(fontSize: 11, color: Color(0xFF374151)),
                        isDense: true,
                        items: [
                          const DropdownMenuItem(value: '', child: Text('All actions')),
                          ...(_actions.isNotEmpty ? _actions : _actionMeta.keys.toList()).map((a) =>
                              DropdownMenuItem(value: a, child: Text(_meta(a).label))),
                        ],
                        onChanged: (v) { setState(() => _selectedAction = v ?? ''); _fetch(page: 1); },
                      ),
                    ),
                  )),
                  const SizedBox(width: 8),

                  // Filters toggle
                  GestureDetector(
                    onTap: () => setState(() => _filtersOpen = !_filtersOpen),
                    child: Container(
                      height: 38,
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: _filtersOpen ? const Color(0xFFF1F5F9) : Colors.white,
                        border: Border.all(color: _filtersOpen ? const Color(0xFFCBD5E1) : const Color(0xFFE5E7EB)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.tune, size: 14, color: Color(0xFF6B7280)),
                        const SizedBox(width: 4),
                        const Text('Filters', style: TextStyle(fontSize: 11, color: Color(0xFF6B7280), fontWeight: FontWeight.w600)),
                        const SizedBox(width: 4),
                        Icon(_filtersOpen ? Icons.expand_less : Icons.expand_more, size: 14, color: const Color(0xFF9CA3AF)),
                      ]),
                    ),
                  ),

                  if (_hasFilters) ...[
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: _clearFilters,
                      child: const Text('Clear', style: TextStyle(fontSize: 11, color: Color(0xFFDC2626), fontWeight: FontWeight.w600)),
                    ),
                  ],
                ]),

                // Extended filters
                if (_filtersOpen) ...[
                  const SizedBox(height: 12),
                  const Divider(height: 1, color: Color(0xFFF3F4F6)),
                  const SizedBox(height: 12),
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Target Type', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
                    const SizedBox(height: 8),
                    Wrap(spacing: 6, runSpacing: 6, children: _targets.map((t) {
                      final active = _selectedTarget == t;
                      return GestureDetector(
                        onTap: () { setState(() => _selectedTarget = t); _fetch(page: 1); },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: active ? const Color(0xFF1E293B) : Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: active ? const Color(0xFF1E293B) : const Color(0xFFE5E7EB)),
                          ),
                          child: Text(
                            t.isEmpty ? 'All' : (_targetLabels[t] ?? t),
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                                color: active ? Colors.white : const Color(0xFF6B7280)),
                          ),
                        ),
                      );
                    }).toList()),
                  ]),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(child: _DateField(label: 'From date', value: _dateFrom,
                        onChanged: (v) { setState(() => _dateFrom = v); _fetch(page: 1); })),
                    const SizedBox(width: 12),
                    Expanded(child: _DateField(label: 'To date', value: _dateTo,
                        onChanged: (v) { setState(() => _dateTo = v); _fetch(page: 1); })),
                  ]),
                ],
              ]),
            ),
            const SizedBox(height: 12),

            // ── Log entries ──
            if (_loading)
              const Center(child: Padding(
                padding: EdgeInsets.all(48),
                child: CircularProgressIndicator(color: Color(0xFF2563EB)),
              ))
            else if (_logs.isEmpty)
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                padding: const EdgeInsets.all(48),
                child: Column(children: [
                  const Icon(Icons.security, size: 40, color: Color(0xFFE5E7EB)),
                  const SizedBox(height: 12),
                  const Text('No log entries found',
                      style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w600)),
                  if (_hasFilters) ...[
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: _clearFilters,
                      child: const Text('Clear filters', style: TextStyle(fontSize: 12, color: Color(0xFF2563EB))),
                    ),
                  ],
                ]),
              )
            else
              Column(children: [
                ..._logs.asMap().entries.map((e) {
                  final entry = e.value as Map<String, dynamic>;
                  final id = entry['id'] as int?;
                  final meta = _meta(entry['action'] as String? ?? '');
                  final isExp = _expandedId == id;

                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isExp ? const Color(0xFFCBD5E1) : const Color(0xFFE5E7EB),
                      ),
                    ),
                    child: Column(children: [
                      // ── Card header (always visible) ──
                      GestureDetector(
                        onTap: () => setState(() => _expandedId = isExp ? null : id),
                        behavior: HitTestBehavior.opaque,
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            // Left: date + time stacked
                            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(_fmtDateShort(entry['createdAt'] as String?),
                                  style: const TextStyle(fontSize: 11, fontFamily: 'monospace',
                                      fontWeight: FontWeight.w600, color: Color(0xFF374151))),
                              Text(_fmtTime(entry['createdAt'] as String?),
                                  style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Color(0xFF9CA3AF))),
                            ]),
                            const SizedBox(width: 10),

                            // Center: action badge + performer
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              _ActionBadge(label: meta.label, meta: meta),
                              const SizedBox(height: 6),
                              Row(children: [
                                Container(
                                  width: 20, height: 20,
                                  decoration: const BoxDecoration(
                                    gradient: LinearGradient(colors: [Color(0xFF64748B), Color(0xFF475569)]),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(child: Text(
                                    ((entry['performed_by_name'] as String?) ?? 'S')[0].toUpperCase(),
                                    style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                                  )),
                                ),
                                const SizedBox(width: 5),
                                Flexible(child: Text(
                                  entry['performed_by_name'] as String? ?? '—',
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF374151)),
                                  overflow: TextOverflow.ellipsis,
                                )),
                              ]),
                            ])),

                            // Right: target chip + chevron
                            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                              if (entry['target_type'] != null)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF3F4F6),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    _targetLabels[entry['target_type']] ?? entry['target_type'] as String,
                                    style: const TextStyle(fontSize: 10, color: Color(0xFF6B7280), fontWeight: FontWeight.w500),
                                  ),
                                ),
                              if (entry['target_id'] != null) ...[
                                const SizedBox(height: 3),
                                Text('#${entry['target_id']}',
                                    style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Color(0xFF9CA3AF))),
                              ],
                              const SizedBox(height: 4),
                              Icon(isExp ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                  size: 16, color: const Color(0xFFD1D5DB)),
                            ]),
                          ]),
                        ),
                      ),

                      // ── Expanded details ──
                      if (isExp) _ExpandedRow(entry: entry, fmt: _fmt),
                    ]),
                  );
                }),

                // Pagination
                if (_totalPages > 1)
                  Container(
                    margin: const EdgeInsets.only(top: 4),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                    ),
                    child: Column(children: [
                      Text(
                        'Showing ${((_page - 1) * 50) + 1}–${(_page * 50).clamp(0, _total)} of $_total events',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                      ),
                      const SizedBox(height: 8),
                      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                        _PageBtn(label: '← Prev', enabled: _page > 1,
                            onTap: () => _fetch(page: _page - 1)),
                        const SizedBox(width: 16),
                        Text('$_page / $_totalPages',
                            style: const TextStyle(fontSize: 12, color: Color(0xFF374151), fontWeight: FontWeight.w600)),
                        const SizedBox(width: 16),
                        _PageBtn(label: 'Next →', enabled: _page < _totalPages,
                            onTap: () => _fetch(page: _page + 1)),
                      ]),
                    ]),
                  ),
              ]),

            if (_logs.isNotEmpty) ...[
              const SizedBox(height: 8),
              const Center(child: Text('Tap any card to expand full details',
                  style: TextStyle(fontSize: 11, color: Color(0xFFD1D5DB)))),
            ],
          ]),
        ),
      ),
    );
  }
}

// ── Expanded detail row ──────────────────────────────────────────────────────

class _ExpandedRow extends StatelessWidget {
  final Map<String, dynamic> entry;
  final String Function(String?) fmt;
  const _ExpandedRow({required this.entry, required this.fmt});

  @override
  Widget build(BuildContext context) {
    final raw = entry['details'];
    Map<String, dynamic>? parsed;
    if (raw is Map<String, dynamic>) parsed = raw;

    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFFF8FAFC),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(12),
          bottomRight: Radius.circular(12),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Divider(height: 16, color: Color(0xFFE2E8F0)),
        // Timestamp + IP
        Row(children: [
          const Icon(Icons.access_time, size: 12, color: Color(0xFF9CA3AF)),
          const SizedBox(width: 6),
          Flexible(child: Text(fmt(entry['createdAt'] as String?),
              style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: Color(0xFF374151)))),
        ]),
        if ((entry['ip_address'] as String?)?.isNotEmpty == true) ...[
          const SizedBox(height: 4),
          Row(children: [
            const Icon(Icons.router_outlined, size: 12, color: Color(0xFF9CA3AF)),
            const SizedBox(width: 6),
            Text(entry['ip_address'] as String,
                style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: Color(0xFF374151))),
          ]),
        ],

        // Details
        if (parsed != null && parsed.isNotEmpty) ...[
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Wrap(spacing: 20, runSpacing: 8, children: parsed.entries
                .where((e) => e.value != null)
                .map((e) => Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
              Text(e.key.replaceAll('_', ' ').toUpperCase(),
                  style: const TextStyle(fontSize: 9, color: Color(0xFF9CA3AF), letterSpacing: 0.5, fontWeight: FontWeight.w600)),
              const SizedBox(height: 2),
              Text('${e.value}',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
            ])).toList(),
          )),
        ],
      ]),
    );
  }
}

// ── Shared small widgets ─────────────────────────────────────────────────────

class _ActionMeta {
  final String label;
  final Color dot, bg, text, border;
  const _ActionMeta(this.label, this.dot, this.bg, this.text, this.border);
}

class _ActionBadge extends StatelessWidget {
  final String label;
  final _ActionMeta meta;
  const _ActionBadge({required this.label, required this.meta});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: meta.bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: meta.border),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 6, height: 6,
            decoration: BoxDecoration(color: meta.dot, shape: BoxShape.circle)),
        const SizedBox(width: 5),
        Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: meta.text)),
      ]),
    );
  }
}

class _HeaderBtn extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  const _HeaderBtn({required this.label, required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 14, color: const Color(0xFF6B7280)),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
        ]),
      ),
    );
  }
}

class _PageBtn extends StatelessWidget {
  final String label;
  final bool enabled;
  final VoidCallback onTap;
  const _PageBtn({required this.label, required this.enabled, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: enabled ? const Color(0xFF1E293B) : Colors.white,
          border: Border.all(color: const Color(0xFFE5E7EB)),
          borderRadius: BorderRadius.circular(7),
        ),
        child: Text(label, style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: enabled ? Colors.white : const Color(0xFFD1D5DB))),
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  final String label, value;
  final ValueChanged<String> onChanged;
  const _DateField({required this.label, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
      const SizedBox(height: 6),
      GestureDetector(
        onTap: () async {
          final picked = await showDatePicker(
            context: context,
            initialDate: value.isNotEmpty ? DateTime.tryParse(value) ?? DateTime.now() : DateTime.now(),
            firstDate: DateTime(2020),
            lastDate: DateTime.now(),
          );
          if (picked != null) {
            onChanged('${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}');
          }
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFE5E7EB)),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(children: [
            const Icon(Icons.calendar_today_outlined, size: 13, color: Color(0xFF9CA3AF)),
            const SizedBox(width: 8),
            Flexible(child: Text(
              value.isNotEmpty ? value : 'Select date',
              style: TextStyle(fontSize: 12, color: value.isNotEmpty ? const Color(0xFF374151) : const Color(0xFF9CA3AF)),
            )),
          ]),
        ),
      ),
    ]);
  }
}