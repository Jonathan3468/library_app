// lib/pages/reset_password_page.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';

// On mobile, password reset is a two-step flow:
//   Step 1 — enter the 6-digit code from the reset email
//   Step 2 — enter + confirm new password
// (Web uses a URL token; mobile uses a manual code entry)

class ResetPasswordPage extends StatefulWidget {
  const ResetPasswordPage({super.key});

  @override
  State<ResetPasswordPage> createState() => _ResetPasswordPageState();
}

class _ResetPasswordPageState extends State<ResetPasswordPage> {
  int _step = 1; // 1 = enter code, 2 = enter new password

  final _codeCtrl     = TextEditingController();
  final _passCtrl     = TextEditingController();
  final _confirmCtrl  = TextEditingController();
  bool _obscurePass    = true;
  bool _obscureConfirm = true;

  bool _loading  = false;
  String? _error;

  String? _codeError;
  String? _passError;
  String? _confirmError;

  @override
  void dispose() {
    _codeCtrl.dispose(); _passCtrl.dispose(); _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _verifyCode() async {
    final code = _codeCtrl.text.trim();
    if (code.isEmpty) { setState(() => _codeError = 'Please enter the reset code.'); return; }
    if (code.length < 4) { setState(() => _codeError = 'Code seems too short.'); return; }
    setState(() { _loading = true; _error = null; _codeError = null; });
    try {
      // Verify the token is valid before proceeding to step 2
      await ApiService.post('/auth/verify-reset-token', data: {'token': code});
      setState(() => _step = 2);
    } catch (_) {
      setState(() => _error = 'Invalid or expired code. Please request a new one.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resetPassword() async {
    final pass    = _passCtrl.text;
    final confirm = _confirmCtrl.text;
    bool valid = true;
    if (pass.length < 8) { setState(() => _passError = 'At least 8 characters required.'); valid = false; }
    else if (!RegExp(r'[A-Z]').hasMatch(pass)) { setState(() => _passError = 'Include at least one uppercase letter.'); valid = false; }
    else if (!RegExp(r'[0-9]').hasMatch(pass)) { setState(() => _passError = 'Include at least one number.'); valid = false; }
    else { setState(() => _passError = null); }
    if (pass != confirm) { setState(() => _confirmError = 'Passwords do not match.'); valid = false; }
    else { setState(() => _confirmError = null); }
    if (!valid) return;

    setState(() { _loading = true; _error = null; });
    try {
      await ApiService.post('/auth/reset-password', data: {
        'token':    _codeCtrl.text.trim(),
        'password': pass,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Password reset successfully! Please sign in.')),
        );
        context.go('/login');
      }
    } catch (_) {
      setState(() => _error = 'Failed to reset password. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(children: [
                // Brand
                Container(
                  width: 56, height: 56,
                  decoration: BoxDecoration(color: const Color(0xFF2563EB), borderRadius: BorderRadius.circular(16)),
                  child: const Icon(Icons.menu_book_rounded, color: Colors.white, size: 28),
                ),
                const SizedBox(height: 12),
                const Text('SmartLib', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Color(0xFF111827))),
                const SizedBox(height: 4),
                const Text('Library Management System', style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
                const SizedBox(height: 28),

                // Card
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 24, offset: Offset(0, 4))],
                  ),
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 200),
                    child: _step == 1 ? _buildStep1() : _buildStep2(),
                  ),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }

  // ── Step 1: Enter reset code ───────────────────────────────────────────────

  Widget _buildStep1() {
    return Column(key: const ValueKey('step1'), crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Check Your Email', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Color(0xFF111827))),
      const SizedBox(height: 6),
      const Text(
        "We've sent a reset code to your email. Enter it below to continue.",
        style: TextStyle(fontSize: 13, color: Color(0xFF6B7280), height: 1.5),
      ),
      const SizedBox(height: 20),

      if (_error != null) _ErrorBox(_error!),

      const _FieldLabel('Reset Code'),
      const SizedBox(height: 6),
      TextField(
        controller: _codeCtrl,
        keyboardType: TextInputType.text,
        onSubmitted: (_) => _verifyCode(),
        style: const TextStyle(fontSize: 16, letterSpacing: 3, fontWeight: FontWeight.w600),
        decoration: InputDecoration(
          hintText: 'Enter your code',
          hintStyle: const TextStyle(fontSize: 13, color: Color(0xFFD1D5DB), letterSpacing: 0),
          prefixIcon: const Icon(Icons.vpn_key_outlined, size: 17, color: Color(0xFF9CA3AF)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: _codeError != null ? const Color(0xFFF87171) : const Color(0xFFE5E7EB))),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5)),
          filled: true, fillColor: const Color(0xFFFAFAFA),
        ),
      ),
      if (_codeError != null) ...[
        const SizedBox(height: 4),
        Text(_codeError!, style: const TextStyle(fontSize: 11, color: Color(0xFFEF4444))),
      ],
      const SizedBox(height: 20),

      _SubmitBtn(label: 'Verify Code', loading: _loading, onTap: _verifyCode),
      const SizedBox(height: 12),
      Center(child: GestureDetector(
        onTap: () => context.go('/login'),
        child: const Text('← Back to login', style: TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
      )),
    ]);
  }

  // ── Step 2: Enter new password ────────────────────────────────────────────

  Widget _buildStep2() {
    return Column(key: const ValueKey('step2'), crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Set New Password', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Color(0xFF111827))),
      const SizedBox(height: 6),
      const Text('Choose a strong password for your account.', style: TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
      const SizedBox(height: 20),

      if (_error != null) _ErrorBox(_error!),

      const _FieldLabel('New Password'),
      const SizedBox(height: 6),
      _PassField(ctrl: _passCtrl, obscure: _obscurePass, onToggle: () => setState(() => _obscurePass = !_obscurePass), error: _passError,
        onChanged: (v) => setState(() { _passError = v.length < 8 ? 'At least 8 characters required.' : null; }),
      ),
      const SizedBox(height: 14),
      const _FieldLabel('Confirm Password'),
      const SizedBox(height: 6),
      _PassField(ctrl: _confirmCtrl, obscure: _obscureConfirm, onToggle: () => setState(() => _obscureConfirm = !_obscureConfirm), error: _confirmError,
        onChanged: (v) => setState(() { _confirmError = v != _passCtrl.text ? 'Passwords do not match.' : null; }),
        onSubmit: (_) => _resetPassword(),
      ),
      const SizedBox(height: 20),

      _SubmitBtn(label: 'Reset Password', loading: _loading, onTap: _resetPassword),
    ]);
  }
}

// ── Small shared widgets ──────────────────────────────────────────────────────

class _FieldLabel extends StatelessWidget {
  final String label;
  const _FieldLabel(this.label);
  @override
  Widget build(BuildContext context) => Text(label,
    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF374151)));
}

class _ErrorBox extends StatelessWidget {
  final String msg;
  const _ErrorBox(this.msg);
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 16),
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
    decoration: BoxDecoration(
      color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(10),
      border: Border.all(color: const Color(0xFFFECACA)),
    ),
    child: Text(msg, style: const TextStyle(fontSize: 12, color: Color(0xFFDC2626))),
  );
}

class _PassField extends StatelessWidget {
  final TextEditingController ctrl;
  final bool obscure;
  final VoidCallback onToggle;
  final String? error;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmit;
  const _PassField({required this.ctrl, required this.obscure, required this.onToggle, this.error, this.onChanged, this.onSubmit});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      TextField(
        controller: ctrl, obscureText: obscure,
        onChanged: onChanged, onSubmitted: onSubmit,
        style: const TextStyle(fontSize: 14),
        decoration: InputDecoration(
          hintText: '••••••••',
          hintStyle: const TextStyle(fontSize: 13, color: Color(0xFFD1D5DB)),
          prefixIcon: const Icon(Icons.lock_outline, size: 17, color: Color(0xFF9CA3AF)),
          suffixIcon: GestureDetector(onTap: onToggle,
            child: Padding(padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(obscure ? 'SHOW' : 'HIDE',
                style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w600)))),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: error != null ? const Color(0xFFF87171) : const Color(0xFFE5E7EB))),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5)),
          filled: true, fillColor: const Color(0xFFFAFAFA),
        ),
      ),
      if (error != null) ...[
        const SizedBox(height: 4),
        Text(error!, style: const TextStyle(fontSize: 11, color: Color(0xFFEF4444))),
      ],
    ]);
  }
}

class _SubmitBtn extends StatelessWidget {
  final String label;
  final bool loading;
  final VoidCallback onTap;
  const _SubmitBtn({required this.label, required this.loading, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: GestureDetector(
        onTap: loading ? null : onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: loading ? const Color(0xFF93C5FD) : const Color(0xFF2563EB),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(child: loading
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Text(label, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600))),
        ),
      ),
    );
  }
}