// lib/pages/authors_page.dart
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';
import '../utils/auth.dart';

class AuthorsPage extends StatefulWidget {
  const AuthorsPage({super.key});

  @override
  State<AuthorsPage> createState() => _AuthorsPageState();
}

class _AuthorsPageState extends State<AuthorsPage> {
  List<dynamic> _authors = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchAuthors();
  }

  Future<void> _fetchAuthors() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res  = await ApiService.get('/authors');
      final data = res.data;
      setState(() => _authors = (data is List) ? data : (data['authors'] ?? []));
    } catch (_) {
      setState(() => _error = 'Failed to load authors');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _deleteAuthor(int id, String name) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => _ConfirmDialog(
        title: 'Delete $name?',
        description: 'This action cannot be undone.',
        confirmLabel: 'Delete',
        confirmColor: const Color(0xFFEF4444),
      ),
    );
    if (confirmed != true) return;
    try {
      await ApiService.delete('/authors/$id');
      _fetchAuthors();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to delete author')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLib   = AuthService.isLibrarian();
    final isAdmin = AuthService.isAdmin();

    return LayoutBuilder(builder: (context, constraints) {
      final isMobile = constraints.maxWidth < 600;

      return Scaffold(
        backgroundColor: const Color(0xFFF9FAFB),
        body: _loading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF7C3AED)))
            : CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(
                          isMobile ? 16 : 20, 20, isMobile ? 16 : 20, 0),
                      child: isMobile
                          ? Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(children: [
                                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    const Text('Authors',
                                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
                                    Text('${_authors.length} total',
                                        style: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
                                  ]),
                                  const Spacer(),
                                  if (isLib) _addButton(isMobile),
                                ]),
                              ],
                            )
                          : Row(children: [
                              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                const Text('Authors',
                                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
                                Text('${_authors.length} total',
                                    style: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
                              ]),
                              const Spacer(),
                              if (isLib) _addButton(isMobile),
                            ]),
                    ),
                  ),

                  if (_error != null)
                    SliverToBoxAdapter(
                      child: Container(
                        margin: EdgeInsets.fromLTRB(
                            isMobile ? 16 : 20, 14, isMobile ? 16 : 20, 0),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          border: Border.all(color: const Color(0xFFFECACA)),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(_error!,
                            style: const TextStyle(color: Color(0xFF991B1B), fontSize: 13)),
                      ),
                    ),

                  if (_authors.isEmpty)
                    const SliverFillRemaining(
                      child: Center(
                        child: Text('No authors found',
                            style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 14)),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: EdgeInsets.all(isMobile ? 16 : 20),
                      sliver: SliverGrid(
                        delegate: SliverChildBuilderDelegate(
                          (context, i) {
                            final author = _authors[i];
                            return _AuthorCard(
                              author: author,
                              isAdmin: isAdmin,
                              onDetails: () => context.go('/authors/${author['author_id']}'),
                              onDelete:  () => _deleteAuthor(
                                  author['author_id'], author['author_name'] ?? ''),
                            );
                          },
                          childCount: _authors.length,
                        ),
                        gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: isMobile ? 180 : 260,
                          mainAxisSpacing: isMobile ? 10 : 14,
                          crossAxisSpacing: isMobile ? 10 : 14,
                          childAspectRatio: 0.85,
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
      onTap: () => context.go('/authors/new'),
      child: Container(
        padding: EdgeInsets.symmetric(
            horizontal: isMobile ? 12 : 14, vertical: 9),
        decoration: BoxDecoration(
          color: const Color(0xFF7C3AED),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.add, color: Colors.white, size: 16),
          const SizedBox(width: 6),
          Text(isMobile ? 'Add' : 'Add Author',
              style: const TextStyle(
                  color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}

// ── Author card with float animation ─────────────────────────────────────

class _AuthorCard extends StatefulWidget {
  final Map<String, dynamic> author;
  final bool isAdmin;
  final VoidCallback onDetails;
  final VoidCallback onDelete;

  const _AuthorCard({
    required this.author,
    required this.isAdmin,
    required this.onDetails,
    required this.onDelete,
  });

  @override
  State<_AuthorCard> createState() => _AuthorCardState();
}

class _AuthorCardState extends State<_AuthorCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _float;

  @override
  void initState() {
    super.initState();
    final delay = (widget.author['author_id'] as int? ?? 0) % 6 * 400;
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
    final name     = widget.author['author_name'] as String? ?? '';
    final authorId = widget.author['author_id'];
    final initial  = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return AnimatedBuilder(
      animation: _float,
      builder: (_, child) => Transform.translate(
        offset: Offset(0, -3 * math.sin(_float.value * math.pi)),
        child: child,
      ),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE9E9EF)),
          boxShadow: const [
            BoxShadow(color: Color(0x08000000), blurRadius: 8, offset: Offset(0, 2)),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            // Avatar
            Container(
              width: 64, height: 64,
              decoration: BoxDecoration(
                color: const Color(0xFFF5F3FF),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFDDD6FE)),
              ),
              child: Center(
                child: Text(initial,
                    style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: Color(0xFF7C3AED))),
              ),
            ),
            const SizedBox(height: 10),

            // Name
            Text(name,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1F2937)),
                textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 3),
            Text('#$authorId',
                style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),

            const Spacer(),

            // Buttons
            Row(children: [
              Expanded(
                child: GestureDetector(
                  onTap: widget.onDetails,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF9FAFB),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                    ),
                    child: const Center(
                      child: Text('Details',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF374151))),
                    ),
                  ),
                ),
              ),
              if (widget.isAdmin) ...[
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: widget.onDelete,
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF9FAFB),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                    ),
                    child: const Icon(Icons.delete_outline, size: 15, color: Color(0xFF9CA3AF)),
                  ),
                ),
              ],
            ]),
          ]),
        ),
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
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)),
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
        ]),
      ),
    );
  }
}