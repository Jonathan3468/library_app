// lib/main.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'utils/auth.dart';
import 'services/api.dart';
import 'widgets/layout.dart';
import 'pages/auth_pages.dart';
import 'pages/reset_password_page.dart';
import 'pages/dashboard_page.dart';
import 'pages/books_page.dart';
import 'pages/book_view_page.dart';
import 'pages/add_book_page.dart';
import 'pages/edit_book_page.dart';
import 'pages/add_author_page.dart';
import 'pages/add_publication_page.dart';
import 'pages/add_borrower_page.dart';
import 'pages/popular_books_page.dart';
import 'pages/search_page.dart';
import 'pages/borrowers_page.dart';
import 'pages/borrower_details_page.dart';
import 'pages/scan_page.dart';
import 'pages/authors_page.dart';
import 'pages/author_details_page.dart';
import 'pages/publications_page.dart';
import 'pages/publication_details_page.dart';
import 'pages/requests_page.dart';
import 'pages/reports_page.dart';
import 'pages/fines_page.dart';
import 'pages/fine_details_page.dart';
import 'pages/custom_fine_details_page.dart';
import 'pages/settings_page.dart';
import 'pages/user_management_page.dart';
import 'pages/notifications_page.dart';
import 'pages/audit_log_page.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AuthService.init();
  ApiService.initInterceptor();
  runApp(const SmartLibApp());
}

class SmartLibApp extends StatelessWidget {
  const SmartLibApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      title: 'SmartLib',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2563EB)),
        useMaterial3: true,
      ),
      routerConfig: _router,
    );
  }
}

String? _guardAuth(BuildContext context, GoRouterState state) {
  if (!AuthService.isAuthenticated()) return '/login';
  return null;
}

String? _guardRole(List<String> roles) {
  final user = AuthService.getCurrentUserSync();
  if (user == null) return '/login';
  if (!roles.contains(user['role'])) return '/dashboard';
  return null;
}

final GoRouter _router = GoRouter(
  initialLocation: '/login',
  routes: [

    // ── Public ──
    GoRoute(path: '/login',          builder: (c, s) => const AuthPage()),
    GoRoute(path: '/reset-password', builder: (c, s) => const ResetPasswordPage()),

    // ── Protected ──
    ShellRoute(
      redirect: (context, state) => _guardAuth(context, state),
      builder: (context, state, child) => Layout(child: child),
      routes: [

        // Overview
        GoRoute(path: '/dashboard', builder: (c, s) => const DashboardPage()),
        GoRoute(path: '/popular',   builder: (c, s) => const PopularBooksPage()),
        GoRoute(path: '/search',    builder: (c, s) => SearchPage(query: s.uri.queryParameters['q'])),

        // Books
        GoRoute(
          path: '/books',
          builder: (c, s) => const BooksPage(),
          routes: [
            GoRoute(
              path: 'new',
              redirect: (c, s) => _guardRole(['admin', 'librarian']),
              builder: (c, s) => const AddBookPage(),
            ),
            GoRoute(
              path: ':bookId',
              builder: (c, s) => BookViewPage(bookId: s.pathParameters['bookId']!),
              routes: [
                GoRoute(
                  path: 'edit',
                  redirect: (c, s) => _guardRole(['admin', 'librarian']),
                  builder: (c, s) => EditBookPage(bookId: s.pathParameters['bookId']!),
                ),
              ],
            ),
          ],
        ),

        // Profile (member)
        GoRoute(
          path: '/profile',
          builder: (c, s) => const BorrowerDetailsPage(),
        ),

        // Borrowers
        GoRoute(
          path: '/borrowers',
          redirect: (c, s) => _guardRole(['admin', 'librarian']),
          builder: (c, s) => const BorrowersPage(),
          routes: [
            GoRoute(path: 'new', builder: (c, s) => const AddBorrowerPage()),
            GoRoute(
              path: ':borrowerId',
              builder: (c, s) => BorrowerDetailsPage(borrowerId: s.pathParameters['borrowerId']),
            ),
          ],
        ),

        // Authors
        GoRoute(
          path: '/authors',
          redirect: (c, s) => _guardRole(['admin', 'librarian']),
          builder: (c, s) => const AuthorsPage(),
          routes: [
            GoRoute(path: 'new', builder: (c, s) => const AddAuthorPage()),
            GoRoute(
              path: ':authorId',
              builder: (c, s) => AuthorDetailsPage(authorId: s.pathParameters['authorId']!),
            ),
          ],
        ),

        // Publications
        GoRoute(
          path: '/publications',
          redirect: (c, s) => _guardRole(['admin', 'librarian']),
          builder: (c, s) => const PublicationsPage(),
          routes: [
            GoRoute(path: 'new', builder: (c, s) => const AddPublicationPage()),
            GoRoute(
              path: ':publicationId',
              builder: (c, s) => PublicationDetailsPage(publicationId: s.pathParameters['publicationId']!),
            ),
          ],
        ),

        // Operations
        GoRoute(
          path: '/scan',
          redirect: (c, s) => _guardRole(['admin', 'librarian']),
          builder: (c, s) => const ScanPage(),
        ),
        GoRoute(
          path: '/fines',
          redirect: (c, s) => _guardRole(['admin', 'librarian']),
          builder: (c, s) => const FinesPage(),
          routes: [
            GoRoute(
              path: 'custom/:fineId',
              builder: (c, s) => CustomFineDetailsPage(fineId: s.pathParameters['fineId']!),
            ),
            GoRoute(
              path: ':fineId',
              builder: (c, s) => FineDetailsPage(fineId: s.pathParameters['fineId']!),
            ),
          ],
        ),
        GoRoute(
          path: '/reports',
          redirect: (c, s) => _guardRole(['admin', 'librarian']),
          builder: (c, s) => const ReportsPage(),
          routes: [
            GoRoute(path: ':issueId', builder: (c, s) => const ReportsPage()),
          ],
        ),

        // Communication
        GoRoute(
          path: '/notifications',
          redirect: (c, s) => _guardRole(['admin', 'librarian']),
          builder: (c, s) => const NotificationsPage(),
        ),

        // Requests
        GoRoute(
          path: '/requests',
          builder: (c, s) => const RequestsPage(),
        ),

        // Settings
        GoRoute(
          path: '/settings',
          builder: (c, s) => const SettingsPage(),
        ),

        // Administration
        GoRoute(
          path: '/users',
          redirect: (c, s) => _guardRole(['admin', 'librarian']),
          builder: (c, s) => const UserManagementPage(),
        ),
        GoRoute(
          path: '/audits',
          redirect: (c, s) => _guardRole(['admin']),
          builder: (c, s) => const AuditLogPage(),
        ),
      ],
    ),
  ],
);