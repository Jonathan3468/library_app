// lib/widgets/sidebar.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../utils/auth.dart';

class Sidebar extends StatelessWidget {
  final VoidCallback? onClose;

  const Sidebar({super.key, this.onClose});

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    final user = AuthService.getCurrentUser();
    final role = user?['role'] ?? '';

    return Container(
      width: 240,
      color: const Color(0xFF1E293B),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Brand + optional close button
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 12, 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'SMARTLIB',
                    style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1),
                  ),
                  if (onClose != null)
                    GestureDetector(
                      onTap: onClose,
                      child: const Icon(Icons.close, color: Colors.white54, size: 20),
                    ),
                ],
              ),
            ),

            // User card
            Container(
              margin: const EdgeInsets.fromLTRB(12, 0, 12, 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.07),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  Container(
                    width: 34, height: 34,
                    decoration: const BoxDecoration(color: Color(0xFF2563EB), shape: BoxShape.circle),
                    child: Center(
                      child: Text(
                        (user?['name'] ?? '?')[0].toUpperCase(),
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?['name'] ?? '',
                          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          role.toUpperCase(),
                          style: const TextStyle(color: Colors.white54, fontSize: 10, letterSpacing: 0.5),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Nav items
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _sectionLabel('Overview'),
                    _navItem(context, 'Dashboard', Icons.dashboard,            '/dashboard', location, onClose),
                    _navItem(context, 'Books',     Icons.menu_book,            '/books',     location, onClose),
                    _navItem(context, 'Popular',   Icons.local_fire_department,'/popular',   location, onClose),
                    _navItem(context, 'Search',    Icons.search,               '/search',    location, onClose),

                    if (role == 'member') ...[
                      _sectionLabel('My Account'),
                      // ✅ FIXED: use /profile instead of /borrowers/${getBorrowerId()}
                      // getBorrowerId() can be null on first login before /borrowers/me is called,
                      // which produced the route /borrowers/null and silently broke navigation.
                      _navItem(context, 'My Profile',  Icons.person, '/profile',   location, onClose),
                      _navItem(context, 'My Requests', Icons.inbox,  '/requests',  location, onClose),
                    ],

                    if (role == 'admin' || role == 'librarian') ...[
                      _sectionLabel('Catalog'),
                      _navItem(context, 'Authors',      Icons.edit,            '/authors',      location, onClose),
                      _navItem(context, 'Publications', Icons.business,        '/publications', location, onClose),

                      _sectionLabel('Operations'),
                      _navItem(context, 'Scan',      Icons.qr_code_scanner, '/scan',      location, onClose, highlight: true),
                      _navItem(context, 'Borrowers', Icons.group,           '/borrowers', location, onClose),
                      _navItem(context, 'Reports',   Icons.bar_chart,       '/reports',   location, onClose),
                      _navItem(context, 'Fines',     Icons.attach_money,    '/fines',     location, onClose),

                      _sectionLabel('Communication'),
                      _navItem(context, 'Notifications', Icons.notifications, '/notifications', location, onClose),
                      _navItem(context, 'Requests',      Icons.inbox,         '/requests',      location, onClose),
                    ],

                    if (role == 'admin') ...[
                      _sectionLabel('Administration'),
                      _navItem(context, 'User Management', Icons.admin_panel_settings, '/users',  location, onClose),
                      _navItem(context, 'Audit Log',       Icons.history,             '/audits', location, onClose),
                    ],

                    const SizedBox(height: 8),
                    _sectionLabel('Account'),
                    _navItem(context, 'Settings', Icons.settings, '/settings', location, onClose),
                  ],
                ),
              ),
            ),

            // Logout
            InkWell(
              onTap: () async {
                await AuthService.logout();
                if (context.mounted) context.go('/login');
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                child: const Row(
                  children: [
                    Icon(Icons.logout, color: Colors.white54, size: 18),
                    SizedBox(width: 12),
                    Text('Sign Out', style: TextStyle(color: Colors.white54, fontSize: 13)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(String label) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
      child: Text(
        label.toUpperCase(),
        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white38, letterSpacing: 1.2),
      ),
    );
  }

  Widget _navItem(
    BuildContext context,
    String title,
    IconData icon,
    String route,
    String currentLocation,
    VoidCallback? onClose, {
    bool highlight = false,
  }) {
    final isActive = currentLocation == route ||
        (route.length > 1 && currentLocation.startsWith(route));

    return InkWell(
      onTap: () {
        context.go(route);
        onClose?.call();
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isActive
              ? const Color(0xFF2563EB)
              : highlight
                  ? Colors.white.withOpacity(0.06)
                  : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: highlight && !isActive
              ? Border.all(color: Colors.white.withOpacity(0.15))
              : null,
        ),
        child: Row(
          children: [
            Icon(icon, color: isActive ? Colors.white : Colors.white60, size: 18),
            const SizedBox(width: 12),
            Text(
              title,
              style: TextStyle(
                color: isActive ? Colors.white : Colors.white70,
                fontSize: 13,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}