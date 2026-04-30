// lib/pages/borrowers_page.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';
import '../widgets/borrower_import_modal.dart';

// ── Membership status helper ──────────────────────────────────────────────

class _MembershipStatus {
  final String text;
  final Color color, bg, dot;
  const _MembershipStatus({required this.text, required this.color, required this.bg, required this.dot});
}

_MembershipStatus _getMembershipStatus(String? expiryDate) {
  if (expiryDate == null) return const _MembershipStatus(text: 'No expiry', color: Color(0xFF9CA3AF), bg: Color(0xFFF3F4F6), dot: Color(0xFFD1D5DB));
  final expiry = DateTime.tryParse(expiryDate);
  if (expiry == null) return const _MembershipStatus(text: 'No expiry', color: Color(0xFF9CA3AF), bg: Color(0xFFF3F4F6), dot: Color(0xFFD1D5DB));
  final now = DateTime.now();
  if (expiry.isBefore(now)) return const _MembershipStatus(text: 'Expired', color: Color(0xFFDC2626), bg: Color(0xFFFEF2F2), dot: Color(0xFFEF4444));
  if (expiry.difference(now).inDays < 30) return const _MembershipStatus(text: 'Expiring soon', color: Color(0xFFD97706), bg: Color(0xFFFFFBEB), dot: Color(0xFFFB923C));
  return const _MembershipStatus(text: 'Active', color: Color(0xFF059669), bg: Color(0xFFECFDF5), dot: Color(0xFF10B981));
}

// ── Main page ─────────────────────────────────────────────────────────────

class BorrowersPage extends StatefulWidget {
  const BorrowersPage({super.key});
  @override
  State<BorrowersPage> createState() => _BorrowersPageState();
}

class _BorrowersPageState extends State<BorrowersPage> {
  List<dynamic> _borrowers = [];
  bool _loading = true;
  bool _showImport = false;
  String? _error;

  final _searchCtrl = TextEditingController();
  String _membershipFilter = 'all';
  String _rfidFilter = 'all';
  String _sortField = 'borrower_name';
  String _sortDir = 'asc';
  bool _filtersOpen = false;

  Map<String, dynamic>? _editingBorrower;
  final _editNameCtrl = TextEditingController();
  final _editEmailCtrl = TextEditingController();
  final _editPhoneCtrl = TextEditingController();
  final _editAddressCtrl = TextEditingController();
  final _editRfCtrl = TextEditingController();

  @override
  void initState() { super.initState(); _fetchBorrowers(); }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _editNameCtrl.dispose(); _editEmailCtrl.dispose();
    _editPhoneCtrl.dispose(); _editAddressCtrl.dispose(); _editRfCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchBorrowers() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.get('/borrowers');
      if (mounted) {
        setState(() => _borrowers = res.data is List ? res.data : []);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Failed to load borrowers');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<dynamic> get _filtered {
    var list = List<dynamic>.from(_borrowers);
    final q = _searchCtrl.text.toLowerCase();
    if (q.isNotEmpty) {
      list = list.where((b) =>
          (b['borrower_name'] ?? '').toLowerCase().contains(q) ||
          (b['email'] ?? '').toLowerCase().contains(q) ||
          (b['phone'] ?? '').contains(q) ||
          (b['rf_id'] ?? '').toLowerCase().contains(q) ||
          b['borrower_id'].toString().contains(q)).toList();
    }
    if (_membershipFilter != 'all') {
      list = list.where((b) {
        final s = _getMembershipStatus(b['membership_expiry']);
        if (_membershipFilter == 'active') return s.text == 'Active';
        if (_membershipFilter == 'expired') return s.text == 'Expired';
        if (_membershipFilter == 'soon') return s.text == 'Expiring soon';
        return true;
      }).toList();
    }
    if (_rfidFilter == 'has') list = list.where((b) => b['rf_id'] != null && b['rf_id'] != '').toList();
    if (_rfidFilter == 'none') list = list.where((b) => b['rf_id'] == null || b['rf_id'] == '').toList();

    list.sort((a, b) {
      dynamic aVal, bVal;
      if (_sortField == 'borrower_name') {
        aVal = (a['borrower_name'] ?? '').toLowerCase();
        bVal = (b['borrower_name'] ?? '').toLowerCase();
      } else if (_sortField == 'membership_expiry') {
        aVal = DateTime.tryParse(a['membership_expiry'] ?? '') ?? DateTime(0);
        bVal = DateTime.tryParse(b['membership_expiry'] ?? '') ?? DateTime(0);
      } else {
        aVal = a[_sortField] ?? 0;
        bVal = b[_sortField] ?? 0;
      }
      final cmp = Comparable.compare(aVal as Comparable, bVal as Comparable);
      return _sortDir == 'asc' ? cmp : -cmp;
    });
    return list;
  }

  int get _activeFilterCount =>
      (_membershipFilter != 'all' ? 1 : 0) + (_rfidFilter != 'all' ? 1 : 0);

  Future<void> _updateBorrower() async {
    if (_editingBorrower == null || !mounted) return;
    
    try {
      await ApiService.put('/borrowers/${_editingBorrower!['borrower_id']}', data: {
        'borrower_name': _editNameCtrl.text,
        'email': _editEmailCtrl.text,
        'phone': _editPhoneCtrl.text,
        'address': _editAddressCtrl.text,
        'rf_id': _editRfCtrl.text,
      });
      if (mounted) {
        Navigator.of(context).pop();
        setState(() => _editingBorrower = null);
        _fetchBorrowers();
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update borrower')),
        );
      }
    }
  }

  Future<void> _renewMembership(dynamic borrower) async {
    if (!mounted) return;
    
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Renew Membership?', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        content: Text('Renew membership for ${borrower['borrower_name']}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Renew'),
          ),
        ],
      ),
    );
    
    if (!mounted) return;
    if (confirmed != true) return;
    
    try {
      await ApiService.put('/borrowers/renew/${borrower['borrower_id']}');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Membership renewed successfully')),
        );
        _fetchBorrowers();
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to renew membership')),
        );
      }
    }
  }

  Future<void> _deleteBorrower(dynamic borrower) async {
    if (!mounted) return;
    
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Borrower?', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFFDC2626))),
        content: Text('Delete ${borrower['borrower_name']}? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444), foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    
    if (!mounted) return;
    if (confirmed != true) return;
    
    try {
      await ApiService.delete('/borrowers/${borrower['borrower_id']}');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Borrower deleted successfully')),
        );
        _fetchBorrowers();
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to delete borrower')),
        );
      }
    }
  }

  void _openEditModal(Map<String, dynamic> b) {
    setState(() => _editingBorrower = b);
    _editNameCtrl.text = b['borrower_name'] ?? '';
    _editEmailCtrl.text = b['email'] ?? '';
    _editPhoneCtrl.text = b['phone'] ?? '';
    _editAddressCtrl.text = b['address'] ?? '';
    _editRfCtrl.text = b['rf_id'] ?? '';
    showDialog(context: context, builder: (_) => _EditModal(
      nameCtrl: _editNameCtrl, emailCtrl: _editEmailCtrl,
      phoneCtrl: _editPhoneCtrl, addressCtrl: _editAddressCtrl,
      rfCtrl: _editRfCtrl, onSave: _updateBorrower,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: Stack(children: [
        SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

              // ── Header ──
              Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Borrowers', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
                  Text('${filtered.length} of ${_borrowers.length} members',
                      style: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
                ])),
                // Import CSV button
                GestureDetector(
                  onTap: () => setState(() => _showImport = true),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF7C3AED)),
                    ),
                    child: const Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.upload_file_outlined, size: 15, color: Color(0xFF7C3AED)),
                      SizedBox(width: 6),
                      Text('Import CSV', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF7C3AED))),
                    ]),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => context.go('/borrowers/new'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                    decoration: BoxDecoration(color: const Color(0xFF2563EB), borderRadius: BorderRadius.circular(8)),
                    child: const Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.add, size: 16, color: Colors.white),
                      SizedBox(width: 6),
                      Text('Add', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white)),
                    ]),
                  ),
                ),
              ]),
              const SizedBox(height: 16),

              if (_error != null) _ErrorBanner(message: _error!),

              // ── Search bar ──
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE5E7EB))),
                child: Column(children: [
                  TextField(
                    controller: _searchCtrl,
                    onChanged: (_) => setState(() {}),
                    style: const TextStyle(fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Search name, email, phone, RF ID...',
                      hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
                      prefixIcon: const Icon(Icons.search, size: 16, color: Color(0xFF9CA3AF)),
                      suffixIcon: _searchCtrl.text.isNotEmpty
                          ? IconButton(icon: const Icon(Icons.close, size: 14), onPressed: () { _searchCtrl.clear(); setState(() {}); })
                          : null,
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF93C5FD), width: 2)),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(children: [
                    Expanded(child: Container(
                      height: 38,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE5E7EB)), borderRadius: BorderRadius.circular(8)),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _sortField,
                          isExpanded: true,
                          style: const TextStyle(fontSize: 12, color: Color(0xFF4B5563)),
                          isDense: true,
                          items: const [
                            DropdownMenuItem(value: 'borrower_name', child: Text('Sort: Name')),
                            DropdownMenuItem(value: 'borrower_id', child: Text('Sort: ID')),
                            DropdownMenuItem(value: 'membership_expiry', child: Text('Sort: Expiry')),
                          ],
                          onChanged: (v) => setState(() => _sortField = v!),
                        ),
                      ),
                    )),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: () => setState(() => _sortDir = _sortDir == 'asc' ? 'desc' : 'asc'),
                      child: Container(
                        height: 38, width: 38,
                        decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE5E7EB)), borderRadius: BorderRadius.circular(8)),
                        child: Center(child: Text(_sortDir == 'asc' ? '↑' : '↓',
                            style: const TextStyle(fontSize: 16, color: Color(0xFF4B5563), fontWeight: FontWeight.bold))),
                      ),
                    ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: () => setState(() => _filtersOpen = !_filtersOpen),
                      child: Container(
                        height: 38,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: _filtersOpen || _activeFilterCount > 0 ? const Color(0xFFEFF6FF) : Colors.white,
                          border: Border.all(color: _filtersOpen || _activeFilterCount > 0 ? const Color(0xFFBFDBFE) : const Color(0xFFE5E7EB)),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          const Icon(Icons.filter_list, size: 16, color: Color(0xFF2563EB)),
                          const SizedBox(width: 4),
                          const Text('Filters', style: TextStyle(fontSize: 12, color: Color(0xFF2563EB), fontWeight: FontWeight.w500)),
                          if (_activeFilterCount > 0) ...[
                            const SizedBox(width: 5),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                              decoration: BoxDecoration(color: const Color(0xFF2563EB), borderRadius: BorderRadius.circular(10)),
                              child: Text('$_activeFilterCount', style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ]),
                      ),
                    ),
                  ]),
                ]),
              ),
              const SizedBox(height: 8),

              // ── Filter panel ──
              if (_filtersOpen)
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE5E7EB))),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('MEMBERSHIP STATUS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF6B7280), letterSpacing: 0.5)),
                    const SizedBox(height: 8),
                    Wrap(spacing: 6, runSpacing: 6, children: [
                      for (final e in [['all', 'All'], ['active', 'Active'], ['soon', 'Expiring soon'], ['expired', 'Expired']])
                        _FilterChip(
                          label: e[1], active: _membershipFilter == e[0],
                          onTap: () => setState(() => _membershipFilter = e[0]),
                          activeColor: e[0] == 'expired' ? const Color(0xFFDC2626) : e[0] == 'soon' ? const Color(0xFFD97706) : e[0] == 'active' ? const Color(0xFF059669) : const Color(0xFF2563EB),
                        ),
                    ]),
                    const SizedBox(height: 16),
                    const Text('RF ID', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF6B7280), letterSpacing: 0.5)),
                    const SizedBox(height: 8),
                    Wrap(spacing: 6, children: [
                      for (final e in [['all', 'All'], ['has', 'Has RF ID'], ['none', 'No RF ID']])
                        _FilterChip(label: e[1], active: _rfidFilter == e[0], onTap: () => setState(() => _rfidFilter = e[0])),
                    ]),
                    if (_activeFilterCount > 0) ...[
                      const SizedBox(height: 12),
                      GestureDetector(
                        onTap: () => setState(() { _membershipFilter = 'all'; _rfidFilter = 'all'; }),
                        child: const Text('Clear all', style: TextStyle(fontSize: 12, color: Color(0xFFEF4444))),
                      ),
                    ],
                  ]),
                ),

              // ── Content ──
              if (_loading)
                const Center(child: Padding(padding: EdgeInsets.all(60), child: CircularProgressIndicator(color: Color(0xFF2563EB))))
              else if (filtered.isEmpty)
                _EmptyState(hasFilters: _searchCtrl.text.isNotEmpty || _activeFilterCount > 0)
              else
                _BorrowersList(
                  borrowers: filtered,
                  total: _borrowers.length,
                  onRowTap: (b) => context.go('/borrowers/${b['borrower_id']}'),
                  onEdit: _openEditModal,
                  onRenew: _renewMembership,
                  onDelete: _deleteBorrower,
                ),
            ]),
          ),
        ),

        // ── Import modal overlay ──
        if (_showImport)
          BorrowerImportModal(
            onDone: () { _fetchBorrowers(); },
            onClose: () => setState(() => _showImport = false),
          ),
      ]),
    );
  }
}

// ── Borrowers list ────────────────────────────────────────────────────────

class _BorrowersList extends StatelessWidget {
  final List<dynamic> borrowers;
  final int total;
  final Function(Map<String, dynamic>) onRowTap, onEdit, onRenew, onDelete;

  const _BorrowersList({
    required this.borrowers, required this.total,
    required this.onRowTap, required this.onEdit,
    required this.onRenew, required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      ...borrowers.map((b) {
        final ms = _getMembershipStatus(b['membership_expiry']);
        final name = b['borrower_name'] ?? '';
        final hasRfid = b['rf_id'] != null && b['rf_id'] != '';

        return GestureDetector(
          onTap: () => onRowTap(b as Map<String, dynamic>),
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  width: 40, height: 40,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(colors: [Color(0xFF60A5FA), Color(0xFF6366F1)]),
                    shape: BoxShape.circle,
                  ),
                  child: Center(child: Text(
                    name.isNotEmpty ? name[0].toUpperCase() : '?',
                    style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                  )),
                ),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
                  Text('ID #${b['borrower_id']}', style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                ])),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: ms.bg, borderRadius: BorderRadius.circular(20)),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Container(width: 6, height: 6, decoration: BoxDecoration(color: ms.dot, shape: BoxShape.circle)),
                    const SizedBox(width: 5),
                    Text(ms.text, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: ms.color)),
                  ]),
                ),
              ]),
              const SizedBox(height: 10),
              const Divider(height: 1, color: Color(0xFFF3F4F6)),
              const SizedBox(height: 10),
              Wrap(spacing: 16, runSpacing: 8, children: [
                if (hasRfid)
                  _DetailChip(icon: Icons.badge_outlined, label: b['rf_id'], mono: true, chipColor: const Color(0xFFEFF6FF), textColor: const Color(0xFF1D4ED8), borderColor: const Color(0xFFBFDBFE)),
                if (b['email'] != null && b['email'] != '')
                  _DetailItem(icon: Icons.email_outlined, text: b['email']),
                if (b['phone'] != null && b['phone'] != '')
                  _DetailItem(icon: Icons.phone_outlined, text: b['phone']),
                if (b['membership_expiry'] != null)
                  _DetailItem(icon: Icons.calendar_today_outlined,
                      text: b['membership_expiry'].toString().substring(0, 10)),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                _ABtn(icon: Icons.edit_outlined, label: 'Edit', color: const Color(0xFF2563EB), onTap: () => onEdit(b as Map<String, dynamic>)),
                const SizedBox(width: 8),
                _ABtn(icon: Icons.autorenew, label: 'Renew', color: const Color(0xFF10B981), onTap: () => onRenew(b)),
                const SizedBox(width: 8),
                _ABtn(icon: Icons.delete_outline, label: 'Delete', color: const Color(0xFFEF4444), onTap: () => onDelete(b)),
              ]),
            ]),
          ),
        );
      }),
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Text('Showing ${borrowers.length} of $total borrowers',
            style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
      ),
    ]);
  }
}

class _DetailChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool mono;
  final Color chipColor, textColor, borderColor;
  const _DetailChip({required this.icon, required this.label, this.mono = false,
    required this.chipColor, required this.textColor, required this.borderColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: chipColor, borderRadius: BorderRadius.circular(6), border: Border.all(color: borderColor)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 11, color: textColor),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 11, fontFamily: mono ? 'monospace' : null, color: textColor, fontWeight: FontWeight.w600)),
      ]),
    );
  }
}

class _DetailItem extends StatelessWidget {
  final IconData icon;
  final String text;
  const _DetailItem({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 12, color: const Color(0xFF9CA3AF)),
      const SizedBox(width: 4),
      Text(text, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
    ]);
  }
}

class _ABtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _ABtn({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
        ]),
      ),
    );
  }
}

// ── Edit modal ────────────────────────────────────────────────────────────

class _EditModal extends StatelessWidget {
  final TextEditingController nameCtrl, emailCtrl, phoneCtrl, addressCtrl, rfCtrl;
  final VoidCallback onSave;

  const _EditModal({
    required this.nameCtrl, required this.emailCtrl, required this.phoneCtrl,
    required this.addressCtrl, required this.rfCtrl, required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      insetPadding: const EdgeInsets.all(16),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Edit Borrower', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 20),
          for (final f in [
            ['Name', nameCtrl],
            ['RF ID', rfCtrl],
            ['Email', emailCtrl],
            ['Phone', phoneCtrl],
          ]) ...[
            Text(f[0] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF4B5563))),
            const SizedBox(height: 6),
            TextField(
              controller: f[1] as TextEditingController,
              style: const TextStyle(fontSize: 13),
              decoration: InputDecoration(
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
            const SizedBox(height: 12),
          ],
          const Text('Address', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF4B5563))),
          const SizedBox(height: 6),
          TextField(
            controller: addressCtrl,
            maxLines: 2,
            style: const TextStyle(fontSize: 13),
            decoration: InputDecoration(
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
              contentPadding: const EdgeInsets.all(12),
            ),
          ),
          const SizedBox(height: 20),
          Row(children: [
            Expanded(child: ElevatedButton(
              onPressed: onSave,
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
              child: const Text('Save Changes'),
            )),
            const SizedBox(width: 10),
            Expanded(child: OutlinedButton(
              onPressed: () => Navigator.of(context).pop(),
              style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
              child: const Text('Cancel'),
            )),
          ]),
        ]),
      ),
    );
  }
}

// ── Filter chip ───────────────────────────────────────────────────────────

class _FilterChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  final Color activeColor;

  const _FilterChip({required this.label, required this.active, required this.onTap, this.activeColor = const Color(0xFF2563EB)});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: active ? activeColor.withOpacity(0.1) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: active ? activeColor.withOpacity(0.4) : const Color(0xFFE5E7EB)),
        ),
        child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: active ? activeColor : const Color(0xFF6B7280))),
      ),
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner({required this.message});
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFFECACA))),
      child: Text(message, style: const TextStyle(fontSize: 13, color: Color(0xFFDC2626))),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final bool hasFilters;
  const _EmptyState({required this.hasFilters});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 60),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE5E7EB))),
      child: Column(children: [
        const Icon(Icons.person_outline, size: 40, color: Color(0xFFE5E7EB)),
        const SizedBox(height: 12),
        Text(
          hasFilters ? 'No borrowers match your filters' : 'No borrowers yet',
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF9CA3AF)),
        ),
      ]),
    );
  }
}