// lib/pages/user_management_page.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';
import '../utils/auth.dart';

class UserManagementPage extends StatefulWidget {
  const UserManagementPage({super.key});

  @override
  State<UserManagementPage> createState() => _UserManagementPageState();
}

class _UserManagementPageState extends State<UserManagementPage> {
  int _tab = 0;
  List<dynamic> _users = [];
  List<dynamic> _borrowers = [];
  bool _loading = true;
  bool _borrowersLoading = false;
  final _searchCtrl = TextEditingController();
  String _search = '';

  Map<String, dynamic>? _assignUser;
  Map<String, dynamic>? _editUser;
  Map<String, dynamic>? _deleteUser;
  bool _deleteLoading = false;
  Map<String, dynamic>? _roleUser;
  String _newRole = '';
  Map<String, dynamic>? _createBorrower;

  final _rfIdCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _editRfCtrl = TextEditingController();
  final _editPhoneCtrl = TextEditingController();
  final _editAddressCtrl = TextEditingController();
  final _createEmailCtrl = TextEditingController();
  final _createPassCtrl = TextEditingController();
  final _createConfirmCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _rfIdCtrl.dispose(); _phoneCtrl.dispose(); _addressCtrl.dispose();
    _editRfCtrl.dispose(); _editPhoneCtrl.dispose(); _editAddressCtrl.dispose();
    _createEmailCtrl.dispose(); _createPassCtrl.dispose(); _createConfirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchUsers() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.get('/auth/users');
      setState(() => _users = res.data['users'] ?? []);
    } catch (_) {
      _showSnack('Failed to load users');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _fetchUnlinkedBorrowers() async {
    setState(() => _borrowersLoading = true);
    try {
      final res = await ApiService.get('/borrowers');
      final all = (res.data is List) ? res.data as List : [];
      setState(() => _borrowers = all.where((b) => b['user_id'] == null).toList());
    } catch (_) {
      _showSnack('Failed to load borrowers');
    } finally {
      if (mounted) setState(() => _borrowersLoading = false);
    }
  }

  List<dynamic> get _filteredUsers {
    if (_search.isEmpty) return _users;
    final q = _search.toLowerCase();
    return _users.where((u) =>
        (u['name'] as String? ?? '').toLowerCase().contains(q) ||
        (u['email'] as String? ?? '').toLowerCase().contains(q) ||
        (u['role'] as String? ?? '').toLowerCase().contains(q)).toList();
  }

  List<dynamic> get _filteredBorrowers {
    if (_search.isEmpty) return _borrowers;
    final q = _search.toLowerCase();
    return _borrowers.where((b) =>
        (b['borrower_name'] as String? ?? '').toLowerCase().contains(q) ||
        (b['email'] as String? ?? '').toLowerCase().contains(q) ||
        (b['rf_id']?.toString() ?? '').contains(q) ||
        (b['borrower_id']?.toString() ?? '').contains(q)).toList();
  }

  Future<void> _handleAssignRfId() async {
    if (_assignUser == null) return;
    try {
      await ApiService.post('/borrowers/assign-rfid', data: {
        'user_id': _assignUser!['id'],
        'rf_id': _rfIdCtrl.text,
        'phone': _phoneCtrl.text.isEmpty ? null : _phoneCtrl.text,
        'address': _addressCtrl.text.isEmpty ? null : _addressCtrl.text,
      });
      _showSnack('RF ID assigned to ${_assignUser!['name']}', success: true);
      setState(() => _assignUser = null);
      _rfIdCtrl.clear(); _phoneCtrl.clear(); _addressCtrl.clear();
      _fetchUsers();
    } catch (e) {
      _showSnack('Failed to assign RF ID');
    }
  }

  Future<void> _handleEditBorrower() async {
    if (_editUser == null) return;
    try {
      await ApiService.put('/borrowers/${_editUser!['borrower']['borrower_id']}', data: {
        'rf_id': _editRfCtrl.text,
        'phone': _editPhoneCtrl.text,
        'address': _editAddressCtrl.text,
      });
      _showSnack('Borrower profile updated', success: true);
      setState(() => _editUser = null);
      _fetchUsers();
    } catch (_) {
      _showSnack('Failed to update');
    }
  }

  Future<void> _handleDeleteUser() async {
    if (_deleteUser == null) return;
    setState(() => _deleteLoading = true);
    try {
      await ApiService.delete('/auth/users/${_deleteUser!['id']}');
      _showSnack('"${_deleteUser!['name']}" deleted', success: true);
      setState(() { _deleteUser = null; _deleteLoading = false; });
      _fetchUsers();
    } catch (_) {
      _showSnack('Failed to delete');
      setState(() => _deleteLoading = false);
    }
  }

  Future<void> _handleToggleActive(Map<String, dynamic> user) async {
    try {
      await ApiService.put('/auth/users/${user['id']}/toggle-active');
      _showSnack('User ${user['is_active'] == true ? 'deactivated' : 'activated'}', success: true);
      _fetchUsers();
    } catch (_) {
      _showSnack('Failed');
    }
  }

  Future<void> _handleChangeRole() async {
    if (_roleUser == null) return;
    try {
      await ApiService.put('/auth/users/${_roleUser!['id']}/role', data: {'role': _newRole});
      _showSnack('Role changed to $_newRole', success: true);
      setState(() { _roleUser = null; _newRole = ''; });
      _fetchUsers();
    } catch (_) {
      _showSnack('Failed to change role');
    }
  }

  Future<void> _handleCreateAccount() async {
    if (_createBorrower == null) return;
    if (_createPassCtrl.text != _createConfirmCtrl.text) {
      _showSnack('Passwords do not match'); return;
    }
    if (_createPassCtrl.text.length < 8) {
      _showSnack('Password must be at least 8 characters'); return;
    }
    try {
      await ApiService.post('/auth/users/create-from-borrower/${_createBorrower!['borrower_id']}', data: {
        'email': _createEmailCtrl.text,
        'password': _createPassCtrl.text,
      });
      _showSnack('Account created for ${_createBorrower!['borrower_name']}', success: true);
      setState(() => _createBorrower = null);
      _createEmailCtrl.clear(); _createPassCtrl.clear(); _createConfirmCtrl.clear();
      _fetchUnlinkedBorrowers();
    } catch (_) {
      _showSnack('Failed to create account');
    }
  }

  void _showSnack(String msg, {bool success = false}) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: success ? Colors.green : Colors.red),
    );
  }

  Color _roleColor(String? role) {
    switch (role) {
      case 'admin': return const Color(0xFFDC2626);
      case 'librarian': return const Color(0xFF2563EB);
      default: return const Color(0xFF059669);
    }
  }

  Color _roleBg(String? role) {
    switch (role) {
      case 'admin': return const Color(0xFFFEE2E2);
      case 'librarian': return const Color(0xFFEFF6FF);
      default: return const Color(0xFFECFDF5);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: Stack(children: [
        SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Header
              const Text('User Management',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
              const Text('Manage accounts, roles, and borrower links',
                  style: TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
              const SizedBox(height: 16),

              // Tabs + Search
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE5E7EB))),
                child: Column(children: [
                  // Tabs
                  Row(children: [
                    Expanded(child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(8)),
                      child: Row(children: [
                        Expanded(child: _tabBtn(0, 'Users', Icons.people_outline, _users.length)),
                        Expanded(child: _tabBtn(1, 'Unlinked', Icons.link_off, _borrowers.length)),
                      ]),
                    )),
                  ]),
                  const SizedBox(height: 10),
                  // Search
                  TextField(
                    controller: _searchCtrl,
                    onChanged: (v) => setState(() => _search = v),
                    style: const TextStyle(fontSize: 13),
                    decoration: InputDecoration(
                      hintText: _tab == 0 ? 'Search name, email, role...' : 'Search name, email, RF ID...',
                      hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)),
                      prefixIcon: const Icon(Icons.search, size: 18, color: Color(0xFF9CA3AF)),
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF93C5FD))),
                      filled: true, fillColor: Colors.white,
                      suffixIcon: _search.isNotEmpty
                          ? IconButton(icon: const Icon(Icons.close, size: 16, color: Color(0xFF9CA3AF)),
                              onPressed: () { _searchCtrl.clear(); setState(() => _search = ''); })
                          : null,
                    ),
                  ),
                ]),
              ),
              const SizedBox(height: 16),

              if (_tab == 0) _buildUsersTab() else _buildUnlinkedTab(),
              const SizedBox(height: 32),
            ]),
          ),
        ),

        // Modals
        if (_assignUser != null) _buildAssignModal(),
        if (_editUser != null) _buildEditModal(),
        if (_deleteUser != null) _buildDeleteModal(),
        if (_roleUser != null) _buildRoleModal(),
        if (_createBorrower != null) _buildCreateAccountModal(),
      ]),
    );
  }

  Widget _tabBtn(int index, String label, IconData icon, int count) {
    final active = _tab == index;
    return GestureDetector(
      onTap: () {
        setState(() { _tab = index; _search = ''; _searchCtrl.clear(); });
        if (index == 1) _fetchUnlinkedBorrowers();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        decoration: BoxDecoration(
          color: active ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
          boxShadow: active ? [const BoxShadow(color: Color(0x10000000), blurRadius: 4)] : null,
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: 14, color: active ? const Color(0xFF1F2937) : const Color(0xFF9CA3AF)),
          const SizedBox(width: 5),
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500,
              color: active ? const Color(0xFF1F2937) : const Color(0xFF9CA3AF))),
          const SizedBox(width: 5),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            decoration: BoxDecoration(color: const Color(0xFFE5E7EB), borderRadius: BorderRadius.circular(50)),
            child: Text('$count', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
          ),
        ]),
      ),
    );
  }

  // ── Users Tab ────────────────────────────────────────────────────────────

  Widget _buildUsersTab() {
    if (_loading) {
      return const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()));
    }

    final users = _filteredUsers;
    if (users.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(40),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE5E7EB))),
        child: const Center(child: Text('No users found', style: TextStyle(color: Color(0xFF9CA3AF)))),
      );
    }

    return Column(children: [
      ...users.map((user) => _buildUserCard(user)),
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Text('${users.length} of ${_users.length} users',
            style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
      ),
    ]);
  }

  Widget _buildUserCard(Map<String, dynamic> user) {
    final name = user['name'] as String? ?? '';
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    final role = user['role'] as String? ?? 'member';
    final isActive = user['is_active'] == true;
    final borrower = user['borrower'] as Map<String, dynamic>?;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

        // Row 1: avatar + name/email + active badge
        Row(children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: _roleBg(role),
            child: Text(initial, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: _roleColor(role))),
          ),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
            Text(user['email'] ?? '', style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)), overflow: TextOverflow.ellipsis),
          ])),
          // Active toggle badge
          GestureDetector(
            onTap: () => _handleToggleActive(user),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
              decoration: BoxDecoration(
                color: isActive ? const Color(0xFFECFDF5) : const Color(0xFFFEE2E2),
                borderRadius: BorderRadius.circular(50),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Container(width: 6, height: 6, decoration: BoxDecoration(
                    shape: BoxShape.circle, color: isActive ? const Color(0xFF10B981) : const Color(0xFFEF4444))),
                const SizedBox(width: 4),
                Text(isActive ? 'Active' : 'Inactive',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                        color: isActive ? const Color(0xFF059669) : const Color(0xFFDC2626))),
              ]),
            ),
          ),
        ]),

        const SizedBox(height: 10),
        const Divider(height: 1, color: Color(0xFFF3F4F6)),
        const SizedBox(height: 10),

        // Row 2: role + borrower profile
        Row(children: [
          // Role chip (tappable)
          GestureDetector(
            onTap: () => _showRoleSheet(user),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: _roleBg(role),
                borderRadius: BorderRadius.circular(50),
                border: Border.all(color: _roleColor(role).withOpacity(0.3)),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Text(role, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: _roleColor(role))),
                const SizedBox(width: 4),
                Icon(Icons.edit, size: 10, color: _roleColor(role).withOpacity(0.7)),
              ]),
            ),
          ),
          const SizedBox(width: 10),

          // Borrower profile
          Expanded(child: borrower != null
              ? Row(children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: const Color(0xFFBFDBFE))),
                    child: Text(borrower['rf_id'] ?? 'No RF ID',
                        style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Color(0xFF1D4ED8))),
                  ),
                  const SizedBox(width: 6),
                  GestureDetector(
                    onTap: () => context.go('/borrowers/${borrower['borrower_id']}'),
                    child: const Text('View', style: TextStyle(fontSize: 11, color: Color(0xFF2563EB), fontWeight: FontWeight.w600)),
                  ),
                ])
              : GestureDetector(
                  onTap: () {
                    setState(() => _assignUser = user);
                    _rfIdCtrl.clear(); _phoneCtrl.clear(); _addressCtrl.clear();
                  },
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF9FAFB),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFFE5E7EB)),
                      ),
                      child: const Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.badge_outlined, size: 12, color: Color(0xFF9CA3AF)),
                        SizedBox(width: 4),
                        Text('Assign RF ID', style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                      ]),
                    ),
                  ]),
                )),
        ]),

        // Action buttons
        const SizedBox(height: 10),
        Row(mainAxisAlignment: MainAxisAlignment.end, children: [
          if (borrower != null)
            _SmallBtn(
              icon: Icons.edit_outlined,
              label: 'Edit',
              onTap: () {
                setState(() => _editUser = user);
                _editRfCtrl.text = borrower['rf_id'] ?? '';
                _editPhoneCtrl.text = borrower['phone'] ?? '';
                _editAddressCtrl.text = borrower['address'] ?? '';
              },
            ),
          const SizedBox(width: 6),
          _SmallBtn(
            icon: Icons.delete_outline,
            label: 'Delete',
            color: const Color(0xFFEF4444),
            bg: const Color(0xFFFEF2F2),
            onTap: () => setState(() => _deleteUser = user),
          ),
        ]),
      ]),
    );
  }

  void _showRoleSheet(Map<String, dynamic> user) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Change role for ${user['name']}',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          ...['admin', 'librarian', 'member'].map((role) => ListTile(
            leading: CircleAvatar(radius: 14, backgroundColor: _roleBg(role),
                child: Text(role[0].toUpperCase(), style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: _roleColor(role)))),
            title: Text(role, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
            trailing: user['role'] == role ? const Icon(Icons.check, color: Color(0xFF2563EB), size: 18) : null,
            onTap: () {
              Navigator.pop(context);
              if (user['role'] != role) setState(() { _roleUser = user; _newRole = role; });
            },
          )),
        ]),
      ),
    );
  }

  // ── Unlinked Tab ──────────────────────────────────────────────────────────

  Widget _buildUnlinkedTab() {
    return Column(children: [
      // Banner
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFBEB),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFFDE68A)),
        ),
        child: Row(children: [
          Container(width: 36, height: 36,
              decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.link_off, size: 18, color: Color(0xFFD97706))),
          const SizedBox(width: 12),
          const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text("Borrowers without accounts",
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF92400E))),
            SizedBox(height: 2),
            Text("These borrowers can't log in. Create an account so they can sign in.",
                style: TextStyle(fontSize: 11, color: Color(0xFFB45309))),
          ])),
        ]),
      ),
      const SizedBox(height: 12),

      if (_borrowersLoading)
        const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator()))
      else if (_filteredBorrowers.isEmpty)
        Container(
          padding: const EdgeInsets.all(40),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE5E7EB))),
          child: const Column(children: [
            Icon(Icons.check_circle_outline, size: 40, color: Color(0xFFD1FAE5)),
            SizedBox(height: 8),
            Text('All borrowers have linked accounts', style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
          ]),
        )
      else
        Column(children: [
          ..._filteredBorrowers.map((b) => _buildBorrowerCard(b)),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text('${_filteredBorrowers.length} unlinked borrowers',
                style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
          ),
        ]),
    ]);
  }

  Widget _buildBorrowerCard(Map<String, dynamic> b) {
    final name = b['borrower_name'] as String? ?? '';
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(children: [
        CircleAvatar(radius: 18, backgroundColor: const Color(0xFFF3F4F6),
            child: Text(initial, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF6B7280)))),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
          Text(
            'ID #${b['borrower_id']}${b['rf_id'] != null ? ' · RF: ${b['rf_id']}' : ''}',
            style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
          ),
        ])),
        const SizedBox(width: 8),
        GestureDetector(
          onTap: () {
            setState(() => _createBorrower = b);
            _createEmailCtrl.text = b['email'] ?? '';
            _createPassCtrl.clear();
            _createConfirmCtrl.clear();
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(color: const Color(0xFF2563EB), borderRadius: BorderRadius.circular(8)),
            child: const Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.vpn_key_outlined, size: 13, color: Colors.white),
              SizedBox(width: 5),
              Text('Create Account', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white)),
            ]),
          ),
        ),
      ]),
    );
  }

  // ── Modals ────────────────────────────────────────────────────────────────

  Widget _modalOverlay(String title, String subtitle, Widget formContent) {
    return GestureDetector(
      onTap: () => setState(() {
        _assignUser = null; _editUser = null;
        _deleteUser = null; _roleUser = null; _createBorrower = null;
      }),
      child: Container(
        color: const Color(0x80000000),
        child: Center(
          child: GestureDetector(
            onTap: () {},
            child: Container(
              margin: const EdgeInsets.all(16),
              constraints: const BoxConstraints(maxWidth: 440),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Container(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
                  decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFF3F4F6)))),
                  child: Row(children: [
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
                      if (subtitle.isNotEmpty) Text(subtitle, style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
                    ])),
                    GestureDetector(
                      onTap: () => setState(() {
                        _assignUser = null; _editUser = null;
                        _deleteUser = null; _roleUser = null; _createBorrower = null;
                      }),
                      child: const Icon(Icons.close, size: 18, color: Color(0xFF9CA3AF)),
                    ),
                  ]),
                ),
                ConstrainedBox(
                  constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.7),
                  child: SingleChildScrollView(child: Padding(padding: const EdgeInsets.all(20), child: formContent)),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAssignModal() => _modalOverlay(
    'Assign RF ID',
    'Creating borrower profile for ${_assignUser!['name']}',
    Column(children: [
      _field('RF ID / Card Number *', _rfIdCtrl, hint: 'Scan or enter RF ID'),
      const SizedBox(height: 12),
      _field('Phone (optional)', _phoneCtrl, hint: '', keyboardType: TextInputType.phone),
      const SizedBox(height: 12),
      _field('Address (optional)', _addressCtrl, hint: '', maxLines: 2),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: const Color(0xFFFFFBEB), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFFDE68A))),
        child: const Text('Creates a borrower profile with a 1-year membership.', style: TextStyle(fontSize: 12, color: Color(0xFFB45309))),
      ),
      const SizedBox(height: 16),
      _modalButtons('Assign RF ID', _handleAssignRfId, () => setState(() => _assignUser = null)),
    ]),
  );

  Widget _buildEditModal() => _modalOverlay(
    'Edit Borrower Profile',
    _editUser!['name'] ?? '',
    Column(children: [
      _field('RF ID *', _editRfCtrl, hint: ''),
      const SizedBox(height: 12),
      _field('Phone', _editPhoneCtrl, hint: '', keyboardType: TextInputType.phone),
      const SizedBox(height: 12),
      _field('Address', _editAddressCtrl, hint: '', maxLines: 2),
      const SizedBox(height: 16),
      _modalButtons('Save Changes', _handleEditBorrower, () => setState(() => _editUser = null)),
    ]),
  );

  Widget _buildDeleteModal() => _modalOverlay(
    'Delete User?',
    '"${_deleteUser!['name']}" will be permanently deleted.',
    _modalButtons('Yes, Delete', _handleDeleteUser,
            () => setState(() => _deleteUser = null), confirmColor: const Color(0xFFDC2626)),
  );

  Widget _buildRoleModal() => _modalOverlay(
    'Change role to $_newRole?',
    '${_roleUser!['name']} will be given $_newRole permissions immediately.',
    _modalButtons('Change Role', _handleChangeRole,
            () => setState(() { _roleUser = null; _newRole = ''; }), confirmColor: const Color(0xFF2563EB)),
  );

  Widget _buildCreateAccountModal() => _modalOverlay(
    'Create Member Account',
    'Linking a login account to an existing borrower',
    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFBFDBFE))),
        child: Row(children: [
          CircleAvatar(radius: 18, backgroundColor: const Color(0xFFF3F4F6),
              child: Text((_createBorrower!['borrower_name'] as String? ?? '?')[0].toUpperCase(),
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF6B7280)))),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(_createBorrower!['borrower_name'] ?? '',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1E3A8A))),
            Text('ID #${_createBorrower!['borrower_id']}${_createBorrower!['rf_id'] != null ? ' · RF: ${_createBorrower!['rf_id']}' : ''}',
                style: const TextStyle(fontSize: 11, color: Color(0xFF3B82F6))),
          ])),
        ]),
      ),
      const SizedBox(height: 16),
      _field('Email *', _createEmailCtrl, hint: 'member@email.com', keyboardType: TextInputType.emailAddress),
      const SizedBox(height: 12),
      _field('Password *', _createPassCtrl, hint: 'Min. 8 characters', obscure: true),
      const SizedBox(height: 12),
      _field('Confirm Password *', _createConfirmCtrl, hint: 'Repeat password', obscure: true),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: const Color(0xFFF0FDF4), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFBBF7D0))),
        child: Text(
          'This will create a member account linked to ${_createBorrower!['borrower_name']}\'s borrower profile.',
          style: const TextStyle(fontSize: 12, color: Color(0xFF166534)),
        ),
      ),
      const SizedBox(height: 16),
      _modalButtons('Create Account', _handleCreateAccount,
              () { setState(() => _createBorrower = null); _createEmailCtrl.clear(); _createPassCtrl.clear(); _createConfirmCtrl.clear(); }),
    ]),
  );

  Widget _field(String label, TextEditingController ctrl,
      {String hint = '', int maxLines = 1, TextInputType keyboardType = TextInputType.text, bool obscure = false}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
      const SizedBox(height: 6),
      TextField(
        controller: ctrl,
        maxLines: obscure ? 1 : maxLines,
        obscureText: obscure,
        keyboardType: keyboardType,
        style: const TextStyle(fontSize: 13),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(fontSize: 13, color: Color(0xFFD1D5DB)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF93C5FD))),
          filled: true, fillColor: Colors.white,
        ),
      ),
    ]);
  }

  Widget _modalButtons(String confirmLabel, VoidCallback onConfirm, VoidCallback onCancel,
      {Color confirmColor = const Color(0xFF2563EB)}) {
    return Row(children: [
      Expanded(child: ElevatedButton(
        onPressed: onConfirm,
        style: ElevatedButton.styleFrom(
            backgroundColor: confirmColor, foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), elevation: 0),
        child: Text(confirmLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
      )),
      const SizedBox(width: 10),
      Expanded(child: OutlinedButton(
        onPressed: onCancel,
        style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 12),
            side: const BorderSide(color: Color(0xFFE5E7EB)),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
        child: const Text('Cancel', style: TextStyle(color: Color(0xFF6B7280))),
      )),
    ]);
  }
}

// ── Small action button ───────────────────────────────────────────────────

class _SmallBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final Color bg;
  final VoidCallback onTap;

  const _SmallBtn({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color = const Color(0xFF6B7280),
    this.bg = const Color(0xFFF9FAFB),
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(7),
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