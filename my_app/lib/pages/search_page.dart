// lib/pages/search_page.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';
import '../utils/auth.dart';

class SearchPage extends StatefulWidget {
  final String? query; // passed from go_router: state.uri.queryParameters['q']
  const SearchPage({super.key, this.query});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  Map<String, dynamic>? _results;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.query != null && widget.query!.isNotEmpty) _search();
  }

  @override
  void didUpdateWidget(SearchPage old) {
    super.didUpdateWidget(old);
    if (old.query != widget.query) _search();
  }

  Future<void> _search() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await ApiService.get('/search', params: {'q': widget.query});
      setState(() => _results = res.data['results']);
    } catch (_) {
      setState(() => _error = 'Search failed. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // No query
    if (widget.query == null || widget.query!.isEmpty) {
      return const Scaffold(
        backgroundColor: Color(0xFFF3F4F6),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.search, size: 48, color: Color(0xFFD1D5DB)),
              SizedBox(height: 12),
              Text('Enter a search query to get started', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: Color(0xFF6B7280))),
            ],
          ),
        ),
      );
    }

    if (_loading) {
      return Scaffold(
        backgroundColor: const Color(0xFFF3F4F6),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(color: Color(0xFF2563EB)),
              const SizedBox(height: 16),
              Text('Searching for "${widget.query}"…', style: const TextStyle(fontSize: 14, color: Color(0xFF6B7280))),
            ],
          ),
        ),
      );
    }

    if (_error != null) {
      return Scaffold(
        backgroundColor: const Color(0xFFF3F4F6),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFFECACA))),
            child: Text(_error!, style: const TextStyle(color: Color(0xFF991B1B), fontSize: 14)),
          ),
        ),
      );
    }

    if (_results == null) return const SizedBox.shrink();

    final books      = (_results!['books']      as List?) ?? [];
    final authors    = (_results!['authors']    as List?) ?? [];
    final publishers = (_results!['publishers'] as List?) ?? [];
    final borrowers  = (_results!['borrowers']  as List?) ?? [];
    final isLib      = AuthService.isLibrarian();
    final total      = books.length + authors.length + publishers.length + (isLib ? borrowers.length : 0);

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            const Text('Search Results', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
            const SizedBox(height: 4),
            RichText(
              text: TextSpan(
                style: const TextStyle(fontSize: 14, color: Color(0xFF6B7280)),
                children: [
                  TextSpan(text: '$total', style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF374151))),
                  const TextSpan(text: ' results for '),
                  TextSpan(text: '"${widget.query}"', style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF2563EB))),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // No results
            if (total == 0)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 60),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16),
                  boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 8)]),
                child: const Column(
                  children: [
                    Icon(Icons.search_off, size: 56, color: Color(0xFFD1D5DB)),
                    SizedBox(height: 12),
                    Text('No results found', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
                    SizedBox(height: 4),
                    Text('Try different keywords or check your spelling', style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
                  ],
                ),
              ),

            // Books
            if (books.isNotEmpty) ...[
              _SectionHeader(icon: Icons.menu_book_outlined, label: 'Books', count: books.length),
              const SizedBox(height: 12),
              _ResultGrid(
                items: books,
                accentColor: const Color(0xFF3B82F6),
                buildCard: (item) => _BookResultCard(book: item),
              ),
              const SizedBox(height: 24),
            ],

            // Authors
            if (authors.isNotEmpty) ...[
              _SectionHeader(icon: Icons.edit_outlined, label: 'Authors', count: authors.length),
              const SizedBox(height: 12),
              _ResultGrid(
                items: authors,
                accentColor: const Color(0xFF8B5CF6),
                buildCard: (item) => _PersonResultCard(
                  name: item['author_name'] ?? '',
                  sub: 'ID: ${item['author_id']}',
                  color: const Color(0xFF8B5CF6),
                  bgColor: const Color(0xFFF5F3FF),
                  onTap: () => context.go('/authors/${item['author_id']}'),
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Publishers
            if (publishers.isNotEmpty) ...[
              _SectionHeader(icon: Icons.business_outlined, label: 'Publishers', count: publishers.length),
              const SizedBox(height: 12),
              _ResultGrid(
                items: publishers,
                accentColor: const Color(0xFFF97316),
                buildCard: (item) => _PersonResultCard(
                  name: item['publication_name'] ?? '',
                  sub: 'ID: ${item['publication_id']}',
                  color: const Color(0xFFF97316),
                  bgColor: const Color(0xFFFFF7ED),
                  onTap: () => context.go('/publications/${item['publication_id']}'),
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Borrowers — librarian only
            if (isLib && borrowers.isNotEmpty) ...[
              _SectionHeader(icon: Icons.person_outline, label: 'Borrowers', count: borrowers.length),
              const SizedBox(height: 12),
              _ResultGrid(
                items: borrowers,
                accentColor: const Color(0xFF10B981),
                buildCard: (item) => _PersonResultCard(
                  name: item['borrower_name'] ?? '',
                  sub: item['email'] ?? 'ID: ${item['borrower_id']}',
                  color: const Color(0xFF10B981),
                  bgColor: const Color(0xFFECFDF5),
                  onTap: () => context.go('/borrowers/${item['borrower_id']}'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Section header ─────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String label;
  final int count;
  const _SectionHeader({required this.icon, required this.label, required this.count});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 28, height: 28,
          decoration: BoxDecoration(color: const Color(0xFFE5E7EB), borderRadius: BorderRadius.circular(8)),
          child: Icon(icon, size: 16, color: const Color(0xFF4B5563)),
        ),
        const SizedBox(width: 10),
        Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(color: const Color(0xFFE5E7EB), borderRadius: BorderRadius.circular(12)),
          child: Text('$count', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF4B5563))),
        ),
      ],
    );
  }
}

// ── Responsive result grid ─────────────────────────────────────────────────

class _ResultGrid extends StatelessWidget {
  final List<dynamic> items;
  final Color accentColor;
  final Widget Function(Map<String, dynamic>) buildCard;
  const _ResultGrid({required this.items, required this.accentColor, required this.buildCard});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final cols = constraints.maxWidth < 500 ? 1 : constraints.maxWidth < 800 ? 2 : 3;
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: cols, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 2.8,
          ),
          itemCount: items.length,
          itemBuilder: (_, i) => buildCard(items[i] as Map<String, dynamic>),
        );
      },
    );
  }
}

// ── Book result card ───────────────────────────────────────────────────────

class _BookResultCard extends StatelessWidget {
  final Map<String, dynamic> book;
  const _BookResultCard({required this.book});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go('/books/${book['book_id']}'),
      child: Container(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12),
          boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 8)]),
        clipBehavior: Clip.hardEdge,
        child: Column(
          children: [
            Container(height: 4, color: const Color(0xFF3B82F6)),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(book['title'] ?? '', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1F2937)), maxLines: 1, overflow: TextOverflow.ellipsis),
                          const SizedBox(height: 4),
                          Row(children: [
                            if (book['isbn'] != null) _tag('ISBN: ${book['isbn']}', const Color(0xFFF3F4F6), const Color(0xFF6B7280)),
                            if (book['publication_year'] != null) ...[
                              const SizedBox(width: 6),
                              _tag('${book['publication_year']}', const Color(0xFFEFF6FF), const Color(0xFF2563EB)),
                            ],
                          ]),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, size: 18, color: Color(0xFFD1D5DB)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _tag(String label, Color bg, Color text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(4)),
      child: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: text)),
    );
  }
}

// ── Person result card (author / publisher / borrower) ─────────────────────

class _PersonResultCard extends StatelessWidget {
  final String name, sub;
  final Color color, bgColor;
  final VoidCallback onTap;
  const _PersonResultCard({required this.name, required this.sub, required this.color, required this.bgColor, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12),
          boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 8)]),
        clipBehavior: Clip.hardEdge,
        child: Column(
          children: [
            Container(height: 4, color: color),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Container(
                      width: 36, height: 36,
                      decoration: BoxDecoration(color: bgColor, shape: BoxShape.circle),
                      child: Center(child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?', style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 15))),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1F2937)), maxLines: 1, overflow: TextOverflow.ellipsis),
                          Text(sub, style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, size: 18, color: Color(0xFFD1D5DB)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}