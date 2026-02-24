// lib/pages/dashboard_page.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';
import '../utils/auth.dart';

// ── Notice type config ─────────────────────────────────────────────────────

class _NoticeType {
  final String label;
  final Color bg, border, text, subtext;
  final IconData icon;
  const _NoticeType({
    required this.label,
    required this.bg,
    required this.border,
    required this.text,
    required this.subtext,
    required this.icon,
  });
}

final _noticeTypes = {
  'info':    _NoticeType(label: 'Info',    bg: const Color(0xFFEFF6FF), border: const Color(0xFFBFDBFE), text: const Color(0xFF1E40AF), subtext: const Color(0xFF60A5FA), icon: Icons.info_outline),
  'warning': _NoticeType(label: 'Warning', bg: const Color(0xFFFFFBEB), border: const Color(0xFFFDE68A), text: const Color(0xFF92400E), subtext: const Color(0xFFFBBF24), icon: Icons.warning_amber_outlined),
  'closed':  _NoticeType(label: 'Closed',  bg: const Color(0xFFFEF2F2), border: const Color(0xFFFECACA), text: const Color(0xFF991B1B), subtext: const Color(0xFFF87171), icon: Icons.cancel_outlined),
  'event':   _NoticeType(label: 'Event',   bg: const Color(0xFFF5F3FF), border: const Color(0xFFDDD6FE), text: const Color(0xFF5B21B6), subtext: const Color(0xFFA78BFA), icon: Icons.event_outlined),
};

// ── Stat card colors ───────────────────────────────────────────────────────

final _statColors = {
  'blue':    {'bg': const Color(0xFFEFF6FF), 'icon': const Color(0xFF3B82F6), 'bar': const Color(0xFF3B82F6)},
  'purple':  {'bg': const Color(0xFFF5F3FF), 'icon': const Color(0xFF8B5CF6), 'bar': const Color(0xFF8B5CF6)},
  'emerald': {'bg': const Color(0xFFECFDF5), 'icon': const Color(0xFF10B981), 'bar': const Color(0xFF10B981)},
  'amber':   {'bg': const Color(0xFFFFFBEB), 'icon': const Color(0xFFF59E0B), 'bar': const Color(0xFFF59E0B)},
  'gray':    {'bg': const Color(0xFFF3F4F6), 'icon': const Color(0xFF6B7280), 'bar': const Color(0xFF9CA3AF)},
  'red':     {'bg': const Color(0xFFFEF2F2), 'icon': const Color(0xFFEF4444), 'bar': const Color(0xFFEF4444)},
};

// ── Dashboard page ─────────────────────────────────────────────────────────

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  Map<String, dynamic>? _stats;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchStats();
  }

  Future<void> _fetchStats() async {
    try {
      final dashRes = await ApiService.get('/dashboard');
      Map<String, dynamic>? fineStats;
      if (AuthService.isLibrarian()) {
        final fineRes = await ApiService.get('/fines/stats');
        fineStats = fineRes.data['stats'];
      }
      setState(() {
        _stats = {...(dashRes.data as Map<String, dynamic>), 'fineStats': fineStats};
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: Color(0xFF2563EB)),
            SizedBox(height: 12),
            Text('Loading dashboard…', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 14)),
          ],
        ),
      );
    }

    if (_stats == null) {
      return Container(
        margin: const EdgeInsets.all(24),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF2F2),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFFECACA)),
        ),
        child: const Text('Error loading dashboard. Please try again.', style: TextStyle(color: Color(0xFF991B1B), fontSize: 14)),
      );
    }

    final user = AuthService.getCurrentUser();
    final isLibrarian = AuthService.isLibrarian();

    // Build stat cards
    final statCards = [
      {'title': 'Total Books',  'value': '${_stats!['totalBooks'] ?? 0}',  'color': 'blue',   'icon': Icons.menu_book},
      {'title': 'Total Copies', 'value': '${_stats!['totalCopies'] ?? 0}', 'color': 'purple', 'icon': Icons.copy},
      if (isLibrarian) ...[
        {'title': 'Total Borrowers',  'value': '${_stats!['totalBorrowers'] ?? 0}', 'color': 'emerald', 'icon': Icons.group},
        {'title': 'Currently Issued', 'value': '${_stats!['issuedBooks'] ?? 0}',    'color': 'amber',   'icon': Icons.check_circle_outline},
        {'title': 'Total Returned',   'value': '${_stats!['returnedBooks'] ?? 0}',  'color': 'gray',    'icon': Icons.assignment_return_outlined},
        if (_stats!['fineStats'] != null)
          {'title': 'Outstanding Fines', 'value': '₹${_stats!['fineStats']['total_outstanding'] ?? 0}', 'color': 'red', 'icon': Icons.currency_rupee},
      ],
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Text('Dashboard', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
          const SizedBox(height: 4),
          RichText(
            text: TextSpan(
              style: const TextStyle(fontSize: 14, color: Color(0xFF9CA3AF)),
              children: [
                const TextSpan(text: 'Welcome back, '),
                TextSpan(text: user?['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF4B5563))),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Stat cards — responsive grid
          LayoutBuilder(
            builder: (context, constraints) {
              // columns: 1 on small, 2 on medium, 3 on large
              final cols = constraints.maxWidth < 480 ? 1 : constraints.maxWidth < 768 ? 2 : 3;
              return _StatGrid(cards: statCards, cols: cols);
            },
          ),

          const SizedBox(height: 24),

          // Notice board + Quick actions
          LayoutBuilder(
            builder: (context, constraints) {
              final wide = constraints.maxWidth >= 900;
              if (wide) {
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(flex: 2, child: _NoticeBoard(user: user)),
                    const SizedBox(width: 20),
                    if (isLibrarian)
                      Expanded(child: _QuickActions()),
                  ],
                );
              }
              return Column(
                children: [
                  _NoticeBoard(user: user),
                  if (isLibrarian) ...[
                    const SizedBox(height: 20),
                    _QuickActions(),
                  ],
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

// ── Stat grid ──────────────────────────────────────────────────────────────

class _StatGrid extends StatelessWidget {
  final List<Map<String, dynamic>> cards;
  final int cols;

  const _StatGrid({required this.cards, required this.cols});

  @override
  Widget build(BuildContext context) {
    final rows = <Widget>[];
    for (var i = 0; i < cards.length; i += cols) {
      final rowCards = cards.sublist(i, (i + cols).clamp(0, cards.length));
      rows.add(
        Row(
          children: rowCards.map((card) {
            final c = _statColors[card['color']] ?? _statColors['blue']!;
            return Expanded(
              child: Container(
                margin: const EdgeInsets.only(right: 12, bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 36, height: 36,
                            decoration: BoxDecoration(color: c['bg'], borderRadius: BorderRadius.circular(10)),
                            child: Icon(card['icon'] as IconData, color: c['icon'] as Color, size: 18),
                          ),
                          const SizedBox(height: 16),
                          Text(card['title']!, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF9CA3AF), letterSpacing: 0.5)),
                          const SizedBox(height: 4),
                          Text(card['value']!, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
                        ],
                      ),
                    ),
                    Container(height: 4, decoration: BoxDecoration(color: c['bar'], borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(16), bottomRight: Radius.circular(16)))),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      );
    }
    return Column(children: rows);
  }
}

// ── Notice board ───────────────────────────────────────────────────────────

class _NoticeBoard extends StatefulWidget {
  final Map<String, dynamic>? user;
  const _NoticeBoard({required this.user});

  @override
  State<_NoticeBoard> createState() => _NoticeBoardState();
}

class _NoticeBoardState extends State<_NoticeBoard> {
  List<dynamic> _notices = [];
  bool _loading = true;
  bool _showForm = false;
  String _formMessage = '';
  String _formType = 'info';
  bool _posting = false;
  int? _deleting;

  @override
  void initState() {
    super.initState();
    _fetchNotices();
  }

  Future<void> _fetchNotices() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.get('/notices');
      setState(() => _notices = res.data['notices'] ?? []);
    } catch (_) {
      setState(() => _notices = []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _postNotice() async {
    if (_formMessage.trim().isEmpty) return;
    setState(() => _posting = true);
    try {
      await ApiService.post('/notices', data: {'message': _formMessage.trim(), 'type': _formType});
      setState(() { _formMessage = ''; _showForm = false; });
      _fetchNotices();
    } catch (_) {
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  Future<void> _deleteNotice(int id) async {
    setState(() => _deleting = id);
    try {
      await ApiService.delete('/notices/$id');
      _fetchNotices();
    } catch (_) {
    } finally {
      if (mounted) setState(() => _deleting = null);
    }
  }

  String _fmtTime(String? d) {
    if (d == null) return '';
    final date = DateTime.tryParse(d);
    if (date == null) return '';
    final diff = DateTime.now().difference(date);
    if (diff.inSeconds < 60) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24)   return '${diff.inHours}h ago';
    return '${date.month}/${date.day}';
  }

  @override
  Widget build(BuildContext context) {
    final isLib = AuthService.isLibrarian();

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 16, 16),
            child: Row(
              children: [
                Container(
                  width: 32, height: 32,
                  decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.campaign_outlined, size: 16, color: Color(0xFF6B7280)),
                ),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Notice Board', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
                    Text('${_notices.length} active notice${_notices.length != 1 ? 's' : ''}', style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
                  ],
                ),
                const Spacer(),
                if (isLib)
                  GestureDetector(
                    onTap: () => setState(() => _showForm = !_showForm),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _showForm ? const Color(0xFFF3F4F6) : const Color(0xFF2563EB),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(_showForm ? Icons.close : Icons.add, size: 14, color: _showForm ? const Color(0xFF4B5563) : Colors.white),
                          const SizedBox(width: 4),
                          Text(_showForm ? 'Cancel' : 'Post Notice', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _showForm ? const Color(0xFF4B5563) : Colors.white)),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),

          const Divider(height: 1, color: Color(0xFFF3F4F6)),

          // Post form
          if (_showForm && isLib) ...[
            Container(
              padding: const EdgeInsets.all(16),
              color: const Color(0xFFF9FAFB),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Type selector
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _noticeTypes.entries.map((e) {
                        final selected = _formType == e.key;
                        return GestureDetector(
                          onTap: () => setState(() => _formType = e.key),
                          child: Container(
                            margin: const EdgeInsets.only(right: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: selected ? e.value.bg : Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: selected ? e.value.border : const Color(0xFFE5E7EB)),
                            ),
                            child: Text(e.value.label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: selected ? e.value.text : const Color(0xFF6B7280))),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    maxLines: 3,
                    onChanged: (v) => setState(() => _formMessage = v),
                    decoration: InputDecoration(
                      hintText: 'e.g. "Library will be closed on Monday…"',
                      hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                      contentPadding: const EdgeInsets.all(12),
                      filled: true,
                      fillColor: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Posted as ${widget.user?['name'] ?? ''}', style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
                      GestureDetector(
                        onTap: _posting ? null : _postNotice,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: _posting || _formMessage.trim().isEmpty ? const Color(0xFFD1D5DB) : const Color(0xFF2563EB),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(_posting ? 'Posting...' : 'Post Notice', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: Color(0xFFF3F4F6)),
          ],

          // Notices list
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(40),
              child: Center(child: CircularProgressIndicator(color: Color(0xFF2563EB), strokeWidth: 2)),
            )
          else if (_notices.isEmpty)
            const Padding(
              padding: EdgeInsets.all(40),
              child: Column(
                children: [
                  Icon(Icons.campaign_outlined, size: 32, color: Color(0xFFD1D5DB)),
                  SizedBox(height: 8),
                  Text('No notices posted yet', style: TextStyle(fontSize: 14, color: Color(0xFF9CA3AF))),
                ],
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _notices.length,
              separatorBuilder: (_, __) => const Divider(height: 1, color: Color(0xFFF9FAFB)),
              itemBuilder: (context, i) {
                final notice = _notices[i];
                final cfg = _noticeTypes[notice['type']] ?? _noticeTypes['info']!;
                return Container(
                  padding: const EdgeInsets.all(16),
                  color: cfg.bg,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 32, height: 32,
                        decoration: BoxDecoration(
                          border: Border.all(color: cfg.border),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(cfg.icon, size: 16, color: cfg.text),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(cfg.label.toUpperCase(), style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: cfg.text, letterSpacing: 0.5)),
                                Text(' · ${_fmtTime(notice['createdAt'])}', style: TextStyle(fontSize: 11, color: cfg.subtext)),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(notice['message'] ?? '', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: cfg.text, height: 1.4)),
                            const SizedBox(height: 6),
                            Text('Posted by ${notice['posted_by_name'] ?? 'Staff'}', style: TextStyle(fontSize: 11, color: cfg.subtext)),
                          ],
                        ),
                      ),
                      if (isLib)
                        GestureDetector(
                          onTap: _deleting == notice['id'] ? null : () => _deleteNotice(notice['id']),
                          child: Padding(
                            padding: const EdgeInsets.only(left: 8),
                            child: _deleting == notice['id']
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                                : Icon(Icons.delete_outline, size: 18, color: cfg.subtext),
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}

// ── Quick actions ──────────────────────────────────────────────────────────

class _QuickActions extends StatelessWidget {
  const _QuickActions();

  @override
  Widget build(BuildContext context) {
    final actions = [
      {'label': 'Scan Book',  'sub': 'Issue / Return',  'path': '/scan',      'color': const Color(0xFF2563EB), 'icon': Icons.qr_code_scanner},
      {'label': 'Borrowers',  'sub': 'View members',    'path': '/borrowers', 'color': const Color(0xFF10B981), 'icon': Icons.group},
      {'label': 'Fines',      'sub': 'Manage payments', 'path': '/fines',     'color': const Color(0xFFEF4444), 'icon': Icons.attach_money},
      {'label': 'Reports',    'sub': 'View issues',     'path': '/reports',   'color': const Color(0xFF8B5CF6), 'icon': Icons.bar_chart},
    ];

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
          const Text('Quick Actions', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.1,
            children: actions.map((a) => GestureDetector(
              onTap: () => context.go(a['path'] as String),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFF3F4F6)),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(color: a['color'] as Color, borderRadius: BorderRadius.circular(12)),
                      child: Icon(a['icon'] as IconData, color: Colors.white, size: 20),
                    ),
                    const SizedBox(height: 8),
                    Text(a['label'] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
                    Text(a['sub'] as String, style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF))),
                  ],
                ),
              ),
            )).toList(),
          ),
        ],
      ),
    );
  }
}