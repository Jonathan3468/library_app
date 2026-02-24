// lib/widgets/layout.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../utils/auth.dart';
import 'sidebar.dart';

class Layout extends StatefulWidget {
  final Widget child;
  const Layout({super.key, required this.child});

  @override
  State<Layout> createState() => _LayoutState();
}

class _LayoutState extends State<Layout> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  bool get _isDesktop => MediaQuery.of(context).size.width >= 1024;

  @override
  Widget build(BuildContext context) {
    final user = AuthService.getCurrentUser();

    if (_isDesktop) {
      return Scaffold(
        body: Row(
          children: [
            const Sidebar(),
            Expanded(
              child: Column(
                children: [
                  _TopBar(user: user, isDesktop: true, onMenuTap: null),
                  Expanded(child: widget.child),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        key: _scaffoldKey,
        backgroundColor: const Color(0xFFF9FAFB),
        drawer: const Drawer(width: 240, child: Sidebar()),
        body: SafeArea(
          child: Column(
            children: [
              _TopBar(
                user: user,
                isDesktop: false,
                onMenuTap: () => _scaffoldKey.currentState?.openDrawer(),
              ),
              Expanded(child: widget.child),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Top bar ────────────────────────────────────────────────────────────────

class _TopBar extends StatelessWidget {
  final Map<String, dynamic>? user;
  final bool isDesktop;
  final VoidCallback? onMenuTap;

  const _TopBar({
    required this.user,
    required this.isDesktop,
    required this.onMenuTap,
  });

  Color _roleColor(String? role) {
    switch (role) {
      case 'admin':
        return const Color(0xFFEF4444);
      case 'librarian':
        return const Color(0xFF2563EB);
      default:
        return const Color(0xFF22C55E);
    }
  }

  @override
  Widget build(BuildContext context) {
    final role = user?['role'] as String?;
    final roleColor = _roleColor(role);
    final name = (user?['name'] as String?) ?? '';
    final initials = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Color(0xFFE5E7EB))),
      ),
      child: Row(
        children: [
          // Hamburger — mobile only
          if (!isDesktop) ...[
            GestureDetector(
              onTap: onMenuTap,
              behavior: HitTestBehavior.opaque,
              child: Padding(
                padding: const EdgeInsets.only(right: 12),
                child: const Icon(Icons.menu_rounded, color: Color(0xFF374151), size: 24),
              ),
            ),
          ],

          // App name
          const Text(
            'SmartLib',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: Color(0xFF111827),
              letterSpacing: -0.3,
            ),
          ),

          const Spacer(),

          // Avatar with role dot
          GestureDetector(
            onTap: () => _showUserMenu(context, role, roleColor),
            behavior: HitTestBehavior.opaque,
            child: Stack(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: roleColor.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      initials,
                      style: TextStyle(
                        color: roleColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: roleColor,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 1.5),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showUserMenu(BuildContext context, String? role, Color roleColor) {
    final name = (user?['name'] as String?) ?? '';
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _UserSheet(
        name: name,
        role: role,
        roleColor: roleColor,
      ),
    );
  }
}

// ── User bottom sheet ──────────────────────────────────────────────────────

class _UserSheet extends StatelessWidget {
  final String name;
  final String? role;
  final Color roleColor;

  const _UserSheet({required this.name, required this.role, required this.roleColor});

  @override
  Widget build(BuildContext context) {
    final initials = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            margin: const EdgeInsets.only(top: 10, bottom: 16),
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFD1D5DB),
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // User info
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: roleColor.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      initials,
                      style: TextStyle(
                        color: roleColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 18,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF111827),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: roleColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        (role ?? 'user').toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: roleColor,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),
          const Divider(height: 1, color: Color(0xFFF3F4F6)),
          const SizedBox(height: 8),

          // Sign out
          ListTile(
            onTap: () async {
              Navigator.pop(context);
              await AuthService.logout();
              if (context.mounted) context.go('/login');
            },
            leading: const Icon(Icons.logout_rounded, color: Color(0xFFEF4444), size: 20),
            title: const Text(
              'Sign Out',
              style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w500, fontSize: 14),
            ),
          ),

          const SizedBox(height: 8),
        ],
      ),
    );
  }
}