// lib/pages/notifications_page.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  bool _loading = false;
  Map<String, dynamic>? _result;
  String? _error;

  Future<void> _sendOverdue() async {
    if (!mounted) return;
    setState(() { _loading = true; _error = null; _result = null; });
    try {
      final res = await ApiService.post('/notifications/send-overdue');
      if (!mounted) return;
      setState(() => _result = res.data['results'] as Map<String, dynamic>?);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Failed to send notifications. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendReminders() async {
    if (!mounted) return;
    setState(() { _loading = true; _error = null; _result = null; });
    try {
      final res = await ApiService.post('/notifications/send-reminders', data: {'daysBeforeDue': 2});
      if (!mounted) return;
      setState(() => _result = res.data['results'] as Map<String, dynamic>?);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Failed to send reminders. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _confirm({
    required String title,
    required String description,
    required String confirmLabel,
    required Color confirmColor,
    required IconData icon,
    required Future<void> Function() onConfirm,
  }) async {
    // FIX: mounted check before using context across async gap
    if (!mounted) return;
    final ok = await showDialog<bool>(
      context: context,
      // FIX: use dialogContext for Navigator.pop, not the outer page context.
      // Using the outer context caused go_router to pop the page itself
      // instead of just the dialog, producing a black screen.
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding: const EdgeInsets.all(24),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 48, height: 48,
            decoration: BoxDecoration(
              color: const Color(0xFFF9FAFB),
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFFF3F4F6)),
            ),
            child: Icon(icon, color: confirmColor, size: 22),
          ),
          const SizedBox(height: 16),
          Text(title,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)),
              textAlign: TextAlign.center),
          const SizedBox(height: 6),
          Text(description,
              style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
              textAlign: TextAlign.center),
          const SizedBox(height: 20),
          Row(children: [
            Expanded(child: OutlinedButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFFE5E7EB)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF6B7280))),
            )),
            const SizedBox(width: 8),
            Expanded(child: ElevatedButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: confirmColor,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: Text(confirmLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
            )),
          ]),
        ]),
      ),
    );
    // FIX: mounted check after await before calling onConfirm which will setState
    if (!mounted || ok != true) return;
    await onConfirm();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      // FIX: SafeArea ensures content is not rendered under the status bar /
      // notch, which can produce a black strip at the top on some devices.
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

            // ── Header ──
            Row(children: [
              GestureDetector(
                onTap: () => context.go('/reports'),
                child: const Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.arrow_back, size: 18, color: Color(0xFF6B7280)),
                  SizedBox(width: 4),
                  Text('Back', style: TextStyle(fontSize: 14, color: Color(0xFF6B7280))),
                ]),
              ),
              const SizedBox(width: 12),
              const Text('/', style: TextStyle(color: Color(0xFFD1D5DB))),
              const SizedBox(width: 12),
              const Expanded(
                child: Text('Notification Management',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)),
                    overflow: TextOverflow.ellipsis),
              ),
            ]),
            const SizedBox(height: 4),
            const Padding(
              padding: EdgeInsets.only(left: 60),
              child: Text('Send email alerts to borrowers',
                  style: TextStyle(fontSize: 12, color: Color(0xFF9CA3AF))),
            ),
            const SizedBox(height: 20),

            // ── Info box ──
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                  width: 32, height: 32,
                  decoration: BoxDecoration(color: const Color(0xFFDBEAFE), borderRadius: BorderRadius.circular(8)),
                  child: const Icon(Icons.info_outline, size: 16, color: Color(0xFF2563EB)),
                ),
                const SizedBox(width: 12),
                const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Automated Notifications',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF1E3A8A))),
                  SizedBox(height: 4),
                  Text('The system automatically sends notifications daily:',
                      style: TextStyle(fontSize: 12, color: Color(0xFF1D4ED8))),
                  SizedBox(height: 6),
                  _ScheduleRow(time: '8:00 AM', desc: 'Reminder emails for books due in 2 days'),
                  SizedBox(height: 3),
                  _ScheduleRow(time: '9:00 AM', desc: 'Overdue notifications for all overdue books'),
                  SizedBox(height: 6),
                  Text('You can also trigger them manually below.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF1D4ED8))),
                ])),
              ]),
            ),
            const SizedBox(height: 16),

            // ── Error ──
            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Row(children: [
                  Expanded(child: Text(_error!, style: const TextStyle(fontSize: 13, color: Color(0xFFDC2626)))),
                  GestureDetector(
                    onTap: () => setState(() => _error = null),
                    child: const Text('Dismiss', style: TextStyle(fontSize: 11, color: Color(0xFFDC2626), decoration: TextDecoration.underline)),
                  ),
                ]),
              ),
              const SizedBox(height: 12),
            ],

            // ── Success result ──
            if (_result != null) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: Row(children: [
                  Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(color: const Color(0xFFD1FAE5), borderRadius: BorderRadius.circular(10)),
                    child: const Icon(Icons.check, size: 18, color: Color(0xFF059669)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Notifications sent successfully',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF065F46))),
                    const SizedBox(height: 2),
                    Text(
                      '${_result!['emailsSent'] ?? _result!['sent'] ?? 0} email(s) sent'
                      '${_result!['total'] != null ? ' out of ${_result!['total']} issues' : ''}'
                      '${(_result!['failed'] ?? 0) > 0 ? ' · ${_result!['failed']} failed' : ''}',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF059669)),
                    ),
                  ])),
                ]),
              ),
              const SizedBox(height: 16),
            ],

            // ── Action Cards ──
            LayoutBuilder(builder: (_, constraints) {
              final wide = constraints.maxWidth > 600;
              final cards = [
                _ActionCard(
                  icon: Icons.error_outline,
                  iconBg: const Color(0xFFFEF2F2),
                  iconColor: const Color(0xFFDC2626),
                  title: 'Overdue Notifications',
                  subtitle: 'For all overdue books',
                  description: 'Sends an email to every borrower who has books past their due date, reminding them to return or renew.',
                  buttonLabel: 'Send Overdue Notifications',
                  buttonColor: const Color(0xFFDC2626),
                  loading: _loading,
                  onTap: () => _confirm(
                    title: 'Send Overdue Notifications?',
                    description: 'An email will be sent to every borrower with books past their due date. This cannot be undone.',
                    confirmLabel: 'Send Now',
                    confirmColor: const Color(0xFFDC2626),
                    icon: Icons.error_outline,
                    onConfirm: _sendOverdue,
                  ),
                ),
                _ActionCard(
                  icon: Icons.notifications_outlined,
                  iconBg: const Color(0xFFEFF6FF),
                  iconColor: const Color(0xFF2563EB),
                  title: 'Due Soon Reminders',
                  subtitle: 'Books due in 2 days',
                  description: 'Sends a friendly reminder to borrowers whose books are due within the next 2 days so they can plan ahead.',
                  buttonLabel: 'Send Reminder Notifications',
                  buttonColor: const Color(0xFF2563EB),
                  loading: _loading,
                  onTap: () => _confirm(
                    title: 'Send Due Soon Reminders?',
                    description: 'A reminder email will be sent to all borrowers with books due within 2 days.',
                    confirmLabel: 'Send Now',
                    confirmColor: const Color(0xFF2563EB),
                    icon: Icons.notifications_outlined,
                    onConfirm: _sendReminders,
                  ),
                ),
              ];

              if (wide) {
                return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(child: cards[0]),
                  const SizedBox(width: 12),
                  Expanded(child: cards[1]),
                ]);
              }
              return Column(children: [cards[0], const SizedBox(height: 12), cards[1]]);
            }),
            const SizedBox(height: 16),

            // ── Note ──
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Icon(Icons.edit_outlined, size: 14, color: Color(0xFF9CA3AF)),
                SizedBox(width: 10),
                Expanded(child: Text(
                  'Notifications are only sent to borrowers with valid email addresses. Make sure contact information is up to date for effective delivery.',
                  style: TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                )),
              ]),
            ),

          ]),
        ),
      ),
    );
  }
}

// ── Schedule row inside info box ──────────────────────────────────────────────

class _ScheduleRow extends StatelessWidget {
  final String time, desc;
  const _ScheduleRow({required this.time, required this.desc});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: const Color(0xFFDBEAFE),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(time, style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Color(0xFF1E40AF), fontWeight: FontWeight.w600)),
      ),
      const SizedBox(width: 6),
      Expanded(child: Text(desc, style: const TextStyle(fontSize: 11, color: Color(0xFF1D4ED8)))),
    ]);
  }
}

// ── Action card ───────────────────────────────────────────────────────────────

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final Color iconBg, iconColor;
  final String title, subtitle, description, buttonLabel;
  final Color buttonColor;
  final bool loading;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon, required this.iconBg, required this.iconColor,
    required this.title, required this.subtitle, required this.description,
    required this.buttonLabel, required this.buttonColor,
    required this.loading, required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)),
                overflow: TextOverflow.ellipsis),
            Text(subtitle, style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
          ])),
        ]),
        const SizedBox(height: 12),
        Text(description, style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280), height: 1.5)),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: loading ? null : onTap,
            style: ElevatedButton.styleFrom(
              backgroundColor: buttonColor,
              foregroundColor: Colors.white,
              elevation: 0,
              disabledBackgroundColor: buttonColor.withOpacity(0.5),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(vertical: 13),
            ),
            child: loading
                ? const SizedBox(width: 16, height: 16,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : Text(buttonLabel, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          ),
        ),
      ]),
    );
  }
}