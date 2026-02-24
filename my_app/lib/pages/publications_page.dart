// lib/pages/publications_page.dart
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';
import '../utils/auth.dart';

class PublicationsPage extends StatefulWidget {
  const PublicationsPage({super.key});

  @override
  State<PublicationsPage> createState() => _PublicationsPageState();
}

class _PublicationsPageState extends State<PublicationsPage> {
  List<dynamic> _publications = [];
  bool _loading = true;
  final _searchCtrl = TextEditingController();
  String _search = '';

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final res  = await ApiService.get('/publications');
      final data = res.data;
      setState(() => _publications = (data is List) ? data : (data['publications'] ?? []));
    } catch (_) {}
    finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _delete(dynamic id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete publication?',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        content: const Text('This action cannot be undone.',
            style: TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ApiService.delete('/publications/$id');
      _fetch();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Publication deleted')));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Failed to delete publication')));
      }
    }
  }

  List<dynamic> get _filtered {
    if (_search.isEmpty) return _publications;
    final q = _search.toLowerCase();
    return _publications
        .where((p) => (p['publication_name'] as String? ?? '').toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final isLib    = AuthService.isLibrarian();
    final filtered = _filtered;

    return LayoutBuilder(builder: (context, constraints) {
      final isMobile = constraints.maxWidth < 600;
      final pad = isMobile ? 16.0 : 20.0;

      return Scaffold(
        backgroundColor: const Color(0xFFF9FAFB),
        body: CustomScrollView(
          slivers: [
            // ── Header ──
            SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(pad, 20, pad, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title row — stacks on mobile if "Add Publication" would overflow
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Text('Publications',
                              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700,
                                  color: Color(0xFF1F2937))),
                          Text('${filtered.length} found',
                              style: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
                        ]),
                        const Spacer(),
                        if (isLib) _addButton(isMobile),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Search
                    TextField(
                      controller: _searchCtrl,
                      onChanged: (v) => setState(() => _search = v),
                      style: const TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Search publications…',
                        hintStyle: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                        prefixIcon: const Icon(Icons.search, size: 18, color: Color(0xFF9CA3AF)),
                        contentPadding: const EdgeInsets.symmetric(vertical: 11),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                        enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                        focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Color(0xFFFB923C), width: 1.5)),
                        filled: true,
                        fillColor: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 18),
                  ],
                ),
              ),
            ),

            // ── Content ──
            if (_loading)
              SliverPadding(
                padding: EdgeInsets.symmetric(horizontal: pad),
                sliver: SliverGrid(
                  delegate: SliverChildBuilderDelegate(
                    (_, i) => Container(
                      height: 72,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF3F4F6),
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    childCount: 6,
                  ),
                  gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: isMobile ? double.infinity : 340,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    mainAxisExtent: 72,
                  ),
                ),
              )
            else if (filtered.isEmpty)
              const SliverFillRemaining(
                child: Center(
                  child: Text('No publications found',
                      style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 14)),
                ),
              )
            else
              SliverPadding(
                padding: EdgeInsets.fromLTRB(pad, 0, pad, 24),
                sliver: SliverGrid(
                  delegate: SliverChildBuilderDelegate(
                    (_, i) => _PubCard(
                      pub: filtered[i],
                      isLib: isLib,
                      onTap: () => context.go('/publications/${filtered[i]['publication_id']}'),
                      onDelete: () => _delete(filtered[i]['publication_id']),
                    ),
                    childCount: filtered.length,
                  ),
                  gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                    // On mobile use full width; on tablet/desktop cap at 340
                    maxCrossAxisExtent: isMobile ? double.infinity : 340,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    mainAxisExtent: 72,
                  ),
                ),
              ),
          ],
        ),
      );
    });
  }

  Widget _addButton(bool isMobile) {
    return GestureDetector(
      onTap: () => context.go('/publications/new'),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: isMobile ? 12 : 14, vertical: 9),
        decoration: BoxDecoration(
          color: const Color(0xFFF97316),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.add, color: Colors.white, size: 16),
          const SizedBox(width: 6),
          Text(isMobile ? 'Add' : 'Add Publication',
              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}

// ── Publication card with float animation ─────────────────────────────────

class _PubCard extends StatefulWidget {
  final Map<String, dynamic> pub;
  final bool isLib;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _PubCard({
    required this.pub,
    required this.isLib,
    required this.onTap,
    required this.onDelete,
  });

  @override
  State<_PubCard> createState() => _PubCardState();
}

class _PubCardState extends State<_PubCard> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _float;

  @override
  void initState() {
    super.initState();
    final delay = (widget.pub['publication_id'] as int? ?? 0) % 6 * 300;
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 5000));
    _float = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
    );
    Future.delayed(Duration(milliseconds: delay), () {
      if (mounted) _ctrl.repeat(reverse: true);
    });
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final name    = widget.pub['publication_name'] as String? ?? '';
    final id      = widget.pub['publication_id'];
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return AnimatedBuilder(
      animation: _float,
      builder: (_, child) => Transform.translate(
        offset: Offset(0, -3 * math.sin(_float.value * math.pi)),
        child: child,
      ),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE9E9EF)),
          boxShadow: const [
            BoxShadow(color: Color(0x08000000), blurRadius: 6, offset: Offset(0, 2)),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(children: [
            // Logo / initial avatar
            GestureDetector(
              onTap: widget.onTap,
              child: Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFFED7AA)),
                ),
                child: Center(
                  child: Text(initial,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700,
                          color: Color(0xFFF97316))),
                ),
              ),
            ),
            const SizedBox(width: 12),

            // Name + ID
            Expanded(
              child: GestureDetector(
                onTap: widget.onTap,
                behavior: HitTestBehavior.opaque,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(name,
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                            color: Color(0xFF1F2937)),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text('#$id', style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                  ],
                ),
              ),
            ),

            // Actions
            if (widget.isLib) ...[
              const SizedBox(width: 8),
              GestureDetector(
                onTap: widget.onTap,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(7),
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                  ),
                  child: const Text('Edit',
                      style: TextStyle(fontSize: 11, color: Color(0xFF6B7280),
                          fontWeight: FontWeight.w500)),
                ),
              ),
              const SizedBox(width: 6),
              GestureDetector(
                onTap: widget.onDelete,
                child: Container(
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(7),
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                  ),
                  child: const Icon(Icons.delete_outline, size: 15, color: Color(0xFF9CA3AF)),
                ),
              ),
            ],
          ]),
        ),
      ),
    );
  }
}