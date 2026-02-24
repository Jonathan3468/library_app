// lib/pages/settings_page.dart
import 'package:flutter/material.dart';
import '../services/api.dart';
import '../utils/auth.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  String _view = 'hub'; // hub | change-password | account-info | library-settings

  @override
  Widget build(BuildContext context) {
    final isStaff = AuthService.isAdmin() || AuthService.isLibrarian();

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_view == 'hub') ...[
                const Text('Settings', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
                const Text('Manage your account and system preferences', style: TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
                const SizedBox(height: 28),
                const _SectionLabel('ACCOUNT'),
                _SettingCard(iconPath: Icons.person_outline, iconBg: const Color(0xFFF5F3FF), iconColor: const Color(0xFF7C3AED), title: 'Account Info', description: 'View your name, email, and role', onTap: () => setState(() => _view = 'account-info')),
                const SizedBox(height: 10),
                _SettingCard(iconPath: Icons.lock_outline, iconBg: const Color(0xFFEFF6FF), iconColor: const Color(0xFF2563EB), title: 'Change Password', description: 'Update your account password', onTap: () => setState(() => _view = 'change-password')),
                if (isStaff) ...[
                  const SizedBox(height: 20),
                  const _SectionLabel('LIBRARY'),
                  _SettingCard(
                    iconPath: Icons.account_balance_outlined,
                    iconBg: const Color(0xFFFFF7ED),
                    iconColor: const Color(0xFFF97316),
                    title: 'Library Settings',
                    description: 'Loan periods, fines, borrowing limits, and more',
                    badge: AuthService.isAdmin() ? 'Admin' : null,
                    onTap: () => setState(() => _view = 'library-settings'),
                  ),
                ],
              ],
              if (_view == 'change-password') _ChangePasswordView(onBack: () => setState(() => _view = 'hub')),
              if (_view == 'account-info') _AccountInfoView(onBack: () => setState(() => _view = 'hub')),
              if (_view == 'library-settings') _LibrarySettingsView(onBack: () => setState(() => _view = 'hub')),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Shared widgets ─────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(left: 4, bottom: 10),
    child: Text(text, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF9CA3AF), letterSpacing: 1.2)),
  );
}

class _SettingCard extends StatelessWidget {
  final IconData iconPath;
  final Color iconBg, iconColor;
  final String title, description;
  final String? badge;
  final VoidCallback onTap;

  const _SettingCard({required this.iconPath, required this.iconBg, required this.iconColor, required this.title, required this.description, required this.onTap, this.badge});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE5E7EB))),
        child: Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(12)),
            child: Icon(iconPath, color: iconColor, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
              if (badge != null) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(4)),
                  child: Text(badge!, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFDC2626))),
                ),
              ],
            ]),
            const SizedBox(height: 2),
            Text(description, style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
          ])),
          const Icon(Icons.chevron_right, color: Color(0xFFD1D5DB), size: 20),
        ]),
      ),
    );
  }
}

Widget _subHeader(String title, VoidCallback onBack) => Padding(
  padding: const EdgeInsets.only(bottom: 24),
  child: Row(children: [
    GestureDetector(
      onTap: onBack,
      child: const Row(children: [
        Icon(Icons.arrow_back, size: 16, color: Color(0xFF6B7280)),
        SizedBox(width: 4),
        Text('Back', style: TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
      ]),
    ),
    const SizedBox(width: 8),
    const Text('/', style: TextStyle(color: Color(0xFFD1D5DB))),
    const SizedBox(width: 8),
    Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
  ]),
);

// ── Change Password ─────────────────────────────────────────────────────────────

class _ChangePasswordView extends StatefulWidget {
  final VoidCallback onBack;
  const _ChangePasswordView({required this.onBack});
  @override
  State<_ChangePasswordView> createState() => _ChangePasswordViewState();
}

class _ChangePasswordViewState extends State<_ChangePasswordView> {
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _showCurrent = false, _showNew = false, _showConfirm = false;
  Map<String, String?> _errors = {};
  bool _loading = false, _success = false;

  @override
  void dispose() { _currentCtrl.dispose(); _newCtrl.dispose(); _confirmCtrl.dispose(); super.dispose(); }

  Map<String, String?> _validate() {
    final errs = <String, String?>{};
    if (_currentCtrl.text.isEmpty) errs['current'] = 'Current password is required.';
    if (_newCtrl.text.isEmpty) errs['new'] = 'New password is required.';
    else if (_newCtrl.text.length < 8) errs['new'] = 'Password must be at least 8 characters.';
    else if (!RegExp(r'[A-Z]').hasMatch(_newCtrl.text)) errs['new'] = 'Include at least one uppercase letter.';
    else if (!RegExp(r'[0-9]').hasMatch(_newCtrl.text)) errs['new'] = 'Include at least one number.';
    if (_confirmCtrl.text.isEmpty) errs['confirm'] = 'Please confirm your new password.';
    else if (_newCtrl.text != _confirmCtrl.text) errs['confirm'] = 'Passwords do not match.';
    if (_currentCtrl.text.isNotEmpty && _newCtrl.text.isNotEmpty && _currentCtrl.text == _newCtrl.text)
      errs['new'] = 'New password must differ from your current one.';
    return errs;
  }

  Future<void> _submit() async {
    final errs = _validate();
    if (errs.values.any((e) => e != null)) { setState(() => _errors = errs); return; }
    setState(() { _loading = true; _errors = {}; });
    try {
      await ApiService.put('/auth/change-password', data: {
        'current_password': _currentCtrl.text,
        'new_password': _newCtrl.text,
      });
      setState(() { _success = true; _loading = false; });
      _currentCtrl.clear(); _newCtrl.clear(); _confirmCtrl.clear();
    } catch (e) {
      setState(() { _errors = {'current': 'Current password is incorrect.'}; _loading = false; });
    }
  }

  int _strength() {
    final p = _newCtrl.text;
    if (p.isEmpty) return 0;
    int s = 0;
    if (p.length >= 8) s++;
    if (RegExp(r'[A-Z]').hasMatch(p)) s++;
    if (RegExp(r'[0-9]').hasMatch(p)) s++;
    if (RegExp(r'[^A-Za-z0-9]').hasMatch(p)) s++;
    return s;
  }

  @override
  Widget build(BuildContext context) {
    final strength = _strength();
    final strengthColors = [Colors.transparent, const Color(0xFFF87171), const Color(0xFFFBBF24), const Color(0xFF3B82F6), const Color(0xFF10B981)];
    final strengthLabels = ['', 'Weak', 'Fair', 'Strong', 'Very Strong'];

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _subHeader('Change Password', widget.onBack),
      Container(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE5E7EB))),
        child: Column(children: [
          // Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFF3F4F6)))),
            child: Row(children: [
              Container(width: 36, height: 36, decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.lock_outline, color: Color(0xFF2563EB), size: 18)),
              const SizedBox(width: 12),
              const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Change Password', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
                Text('Update your account password', style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
              ]),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (_success) Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: const Color(0xFFF0FDF4), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFBBF7D0))),
                child: const Row(children: [
                  Icon(Icons.check, size: 16, color: Color(0xFF10B981)),
                  SizedBox(width: 8),
                  Text('Password updated successfully.', style: TextStyle(fontSize: 13, color: Color(0xFF166534), fontWeight: FontWeight.w500)),
                ]),
              ),

              _passwordField('Current Password', _currentCtrl, _showCurrent, () => setState(() => _showCurrent = !_showCurrent), error: _errors['current']),
              const SizedBox(height: 12),
              _passwordField('New Password', _newCtrl, _showNew, () => setState(() { _showNew = !_showNew; }), error: _errors['new'], onChanged: (_) => setState(() {})),

              // Strength bar
              if (_newCtrl.text.isNotEmpty) ...[
                const SizedBox(height: 8),
                Row(children: List.generate(4, (i) => Expanded(child: Container(
                  margin: EdgeInsets.only(right: i < 3 ? 4 : 0),
                  height: 4,
                  decoration: BoxDecoration(color: i < strength ? strengthColors[strength] : const Color(0xFFE5E7EB), borderRadius: BorderRadius.circular(2)),
                )))),
                const SizedBox(height: 4),
                Text(strengthLabels[strength], style: TextStyle(fontSize: 11, color: strengthColors[strength])),
              ],

              const SizedBox(height: 12),
              _passwordField('Confirm New Password', _confirmCtrl, _showConfirm, () => setState(() => _showConfirm = !_showConfirm), error: _errors['confirm']),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: const Color(0xFFFFFBEB), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFFDE68A))),
                child: const Text('Password must be at least 8 characters and include an uppercase letter and a number.', style: TextStyle(fontSize: 12, color: Color(0xFFB45309))),
              ),
              const SizedBox(height: 16),
              SizedBox(width: double.infinity, child: ElevatedButton(
                onPressed: _loading ? null : _submit,
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                child: Text(_loading ? 'Updating...' : 'Update Password', style: const TextStyle(fontWeight: FontWeight.w600)),
              )),
            ]),
          ),
        ]),
      ),
    ]);
  }

  Widget _passwordField(String label, TextEditingController ctrl, bool show, VoidCallback toggle, {String? error, ValueChanged<String>? onChanged}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF374151))),
      const SizedBox(height: 6),
      TextField(
        controller: ctrl,
        obscureText: !show,
        onChanged: onChanged,
        style: const TextStyle(fontSize: 13),
        decoration: InputDecoration(
          hintText: '••••••••',
          hintStyle: const TextStyle(color: Color(0xFFD1D5DB)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: error != null ? const Color(0xFFF87171) : const Color(0xFFD1D5DB))),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: error != null ? const Color(0xFFF87171) : const Color(0xFFD1D5DB))),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF93C5FD))),
          filled: true, fillColor: Colors.white,
          suffixIcon: GestureDetector(onTap: toggle, child: Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Text(show ? 'HIDE' : 'SHOW', style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w600)))),
        ),
      ),
      if (error != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text(error, style: const TextStyle(fontSize: 11, color: Color(0xFFEF4444)))),
    ]);
  }
}

// ── Account Info ────────────────────────────────────────────────────────────────

class _AccountInfoView extends StatelessWidget {
  final VoidCallback onBack;
  const _AccountInfoView({required this.onBack});

  @override
  Widget build(BuildContext context) {
    final user = AuthService.getCurrentUser();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _subHeader('Account Info', onBack),
      Container(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE5E7EB))),
        child: Column(children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFF3F4F6)))),
            child: Row(children: [
              Container(width: 36, height: 36, decoration: BoxDecoration(color: const Color(0xFFF5F3FF), borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.person_outline, color: Color(0xFF7C3AED), size: 18)),
              const SizedBox(width: 12),
              const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Account Info', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
                Text('Your account details', style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
              ]),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _infoRow('Full Name', user?['name'] ?? '—'),
              const SizedBox(height: 16),
              _infoRow('Email Address', user?['email'] ?? '—'),
              const SizedBox(height: 16),
              _infoRow('Role', (user?['role'] as String? ?? '—').toUpperCase()),
              const SizedBox(height: 16),
              const Text('To update your name or email, contact a librarian or administrator.', style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF), fontStyle: FontStyle.italic)),
            ]),
          ),
        ]),
      ),
    ]);
  }

  Widget _infoRow(String label, String value) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
    const SizedBox(height: 4),
    Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
  ]);
}

// ── Library Settings ────────────────────────────────────────────────────────────

const _settingFields = [
  {'key': 'LOAN_PERIOD_DAYS',         'label': 'Loan Period',          'description': 'How many days a borrower can keep a book',        'unit': 'days',    'min': 1, 'max': 365},
  {'key': 'RENEWAL_PERIOD_DAYS',      'label': 'Renewal Period',       'description': 'Extra days added when a book is renewed',         'unit': 'days',    'min': 1, 'max': 365},
  {'key': 'MAX_RENEWALS',             'label': 'Max Renewals',         'description': 'Maximum times a book can be renewed',            'unit': 'times',   'min': 0, 'max': 20},
  {'key': 'MAX_BOOKS_PER_BORROWER',   'label': 'Borrowing Limit',      'description': 'Max books a borrower can have at once',          'unit': 'books',   'min': 1, 'max': 50},
  {'key': 'FINE_PER_DAY',             'label': 'Fine Per Day',         'description': 'Fine charged per day for overdue books',         'unit': '₹ / day', 'min': 0, 'max': 1000, 'decimal': true},
  {'key': 'REQUEST_EXPIRY_DAYS',      'label': 'Request Expiry',       'description': 'Days before a pending book request expires',     'unit': 'days',    'min': 1, 'max': 90},
  {'key': 'MEMBERSHIP_DURATION_YEARS','label': 'Membership Duration',  'description': 'How many years a membership lasts',             'unit': 'years',   'min': 1, 'max': 10},
];

class _LibrarySettingsView extends StatefulWidget {
  final VoidCallback onBack;
  const _LibrarySettingsView({required this.onBack});
  @override
  State<_LibrarySettingsView> createState() => _LibrarySettingsViewState();
}

class _LibrarySettingsViewState extends State<_LibrarySettingsView> {
  Map<String, dynamic> _settings = {};
  Map<String, String> _form = {};
  bool _loading = true, _saving = false, _resetting = false, _dirty = false;
  final canChange = AuthService.isAdmin();

  @override
  void initState() { super.initState(); _fetchSettings(); }

  Future<void> _fetchSettings() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.get('/api/settings');
      final s = Map<String, dynamic>.from(res.data['settings'] ?? {});
      setState(() {
        _settings = s;
        _form = s.map((k, v) => MapEntry(k, v.toString()));
        _dirty = false;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleSave() async {
    // Validate
    for (final field in _settingFields) {
      final val = double.tryParse(_form[field['key'] as String] ?? '');
      final min = (field['min'] as int).toDouble();
      final max = (field['max'] as int).toDouble();
      if (val == null || val < min || val > max) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${field['label']} must be between ${field['min']} and ${field['max']}'), backgroundColor: Colors.red));
        return;
      }
    }
    setState(() => _saving = true);
    try {
      final payload = {for (final f in _settingFields) f['key'] as String: double.parse(_form[f['key'] as String]!)};
      await ApiService.put('/api/settings', data: payload);
      setState(() { _settings = Map.from(_form); _dirty = false; _saving = false; });
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Settings saved!'), backgroundColor: Colors.green));
    } catch (_) {
      setState(() => _saving = false);
    }
  }

  Future<void> _handleReset() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reset to defaults?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Reset')),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => _resetting = true);
    try {
      final res = await ApiService.post('/api/settings/reset');
      final s = Map<String, dynamic>.from(res.data['settings'] ?? {});
      setState(() { _settings = s; _form = s.map((k, v) => MapEntry(k, v.toString())); _dirty = false; _resetting = false; });
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Settings reset to defaults'), backgroundColor: Colors.green));
    } catch (_) {
      setState(() => _resetting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _subHeader('Library Settings', widget.onBack),
      Container(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE5E7EB))),
        child: Column(children: [
          // Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFF3F4F6)))),
            child: Row(children: [
              Container(width: 36, height: 36, decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.account_balance_outlined, color: Color(0xFFF97316), size: 18)),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Library Settings', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
                Text(canChange ? 'Configure system-wide library rules' : 'View current library configuration', style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
              ])),
              if (canChange) GestureDetector(
                onTap: _resetting ? null : _handleReset,
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.refresh, size: 14, color: Color(0xFF9CA3AF)),
                  const SizedBox(width: 4),
                  Text(_resetting ? 'Resetting...' : 'Reset to defaults', style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                ]),
              ),
            ]),
          ),

          // Read-only notice
          if (!canChange) Container(
            margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFFFFBEB), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFFDE68A))),
            child: const Row(children: [
              Icon(Icons.warning_amber_outlined, size: 16, color: Color(0xFFD97706)),
              SizedBox(width: 8),
              Expanded(child: Text('Only administrators can change these settings.', style: TextStyle(fontSize: 12, color: Color(0xFFB45309)))),
            ]),
          ),

          if (_loading)
            const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator()))
          else
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(children: [
                // Settings grid
                ...List.generate((_settingFields.length / 2).ceil(), (row) {
                  final start = row * 2;
                  final end = (start + 2).clamp(0, _settingFields.length);
                  final rowFields = _settingFields.sublist(start, end);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: rowFields.map((field) {
                      final key = field['key'] as String;
                      final changed = canChange && _form[key] != _settings[key]?.toString();
                      return Expanded(child: Padding(
                        padding: EdgeInsets.only(right: rowFields.last == field ? 0 : 12),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(field['label'] as String, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
                          const SizedBox(height: 4),
                          Text(field['description'] as String, style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
                          const SizedBox(height: 8),
                          TextField(
                            enabled: canChange,
                            controller: TextEditingController(text: _form[key] ?? ''),
                            onChanged: (v) { setState(() { _form[key] = v; _dirty = true; }); },
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            style: const TextStyle(fontSize: 13),
                            decoration: InputDecoration(
                              suffixText: field['unit'] as String,
                              suffixStyle: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFD1D5DB))),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFD1D5DB))),
                              disabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
                              filled: true, fillColor: canChange ? Colors.white : const Color(0xFFF9FAFB),
                            ),
                          ),
                          if (changed) Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text('Was: ${_settings[key]} ${field['unit']}', style: const TextStyle(fontSize: 11, color: Color(0xFF3B82F6))),
                          ),
                        ]),
                      ));
                    }).toList()),
                  );
                }),

                if (canChange) ...[
                  const SizedBox(height: 8),
                  Row(children: [
                    ElevatedButton(
                      onPressed: (_saving || !_dirty) ? null : _handleSave,
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                      child: Text(_saving ? 'Saving...' : 'Save Changes', style: const TextStyle(fontWeight: FontWeight.w600)),
                    ),
                    if (_dirty) ...[
                      const SizedBox(width: 10),
                      OutlinedButton(
                        onPressed: () { setState(() { _form = _settings.map((k, v) => MapEntry(k, v.toString())); _dirty = false; }); },
                        style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12), side: const BorderSide(color: Color(0xFFE5E7EB)), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                        child: const Text('Discard', style: TextStyle(color: Color(0xFF6B7280))),
                      ),
                      const SizedBox(width: 10),
                      const Row(children: [
                        Icon(Icons.warning_amber_outlined, size: 14, color: Color(0xFFD97706)),
                        SizedBox(width: 4),
                        Text('Unsaved changes', style: TextStyle(fontSize: 12, color: Color(0xFFD97706))),
                      ]),
                    ],
                  ]),
                ],
              ]),
            ),
        ]),
      ),
    ]);
  }
}