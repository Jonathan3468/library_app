// lib/pages/popular_books_page.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';

class PopularBooksPage extends StatefulWidget {
  const PopularBooksPage({super.key});

  @override
  State<PopularBooksPage> createState() => _PopularBooksPageState();
}

class _PopularBooksPageState extends State<PopularBooksPage> {
  List<dynamic> _books = [];
  bool _loading = true;
  String _period = 'all';

  @override
  void initState() {
    super.initState();
    _fetchPopularBooks();
  }

  Future<void> _fetchPopularBooks() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.get('/books/popular/most-borrowed', params: {'period': _period, 'limit': 20});
      setState(() => _books = res.data['books'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // Medal color for top 3
  Color _rankColor(int index) {
    if (index == 0) return const Color(0xFFF59E0B); // gold
    if (index == 1) return const Color(0xFF9CA3AF); // silver
    if (index == 2) return const Color(0xFFB45309); // bronze
    return const Color(0xFF2563EB);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Popular Books', style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
                // Period dropdown
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _period,
                      style: const TextStyle(fontSize: 13, color: Color(0xFF4B5563)),
                      items: const [
                        DropdownMenuItem(value: 'all',   child: Text('All Time')),
                        DropdownMenuItem(value: 'year',  child: Text('This Year')),
                        DropdownMenuItem(value: 'month', child: Text('This Month')),
                      ],
                      onChanged: (v) {
                        setState(() => _period = v!);
                        _fetchPopularBooks();
                      },
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            if (_loading)
              const Center(child: Padding(
                padding: EdgeInsets.symmetric(vertical: 60),
                child: CircularProgressIndicator(color: Color(0xFF2563EB)),
              ))
            else if (_books.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 60),
                  child: Column(
                    children: [
                      Icon(Icons.local_fire_department, size: 48, color: Color(0xFFD1D5DB)),
                      SizedBox(height: 12),
                      Text('No data available', style: TextStyle(fontSize: 14, color: Color(0xFF9CA3AF))),
                    ],
                  ),
                ),
              )
            else
              LayoutBuilder(
                builder: (context, constraints) {
                  final cols = constraints.maxWidth < 600 ? 1 : constraints.maxWidth < 900 ? 2 : 3;
                  return GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: cols, crossAxisSpacing: 16, mainAxisSpacing: 16, childAspectRatio: 1.6,
                    ),
                    itemCount: _books.length,
                    itemBuilder: (context, i) {
                      final book    = _books[i];
                      final authors = (book['Authors'] as List?)?.map((a) => a['author_name'] as String).join(', ') ?? '';
                      final rankClr = _rankColor(i);

                      return GestureDetector(
                        onTap: () => context.go('/books/${book['book_id']}'),
                        child: Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: const [BoxShadow(color: Color(0x0F000000), blurRadius: 12, offset: Offset(0, 4))],
                          ),
                          child: Stack(
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Title
                                  Padding(
                                    padding: const EdgeInsets.only(right: 52),
                                    child: Text(book['title'] ?? '', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)), maxLines: 2, overflow: TextOverflow.ellipsis),
                                  ),
                                  const SizedBox(height: 6),
                                  if (authors.isNotEmpty)
                                    Text(authors, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)), maxLines: 1, overflow: TextOverflow.ellipsis),
                                  if (book['publication_year'] != null)
                                    Text('Year: ${book['publication_year']}', style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                                  const Spacer(),
                                  // Borrow count
                                  Row(
                                    children: [
                                      Icon(Icons.trending_up, size: 18, color: Colors.green.shade600),
                                      const SizedBox(width: 6),
                                      Text('${book['borrow_count']} times borrowed',
                                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.green.shade700)),
                                    ],
                                  ),
                                ],
                              ),
                              // Rank badge
                              Positioned(
                                top: 0, right: 0,
                                child: Container(
                                  width: 40, height: 40,
                                  decoration: BoxDecoration(color: rankClr, shape: BoxShape.circle),
                                  child: Center(
                                    child: Text('#${i + 1}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}