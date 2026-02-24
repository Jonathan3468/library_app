// lib/pages/add_borrower_page.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';
import '../widgets/form_widgets.dart';

class AddBorrowerPage extends StatefulWidget {
  const AddBorrowerPage({super.key});

  @override
  State<AddBorrowerPage> createState() => _AddBorrowerPageState();
}

class _AddBorrowerPageState extends State<AddBorrowerPage> {
  final _nameCtrl    = TextEditingController();
  final _rfCtrl      = TextEditingController();
  final _emailCtrl   = TextEditingController();
  final _phoneCtrl   = TextEditingController();
  final _addressCtrl = TextEditingController();

  bool _loading = false;

  // Per-field touched + error state (mirrors React's touched/errors objects)
  final Map<String, bool>   _touched = {};
  final Map<String, String> _errors  = {};

  @override
  void initState() {
    super.initState();
    for (final e in _fields) {
      e.ctrl.addListener(() => _onChanged(e.name));
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _rfCtrl.dispose();
    _emailCtrl.dispose(); _phoneCtrl.dispose(); _addressCtrl.dispose();
    super.dispose();
  }

  // ── Field definitions ─────────────────────────────────────────────────

  List<_FieldDef> get _fields => [
    _FieldDef(name: 'borrower_name', ctrl: _nameCtrl),
    _FieldDef(name: 'rf_id',         ctrl: _rfCtrl),
    _FieldDef(name: 'email',         ctrl: _emailCtrl),
    _FieldDef(name: 'phone',         ctrl: _phoneCtrl),
    _FieldDef(name: 'address',       ctrl: _addressCtrl),
  ];

  // ── Validation ────────────────────────────────────────────────────────

  String _validate(String name, String value) {
    switch (name) {
      case 'borrower_name':
        if (value.trim().isEmpty)  return 'Borrower name is required';
        if (value.trim().length < 2)  return 'Name must be at least 2 characters';
        if (value.trim().length > 100) return 'Name must not exceed 100 characters';
        if (!RegExp(r"^[a-zA-Z\s.'\-]+$").hasMatch(value.trim())) {
          return 'Name can only contain letters, spaces, and basic punctuation';
        }
        return '';

      case 'email':
        if (value.trim().isEmpty) return '';
        if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value.trim())) {
          return 'Please enter a valid email address';
        }
        if (value.length > 100) return 'Email must not exceed 100 characters';
        return '';

      case 'phone':
        if (value.trim().isEmpty) return '';
        final clean = value.replaceAll(RegExp(r'[\s\-]'), '');
        if (!RegExp(r'^\+?[\d]{10,15}$').hasMatch(clean)) {
          return 'Please enter a valid phone number (10–15 digits)';
        }
        return '';

      case 'rf_id':
        if (value.trim().isEmpty) return '';
        if (value.length > 50) return 'RF ID must not exceed 50 characters';
        if (!RegExp(r'^[a-zA-Z0-9\-_]+$').hasMatch(value.trim())) {
          return 'RF ID can only contain letters, numbers, hyphens, and underscores';
        }
        return '';

      case 'address':
        if (value.length > 500) return 'Address must not exceed 500 characters';
        return '';

      default: return '';
    }
  }

  bool _validateAll() {
    final newErrors = <String, String>{};
    for (final f in _fields) {
      final e = _validate(f.name, f.ctrl.text);
      if (e.isNotEmpty) newErrors[f.name] = e;
    }
    if (_nameCtrl.text.trim().isEmpty) {
      newErrors['borrower_name'] = 'Borrower name is required';
    }
    setState(() => _errors
      ..clear()
      ..addAll(newErrors));
    return newErrors.isEmpty;
  }

  void _onChanged(String name) {
    if (_touched[name] == true) {
      final err = _validate(name, _ctrl(name).text);
      setState(() => err.isEmpty ? _errors.remove(name) : _errors[name] = err);
    }
  }

  void _onBlur(String name) {
    setState(() {
      _touched[name] = true;
      final err = _validate(name, _ctrl(name).text);
      err.isEmpty ? _errors.remove(name) : _errors[name] = err;
    });
  }

  TextEditingController _ctrl(String name) => switch (name) {
    'borrower_name' => _nameCtrl,
    'rf_id'         => _rfCtrl,
    'email'         => _emailCtrl,
    'phone'         => _phoneCtrl,
    'address'       => _addressCtrl,
    _               => _nameCtrl,
  };

  bool _isValid(String name) =>
      _touched[name] == true &&
      !_errors.containsKey(name) &&
      _ctrl(name).text.isNotEmpty;

  bool _hasError(String name) =>
      _touched[name] == true && _errors.containsKey(name);

  // ── Submit ────────────────────────────────────────────────────────────

  Future<void> _submit() async {
    // Touch all
    for (final f in _fields) { _touched[f.name] = true; }
    if (!_validateAll()) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please fix the errors before submitting')));
      return;
    }

    setState(() => _loading = true);
    try {
      await ApiService.post('/borrowers', data: {
        'borrower_name': _nameCtrl.text.trim(),
        'email':   _emailCtrl.text.trim().isNotEmpty ? _emailCtrl.text.trim()   : null,
        'phone':   _phoneCtrl.text.trim().isNotEmpty ? _phoneCtrl.text.trim()   : null,
        'address': _addressCtrl.text.trim().isNotEmpty ? _addressCtrl.text.trim() : null,
        'rf_id':   _rfCtrl.text.trim().isNotEmpty ? _rfCtrl.text.trim()         : null,
      });
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('✅ Borrower added successfully!')));
        context.go('/borrowers');
      }
    } catch (e) {
      final msg = _extractError(e);
      if (msg.toLowerCase().contains('email') && msg.toLowerCase().contains('exist')) {
        setState(() => _errors['email'] = 'This email is already registered');
      } else if (msg.toLowerCase().contains('rf_id') && msg.toLowerCase().contains('exist')) {
        setState(() => _errors['rf_id'] = 'This RF ID is already registered');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(msg.isNotEmpty ? msg : 'Failed to add borrower. Please try again.')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _extractError(dynamic e) {
    try { return e.response?.data?['error'] ?? ''; } catch (_) { return ''; }
  }

  // ── Build ─────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final hasAnyError = _errors.isNotEmpty;

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              GestureDetector(
                onTap: () => context.go('/borrowers'),
                child: const Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.arrow_back, size: 18, color: Color(0xFF6B7280)),
                  SizedBox(width: 4),
                  Text('Back', style: TextStyle(fontSize: 14, color: Color(0xFF6B7280))),
                ]),
              ),
              const SizedBox(height: 12),
              const Text('Add New Borrower',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
              const SizedBox(height: 20),

              FormCard(title: 'Borrower Information', children: [
                // ── Full Name ──
                const FieldLabel(label: 'Full Name', required: true),
                const SizedBox(height: 6),
                Focus(
                  onFocusChange: (f) { if (!f) _onBlur('borrower_name'); },
                  child: ValidatedField(
                    controller: _nameCtrl,
                    placeholder: 'Enter full name',
                    touched: _touched['borrower_name'] == true,
                    hasError: _hasError('borrower_name'),
                    isValid: _isValid('borrower_name'),
                  ),
                ),
                if (_hasError('borrower_name'))
                  ValidationMsg(msg: _errors['borrower_name']!, isError: true),
                const SizedBox(height: 16),

                // ── RF ID ──
                const FieldLabel(label: 'RF ID / Card Number'),
                const SizedBox(height: 6),
                Focus(
                  onFocusChange: (f) { if (!f) _onBlur('rf_id'); },
                  child: ValidatedField(
                    controller: _rfCtrl,
                    placeholder: 'Scan or enter RF ID card',
                    touched: _touched['rf_id'] == true,
                    hasError: _hasError('rf_id'),
                    isValid: _isValid('rf_id'),
                  ),
                ),
                if (_hasError('rf_id'))
                  ValidationMsg(msg: _errors['rf_id']!, isError: true)
                else
                  const _HintRow(
                    icon: Icons.info_outline,
                    text: 'Scan RF card or enter ID manually — used for quick borrower identification',
                  ),
                const SizedBox(height: 16),

                // ── Email ──
                FieldLabel(
                  label: 'Email',
                  hint: null,
                  required: false,
                ),
                const SizedBox(height: 6),
                Focus(
                  onFocusChange: (f) { if (!f) _onBlur('email'); },
                  child: ValidatedField(
                    controller: _emailCtrl,
                    placeholder: 'borrower@example.com',
                    keyboardType: TextInputType.emailAddress,
                    touched: _touched['email'] == true,
                    hasError: _hasError('email'),
                    isValid: _isValid('email'),
                  ),
                ),
                if (_hasError('email'))
                  ValidationMsg(msg: _errors['email']!, isError: true)
                else
                  const _HintRow(
                    icon: Icons.email_outlined,
                    text: 'Required to receive automated overdue notifications',
                  ),
                const SizedBox(height: 16),

                // ── Phone ──
                const FieldLabel(label: 'Phone Number'),
                const SizedBox(height: 6),
                Focus(
                  onFocusChange: (f) { if (!f) _onBlur('phone'); },
                  child: ValidatedField(
                    controller: _phoneCtrl,
                    placeholder: '+1234567890 or 1234567890',
                    keyboardType: TextInputType.phone,
                    touched: _touched['phone'] == true,
                    hasError: _hasError('phone'),
                    isValid: _isValid('phone'),
                  ),
                ),
                if (_hasError('phone'))
                  ValidationMsg(msg: _errors['phone']!, isError: true)
                else
                  const _HintRow(
                    icon: Icons.phone_outlined,
                    text: 'Enter 10–15 digit phone number (with or without country code)',
                  ),
                const SizedBox(height: 16),

                // ── Address ──
                const FieldLabel(label: 'Address'),
                const SizedBox(height: 6),
                Focus(
                  onFocusChange: (f) { if (!f) _onBlur('address'); },
                  child: ValidatedField(
                    controller: _addressCtrl,
                    placeholder: 'Enter full address',
                    maxLines: 3,
                    touched: _touched['address'] == true,
                    hasError: _hasError('address'),
                    isValid: false, // address optional — don't show green
                  ),
                ),
                if (_hasError('address'))
                  ValidationMsg(msg: _errors['address']!, isError: true),
                Align(
                  alignment: Alignment.centerRight,
                  child: Text('${_addressCtrl.text.length}/500',
                      style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF))),
                ),
                const SizedBox(height: 16),

                // ── Error summary ──
                if (hasAnyError && _touched.isNotEmpty) ...[
                  ErrorBanner(
                    title: 'Please fix the following errors:',
                    messages: _errors.values.toList(),
                  ),
                  const SizedBox(height: 16),
                ],

                FormActions(
                  submitLabel: 'Add Borrower',
                  loading: _loading,
                  disabled: _loading,
                  onSubmit: _submit,
                  onCancel: () => context.go('/borrowers'),
                ),
              ]),
              const SizedBox(height: 32),
            ]),
          ),
        ),
      ),
    );
  }
}

class _FieldDef {
  final String name;
  final TextEditingController ctrl;
  const _FieldDef({required this.name, required this.ctrl});
}

class _HintRow extends StatelessWidget {
  final IconData icon;
  final String text;
  const _HintRow({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 13, color: const Color(0xFF9CA3AF)),
        const SizedBox(width: 5),
        Expanded(child: Text(text,
            style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)))),
      ]),
    );
  }
}