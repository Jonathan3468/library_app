// lib/pages/auth_pages.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../utils/auth.dart';

class AuthPage extends StatefulWidget {
  const AuthPage({super.key});

  @override
  State<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends State<AuthPage> {
  // 'login' | 'register' | 'forgot'
  String _mode = 'login';
  bool _loading = false;

  // ── Login ──
  final _loginEmailCtrl    = TextEditingController();
  final _loginPasswordCtrl = TextEditingController();
  bool _loginObscure       = true;
  final Map<String, String?> _loginErrors   = {};
  final Map<String, bool>    _loginTouched  = {};

  // ── Register ──
  final _regNameCtrl     = TextEditingController();
  final _regEmailCtrl    = TextEditingController();
  final _regPassCtrl     = TextEditingController();
  final _regConfirmCtrl  = TextEditingController();
  final _regCodeCtrl     = TextEditingController();
  bool _regObscure       = true;
  bool _regConfirmObscure = true;
  String _selectedRole   = 'member';
  final Map<String, String?> _regErrors  = {};
  final Map<String, bool>    _regTouched = {};

  // ── Forgot ──
  final _forgotEmailCtrl = TextEditingController();

  @override
  void dispose() {
    _loginEmailCtrl.dispose(); _loginPasswordCtrl.dispose();
    _regNameCtrl.dispose(); _regEmailCtrl.dispose();
    _regPassCtrl.dispose(); _regConfirmCtrl.dispose(); _regCodeCtrl.dispose();
    _forgotEmailCtrl.dispose();
    super.dispose();
  }

  // ── Validators ────────────────────────────────────────────────────────────

  String? _validateName(String v) {
    if (v.trim().isEmpty) return 'Full name is required.';
    if (v.trim().length < 2) return 'Name must be at least 2 characters.';
    if (!RegExp(r"^[a-zA-Z\s'-]+$").hasMatch(v)) return 'Name contains invalid characters.';
    return null;
  }

  String? _validateEmail(String v) {
    if (v.trim().isEmpty) return 'Email is required.';
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v)) return 'Enter a valid email address.';
    return null;
  }

  String? _validatePassword(String v) {
    if (v.isEmpty) return 'Password is required.';
    if (v.length < 8) return 'Password must be at least 8 characters.';
    if (!RegExp(r'[A-Z]').hasMatch(v)) return 'Include at least one uppercase letter.';
    if (!RegExp(r'[0-9]').hasMatch(v)) return 'Include at least one number.';
    return null;
  }

  String? _validateConfirm(String v) {
    if (v.isEmpty) return 'Please confirm your password.';
    if (v != _regPassCtrl.text) return 'Passwords do not match.';
    return null;
  }

  String? _validateRoleCode(String v) {
    if (_selectedRole == 'member') return null;
    if (v.trim().isEmpty) return 'Access code is required for this role.';
    return null;
  }

  // ── Password strength ─────────────────────────────────────────────────────

  int _passwordStrength(String p) {
    if (p.isEmpty) return 0;
    int score = 0;
    if (p.length >= 8) score++;
    if (RegExp(r'[A-Z]').hasMatch(p)) score++;
    if (RegExp(r'[0-9]').hasMatch(p)) score++;
    if (RegExp(r'[^A-Za-z0-9]').hasMatch(p)) score++;
    return score;
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  Future<void> _handleLogin() async {
    setState(() {
      _loginTouched['email']    = true;
      _loginTouched['password'] = true;
      _loginErrors['email']     = _validateEmail(_loginEmailCtrl.text);
      _loginErrors['password']  = _loginPasswordCtrl.text.isEmpty ? 'Password is required.' : null;
    });
    if (_loginErrors.values.any((e) => e != null)) return;

    setState(() => _loading = true);
    try {
      await AuthService.login(_loginEmailCtrl.text.trim(), _loginPasswordCtrl.text.trim());
      if (mounted) context.go('/dashboard');
    } catch (_) {}
    finally { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _handleRegister() async {
    setState(() {
      for (final f in ['name', 'email', 'password', 'confirm', 'roleCode']) _regTouched[f] = true;
      _regErrors['name']     = _validateName(_regNameCtrl.text);
      _regErrors['email']    = _validateEmail(_regEmailCtrl.text);
      _regErrors['password'] = _validatePassword(_regPassCtrl.text);
      _regErrors['confirm']  = _validateConfirm(_regConfirmCtrl.text);
      _regErrors['roleCode'] = _validateRoleCode(_regCodeCtrl.text);
    });
    if (_regErrors.values.any((e) => e != null)) return;

    setState(() => _loading = true);
    try {
      await AuthService.register(
        name: _regNameCtrl.text.trim(),
        email: _regEmailCtrl.text.trim(),
        password: _regPassCtrl.text,
        role: _selectedRole,
        roleCode: _regCodeCtrl.text.trim(),
      );
      if (mounted) {
        setState(() => _mode = 'login');
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Account created! Please sign in.')),
        );
      }
    } catch (_) {}
    finally { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _handleForgotPassword() async {
    final email = _forgotEmailCtrl.text.trim();
    if (email.isEmpty) return;
    setState(() => _loading = true);
    try {
      await AuthService.forgotPassword(email);
      if (mounted) context.go('/reset-password');
    } catch (_) {}
    finally { if (mounted) setState(() => _loading = false); }
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(statusBarColor: Colors.transparent),
      child: Scaffold(
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
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 24, offset: Offset(0, 4))],
                    ),
                    child: Column(children: [

                      // ── Tab bar (login / register) ──
                      if (_mode != 'forgot')
                        Container(
                          decoration: const BoxDecoration(
                            border: Border(bottom: BorderSide(color: Color(0xFFE5E7EB))),
                            borderRadius: BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(20)),
                          ),
                          child: Row(children: [
                            _Tab('Sign In',  _mode == 'login',    () => setState(() => _mode = 'login'),    isFirst: true),
                            _Tab('Register', _mode == 'register', () => setState(() => _mode = 'register'), isFirst: false),
                          ]),
                        ),

                      Padding(
                        padding: const EdgeInsets.all(24),
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 200),
                          child: _mode == 'login'    ? _buildLoginForm()
                               : _mode == 'register' ? _buildRegisterForm()
                               : _buildForgotForm(),
                        ),
                      ),
                    ]),
                  ),

                  const SizedBox(height: 20),
                  Text(
                    '© ${DateTime.now().year} SmartLib · Library Management System',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                  ),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ── Login form ─────────────────────────────────────────────────────────────

  Widget _buildLoginForm() {
    return Column(key: const ValueKey('login'), crossAxisAlignment: CrossAxisAlignment.start, children: [
      _AuthField(
        label: 'Email',
        ctrl: _loginEmailCtrl,
        type: TextInputType.emailAddress,
        hint: 'you@example.com',
        icon: Icons.mail_outline,
        error: _loginTouched['email'] == true ? _loginErrors['email'] : null,
        onChanged: (v) {
          if (_loginTouched['email'] == true) setState(() => _loginErrors['email'] = _validateEmail(v));
        },
        onBlur: () => setState(() {
          _loginTouched['email'] = true;
          _loginErrors['email']  = _validateEmail(_loginEmailCtrl.text);
        }),
      ),
      _AuthField(
        label: 'Password',
        ctrl: _loginPasswordCtrl,
        hint: '••••••••',
        icon: Icons.lock_outline,
        obscure: _loginObscure,
        onToggleObscure: () => setState(() => _loginObscure = !_loginObscure),
        error: _loginTouched['password'] == true ? _loginErrors['password'] : null,
        onChanged: (v) {
          if (_loginTouched['password'] == true) setState(() => _loginErrors['password'] = v.isEmpty ? 'Password is required.' : null);
        },
        onBlur: () => setState(() {
          _loginTouched['password'] = true;
          _loginErrors['password']  = _loginPasswordCtrl.text.isEmpty ? 'Password is required.' : null;
        }),
        onSubmit: (_) => _handleLogin(),
      ),
      Align(
        alignment: Alignment.centerRight,
        child: GestureDetector(
          onTap: () => setState(() => _mode = 'forgot'),
          child: const Padding(
            padding: EdgeInsets.only(bottom: 16),
            child: Text('Forgot password?', style: TextStyle(fontSize: 12, color: Color(0xFF2563EB), fontWeight: FontWeight.w500)),
          ),
        ),
      ),
      _SubmitButton(label: 'Sign In', loading: _loading, onTap: _handleLogin),
    ]);
  }

  // ── Register form ──────────────────────────────────────────────────────────

  Widget _buildRegisterForm() {
    final strength = _passwordStrength(_regPassCtrl.text);
    return Column(key: const ValueKey('register'), crossAxisAlignment: CrossAxisAlignment.start, children: [
      _AuthField(
        label: 'Full Name',
        ctrl: _regNameCtrl,
        hint: 'Jane Smith',
        icon: Icons.person_outline,
        error: _regTouched['name'] == true ? _regErrors['name'] : null,
        onChanged: (v) { if (_regTouched['name'] == true) setState(() => _regErrors['name'] = _validateName(v)); },
        onBlur: () => setState(() { _regTouched['name'] = true; _regErrors['name'] = _validateName(_regNameCtrl.text); }),
      ),
      _AuthField(
        label: 'Email',
        ctrl: _regEmailCtrl,
        type: TextInputType.emailAddress,
        hint: 'you@example.com',
        icon: Icons.mail_outline,
        error: _regTouched['email'] == true ? _regErrors['email'] : null,
        onChanged: (v) { if (_regTouched['email'] == true) setState(() => _regErrors['email'] = _validateEmail(v)); },
        onBlur: () => setState(() { _regTouched['email'] = true; _regErrors['email'] = _validateEmail(_regEmailCtrl.text); }),
      ),
      _AuthField(
        label: 'Password',
        ctrl: _regPassCtrl,
        hint: '••••••••',
        icon: Icons.lock_outline,
        obscure: _regObscure,
        onToggleObscure: () => setState(() => _regObscure = !_regObscure),
        error: _regTouched['password'] == true ? _regErrors['password'] : null,
        onChanged: (v) {
          setState(() {
            if (_regTouched['password'] == true) _regErrors['password'] = _validatePassword(v);
          });
        },
        onBlur: () => setState(() { _regTouched['password'] = true; _regErrors['password'] = _validatePassword(_regPassCtrl.text); }),
      ),
      // Password strength bar
      if (_regPassCtrl.text.isNotEmpty) ...[
        Row(children: List.generate(4, (i) => Expanded(child: Container(
          margin: const EdgeInsets.only(right: 4),
          height: 3,
          decoration: BoxDecoration(
            color: i < strength ? [
              const Color(0xFFEF4444),
              const Color(0xFFF59E0B),
              const Color(0xFF3B82F6),
              const Color(0xFF10B981),
            ][strength - 1] : const Color(0xFFE5E7EB),
            borderRadius: BorderRadius.circular(2),
          ),
        )))),
        const SizedBox(height: 4),
        Text(
          ['', 'Weak', 'Fair', 'Strong', 'Very Strong'][strength],
          style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
        ),
        const SizedBox(height: 12),
      ],
      _AuthField(
        label: 'Confirm Password',
        ctrl: _regConfirmCtrl,
        hint: '••••••••',
        icon: Icons.lock_outline,
        obscure: _regConfirmObscure,
        onToggleObscure: () => setState(() => _regConfirmObscure = !_regConfirmObscure),
        error: _regTouched['confirm'] == true ? _regErrors['confirm'] : null,
        onChanged: (v) { if (_regTouched['confirm'] == true) setState(() => _regErrors['confirm'] = _validateConfirm(v)); },
        onBlur: () => setState(() { _regTouched['confirm'] = true; _regErrors['confirm'] = _validateConfirm(_regConfirmCtrl.text); }),
      ),

      // Role selector
      const _FieldLabel('Account Role'),
      const SizedBox(height: 8),
      Row(children: [
        _RoleCard(role: 'member',    label: 'Member',    desc: 'Browse & borrow books',      selected: _selectedRole, onTap: (r) => setState(() { _selectedRole = r; _regCodeCtrl.clear(); })),
        const SizedBox(width: 8),
        _RoleCard(role: 'librarian', label: 'Librarian', desc: 'Manage library operations',  selected: _selectedRole, onTap: (r) => setState(() { _selectedRole = r; _regCodeCtrl.clear(); })),
        const SizedBox(width: 8),
        _RoleCard(role: 'admin',     label: 'Admin',     desc: 'Full system access',          selected: _selectedRole, onTap: (r) => setState(() { _selectedRole = r; _regCodeCtrl.clear(); })),
      ]),
      const SizedBox(height: 14),

      // Role code (non-member)
      if (_selectedRole != 'member') ...[
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: const Color(0xFFFFFBEB),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFFDE68A)),
          ),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Icon(Icons.lock_outline, size: 14, color: Color(0xFFB45309)),
            const SizedBox(width: 8),
            Expanded(child: Text(
              '${_selectedRole[0].toUpperCase()}${_selectedRole.substring(1)} access requires an authorization code.',
              style: const TextStyle(fontSize: 11, color: Color(0xFF92400E)),
            )),
          ]),
        ),
        _AuthField(
          label: '${_selectedRole[0].toUpperCase()}${_selectedRole.substring(1)} Access Code',
          ctrl: _regCodeCtrl,
          hint: 'Enter your access code',
          icon: Icons.vpn_key_outlined,
          error: _regTouched['roleCode'] == true ? _regErrors['roleCode'] : null,
          onChanged: (v) { if (_regTouched['roleCode'] == true) setState(() => _regErrors['roleCode'] = _validateRoleCode(v)); },
          onBlur: () => setState(() { _regTouched['roleCode'] = true; _regErrors['roleCode'] = _validateRoleCode(_regCodeCtrl.text); }),
        ),
      ],

      _SubmitButton(label: 'Create Account', loading: _loading, onTap: _handleRegister),
    ]);
  }

  // ── Forgot password form ───────────────────────────────────────────────────

  Widget _buildForgotForm() {
    return Column(key: const ValueKey('forgot'), crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Forgot Password', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Color(0xFF111827))),
      const SizedBox(height: 6),
      const Text(
        "Enter your registered email and we'll send you a reset code.",
        style: TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
      ),
      const SizedBox(height: 20),
      _AuthField(
        label: 'Email',
        ctrl: _forgotEmailCtrl,
        type: TextInputType.emailAddress,
        hint: 'you@example.com',
        icon: Icons.mail_outline,
        onSubmit: (_) => _handleForgotPassword(),
      ),
      const SizedBox(height: 8),
      _SubmitButton(label: 'Send Reset Code', loading: _loading, onTap: _handleForgotPassword),
      const SizedBox(height: 12),
      Center(child: GestureDetector(
        onTap: () => setState(() => _mode = 'login'),
        child: const Text('← Back to login', style: TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
      )),
    ]);
  }
}

// ── Tab widget ────────────────────────────────────────────────────────────────

class _Tab extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  final bool isFirst;
  const _Tab(this.label, this.active, this.onTap, {required this.isFirst});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: active ? Colors.white : const Color(0xFFF9FAFB),
            border: Border(
              bottom: BorderSide(color: active ? const Color(0xFF2563EB) : Colors.transparent, width: 2),
            ),
            borderRadius: BorderRadius.only(
              topLeft:  isFirst ? const Radius.circular(20) : Radius.zero,
              topRight: isFirst ? Radius.zero : const Radius.circular(20),
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: active ? const Color(0xFF2563EB) : const Color(0xFF9CA3AF),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Role card ─────────────────────────────────────────────────────────────────

class _RoleCard extends StatelessWidget {
  final String role, label, desc, selected;
  final ValueChanged<String> onTap;
  const _RoleCard({required this.role, required this.label, required this.desc, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final active = selected == role;
    return Expanded(
      child: GestureDetector(
        onTap: () => onTap(role),
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: active ? const Color(0xFFEFF6FF) : Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: active ? const Color(0xFF2563EB) : const Color(0xFFE5E7EB),
              width: active ? 1.5 : 1,
            ),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: active ? const Color(0xFF1D4ED8) : const Color(0xFF374151))),
            const SizedBox(height: 2),
            Text(desc, style: const TextStyle(fontSize: 9, color: Color(0xFF9CA3AF), height: 1.3)),
          ]),
        ),
      ),
    );
  }
}

// ── Shared field widgets ──────────────────────────────────────────────────────

class _FieldLabel extends StatelessWidget {
  final String label;
  const _FieldLabel(this.label);
  @override
  Widget build(BuildContext context) => Text(
    label,
    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF374151)),
  );
}

class _AuthField extends StatelessWidget {
  final String label, hint;
  final TextEditingController ctrl;
  final TextInputType type;
  final IconData icon;
  final bool? obscure;
  final VoidCallback? onToggleObscure;
  final String? error;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onBlur;
  final ValueChanged<String>? onSubmit;

  const _AuthField({
    required this.label, required this.ctrl, required this.hint, required this.icon,
    this.type = TextInputType.text, this.obscure, this.onToggleObscure,
    this.error, this.onChanged, this.onBlur, this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    final hasError = error != null && error!.isNotEmpty;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _FieldLabel(label),
      const SizedBox(height: 6),
      Focus(
        onFocusChange: (hasFocus) { if (!hasFocus) onBlur?.call(); },
        child: TextField(
          controller: ctrl,
          keyboardType: type,
          obscureText: obscure ?? false,
          onChanged: onChanged,
          onSubmitted: onSubmit,
          style: const TextStyle(fontSize: 14),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(fontSize: 13, color: Color(0xFFD1D5DB)),
            prefixIcon: Icon(icon, size: 17, color: const Color(0xFF9CA3AF)),
            suffixIcon: obscure != null
              ? GestureDetector(
                  onTap: onToggleObscure,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text(obscure! ? 'SHOW' : 'HIDE',
                        style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF), fontWeight: FontWeight.w600)),
                  ),
                )
              : null,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: hasError ? const Color(0xFFF87171) : const Color(0xFFE5E7EB))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: hasError ? const Color(0xFFF87171) : const Color(0xFFE5E7EB))),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: hasError ? const Color(0xFFF87171) : const Color(0xFF2563EB), width: 1.5)),
            filled: true,
            fillColor: const Color(0xFFFAFAFA),
          ),
        ),
      ),
      if (hasError) ...[
        const SizedBox(height: 4),
        Text(error!, style: const TextStyle(fontSize: 11, color: Color(0xFFEF4444))),
      ],
      const SizedBox(height: 14),
    ]);
  }
}

class _SubmitButton extends StatelessWidget {
  final String label;
  final bool loading;
  final VoidCallback onTap;
  const _SubmitButton({required this.label, required this.loading, required this.onTap});

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
            : Text(label, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
          ),
        ),
      ),
    );
  }
}