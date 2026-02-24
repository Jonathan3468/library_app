// lib/pages/add_publication_page.dart
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';
import '../utils/image_storage.dart';
import '../widgets/image_picker_widget.dart';

class AddPublicationPage extends StatefulWidget {
  const AddPublicationPage({super.key});

  @override
  State<AddPublicationPage> createState() => _AddPublicationPageState();
}

class _AddPublicationPageState extends State<AddPublicationPage> {
  final _nameCtrl = TextEditingController();
  String? _logoB64;

  List<dynamic> _existingPublications = [];
  Map<dynamic, String?> _publicationImages = {};
  bool _pubsLoading   = true;
  bool _loading       = false;
  bool _touched       = false;
  String _serverError = '';

  @override
  void initState() {
    super.initState();
    _fetchPublications();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchPublications() async {
    try {
      final res  = await ApiService.get('/publications');
      final data = res.data;
      final publications = data is List ? data : (data['publications'] ?? data['data'] ?? []);
      setState(() => _existingPublications = publications);

      // Pre-load images asynchronously into a map
      final images = <dynamic, String?>{};
      for (final p in publications) {
        images[p['publication_id']] = await ImageStorage.load('publication', p['publication_id']);
      }
      if (mounted) setState(() => _publicationImages = images);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _pubsLoading = false);
    }
  }

  // ── Validation ─────────────────────────────────────────────────────────

  String _validate(String name) {
    if (name.trim().isEmpty) return 'Publication name is required';
    if (name.trim().length < 2) return 'Publication name must be at least 2 characters';
    if (name.trim().length > 150) return 'Publication name must not exceed 150 characters';
    final isDup = _existingPublications.any((p) =>
        (p['publication_name'] as String? ?? '').toLowerCase().trim() ==
        name.toLowerCase().trim());
    if (isDup) return 'This publication already exists';
    return '';
  }

  String get _validationError => _touched ? _validate(_nameCtrl.text) : '';
  bool   get _isValid         => _validate(_nameCtrl.text).isEmpty;

  // ── Similar publications ────────────────────────────────────────────────

  List<dynamic> get _similar {
    final q = _nameCtrl.text.trim().toLowerCase();
    if (q.isEmpty) return [];
    return _existingPublications
        .where((p) =>
            (p['publication_name'] as String? ?? '').toLowerCase().contains(q))
        .toList();
  }

  // ── Submit ──────────────────────────────────────────────────────────────

  Future<void> _handleSubmit() async {
    setState(() { _touched = true; _serverError = ''; });
    if (!_isValid) return;
    setState(() => _loading = true);
    try {
      final res = await ApiService.post('/publications', data: {
        'publication_name': _nameCtrl.text.trim(),
      });
      final newId = res.data['publication']?['publication_id'] ??
                    res.data['publication_id'] ?? res.data['id'];
      if (newId != null && _logoB64 != null && _logoB64!.isNotEmpty) {
        await ImageStorage.save('publication', newId, _logoB64);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Publication added successfully!'),
          backgroundColor: Color(0xFF10B981),
        ));
        context.go('/publications');
      }
    } catch (e) {
      final msg = _extractError(e);
      setState(() => _serverError =
          (msg.toLowerCase().contains('duplicate') || msg.toLowerCase().contains('exists'))
              ? 'This publication already exists'
              : (msg.isNotEmpty ? msg : 'Failed to add publication. Please try again.'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _extractError(dynamic e) {
    try { return e.response?.data?['error'] ?? e.response?.data?['message'] ?? ''; }
    catch (_) { return ''; }
  }

  Uint8List _bytes(String b64) {
    final clean = b64.contains(',') ? b64.split(',').last : b64;
    return base64Decode(clean);
  }

  // ── Build ───────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final errMsg  = _validationError;
    final isGood  = _touched && errMsg.isEmpty && _nameCtrl.text.trim().isNotEmpty;
    final similar = _similar;

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

                // Header
                Row(children: [
                  GestureDetector(
                    onTap: () => context.go('/publications'),
                    child: const Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.arrow_back, size: 18, color: Color(0xFF6B7280)),
                      SizedBox(width: 4),
                      Text('Back', style: TextStyle(fontSize: 14, color: Color(0xFF6B7280))),
                    ]),
                  ),
                  const SizedBox(width: 16),
                  const Expanded(child: Text('Add New Publication',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold,
                          color: Color(0xFF1F2937)))),
                ]),
                const SizedBox(height: 20),

                // Main card
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(
                        color: Colors.black.withOpacity(0.06),
                        blurRadius: 12, offset: const Offset(0, 2))],
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Publication Details', style: TextStyle(
                        fontSize: 16, fontWeight: FontWeight.bold,
                        color: Color(0xFF374151))),
                    const SizedBox(height: 20),

                    // Logo section
                    const Text('Publisher Logo', style: TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600,
                        color: Color(0xFF374151))),
                    const SizedBox(height: 12),
                    Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      // Square rounded logo preview
                      Container(
                        width: 88, height: 88,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE5E7EB), width: 2),
                          gradient: const LinearGradient(
                            colors: [Color(0xFFFFF7ED), Color(0xFFFFEDD5)],
                            begin: Alignment.topLeft, end: Alignment.bottomRight,
                          ),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: _logoB64 != null && _logoB64!.isNotEmpty
                              ? Image.memory(_bytes(_logoB64!),
                                  fit: BoxFit.contain, width: 88, height: 88)
                              : const Center(child: Icon(Icons.business,
                                  size: 36, color: Color(0xFFF97316))),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        ImagePickerWidget(
                          value: _logoB64,
                          onChange: (b64) => setState(() => _logoB64 = b64),
                        ),
                        const SizedBox(height: 6),
                        const Text("Optional · Upload publisher's logo",
                            style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                      ])),
                    ]),
                    const SizedBox(height: 24),

                    // Name field
                    Row(children: const [
                      Text('Publication Name', style: TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w600,
                          color: Color(0xFF374151))),
                      SizedBox(width: 4),
                      Text('*', style: TextStyle(color: Color(0xFFEF4444), fontSize: 13)),
                    ]),
                    const SizedBox(height: 8),

                    TextField(
                      controller: _nameCtrl,
                      onChanged: (_) => setState(() {}),
                      onEditingComplete: () => setState(() => _touched = true),
                      style: const TextStyle(fontSize: 14),
                      autocorrect: false,
                      decoration: InputDecoration(
                        hintText: 'Enter publication name (e.g., Penguin Random House)',
                        hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 13),
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide(
                                color: _borderColor(errMsg, isGood), width: 2)),
                        enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide(
                                color: _borderColor(errMsg, isGood), width: 2)),
                        focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide(
                                color: _focusBorder(errMsg, isGood), width: 2)),
                        fillColor: _fillColor(errMsg, isGood),
                        filled: true,
                      ),
                    ),

                    // Inline feedback
                    const SizedBox(height: 6),
                    if (_touched && errMsg.isNotEmpty)
                      _InlineMsg(text: errMsg, isError: true)
                    else if (isGood)
                      const _InlineMsg(text: 'Looks good!', isError: false),

                    Align(
                      alignment: Alignment.centerRight,
                      child: Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text('${_nameCtrl.text.length}/150',
                            style: const TextStyle(fontSize: 11,
                                color: Color(0xFF9CA3AF))),
                      ),
                    ),

                    // ── Live similar-publication results ──
                    if (!_pubsLoading && similar.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      _SimilarList(
                        label: 'Similar existing publications',
                        accentColor: const Color(0xFFEA580C),
                        accentBg: const Color(0xFFFFF7ED),
                        items: similar,
                        getName: (item) => item['publication_name'] as String? ?? '',
                        getId:   (item) => item['publication_id'],
                        buildLeading: (item) {
                          final stored = _publicationImages[item['publication_id']]; // ✅ pre-loaded String?
                          return Container(
                            width: 32, height: 32,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(6),
                              color: const Color(0xFFFED7AA),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(5),
                              child: stored != null
                                  ? Image.memory(_bytes(stored),
                                      fit: BoxFit.contain)
                                  : const Icon(Icons.business, size: 16,
                                      color: Color(0xFFEA580C)),
                            ),
                          );
                        },
                        onTap: (id) => context.go('/publications/$id'),
                      ),
                    ],

                    const SizedBox(height: 20),

                    // Server error
                    if (_serverError.isNotEmpty) ...[
                      _ErrorBanner(message: _serverError),
                      const SizedBox(height: 16),
                    ],

                    // Buttons
                    Row(children: [
                      Expanded(child: ElevatedButton(
                        onPressed: (_loading || (_touched && errMsg.isNotEmpty))
                            ? null : _handleSubmit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF16A34A),
                          disabledBackgroundColor: const Color(0xFF9CA3AF),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                          elevation: 0,
                        ),
                        child: _loading
                            ? const SizedBox(width: 18, height: 18,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white))
                            : const Text('Add Publication', style: TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 14)),
                      )),
                      const SizedBox(width: 12),
                      OutlinedButton(
                        onPressed: () => context.go('/publications'),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFFD1D5DB), width: 2),
                          padding: const EdgeInsets.symmetric(
                              vertical: 14, horizontal: 20),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('Cancel', style: TextStyle(
                            color: Color(0xFF374151),
                            fontWeight: FontWeight.w600)),
                      ),
                    ]),
                  ]),
                ),
                const SizedBox(height: 32),
              ]),
            ),
          ),
        ),
      ),
    );
  }

  Color _borderColor(String err, bool good) {
    if (_touched && err.isNotEmpty) return const Color(0xFFEF4444);
    if (good) return const Color(0xFF22C55E);
    return const Color(0xFFD1D5DB);
  }

  Color _focusBorder(String err, bool good) {
    if (_touched && err.isNotEmpty) return const Color(0xFFEF4444);
    if (good) return const Color(0xFF22C55E);
    return const Color(0xFFEA580C); // orange for publications
  }

  Color _fillColor(String err, bool good) {
    if (_touched && err.isNotEmpty) return const Color(0xFFFEF2F2);
    if (good) return const Color(0xFFF0FDF4);
    return Colors.white;
  }
}

// ── Shared: similar results list ──────────────────────────────────────────

class _SimilarList extends StatelessWidget {
  final String label;
  final Color accentColor, accentBg;
  final List<dynamic> items;
  final String Function(dynamic) getName;
  final dynamic Function(dynamic) getId;
  final Widget Function(dynamic) buildLeading;
  final void Function(dynamic) onTap;

  const _SimilarList({
    required this.label,
    required this.accentColor,
    required this.accentBg,
    required this.items,
    required this.getName,
    required this.getId,
    required this.buildLeading,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: accentColor.withOpacity(0.25), width: 2),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
            color: accentBg,
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(8)),
          ),
          child: Text(label.toUpperCase(), style: TextStyle(
              fontSize: 10, fontWeight: FontWeight.w700,
              letterSpacing: 0.5, color: accentColor)),
        ),
        ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 210),
          child: ListView.separated(
            shrinkWrap: true,
            physics: const ClampingScrollPhysics(),
            itemCount: items.length,
            separatorBuilder: (_, __) =>
                const Divider(height: 1, color: Color(0xFFF3F4F6)),
            itemBuilder: (_, i) {
              final item = items[i];
              return GestureDetector(
                onTap: () => onTap(getId(item)),
                behavior: HitTestBehavior.opaque,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 10),
                  child: Row(children: [
                    buildLeading(item),
                    const SizedBox(width: 10),
                    Expanded(child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text(getName(item), style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w600,
                          color: Color(0xFF1F2937))),
                      Text('ID: ${getId(item)}',
                          style: const TextStyle(fontSize: 11,
                              color: Color(0xFF9CA3AF))),
                    ])),
                    Icon(Icons.chevron_right, size: 16,
                        color: Colors.grey.shade300),
                  ]),
                ),
              );
            },
          ),
        ),
      ]),
    );
  }
}

// ── Small shared widgets ───────────────────────────────────────────────────

class _InlineMsg extends StatelessWidget {
  final String text;
  final bool isError;
  const _InlineMsg({required this.text, required this.isError});

  @override
  Widget build(BuildContext context) {
    final color = isError ? const Color(0xFFDC2626) : const Color(0xFF059669);
    return Row(children: [
      Icon(isError ? Icons.error_outline : Icons.check_circle_outline,
          size: 14, color: color),
      const SizedBox(width: 4),
      Flexible(child: Text(text,
          style: TextStyle(fontSize: 12, color: color))),
    ]);
  }
}

class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Icon(Icons.error_outline, size: 16, color: Color(0xFFDC2626)),
        const SizedBox(width: 8),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start,
            children: [
          const Text('Cannot submit', style: TextStyle(
              fontSize: 13, fontWeight: FontWeight.w700,
              color: Color(0xFF991B1B))),
          Text(message, style: const TextStyle(
              fontSize: 12, color: Color(0xFFB91C1C))),
        ])),
      ]),
    );
  }
}