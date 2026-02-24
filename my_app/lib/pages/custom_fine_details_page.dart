// lib/pages/custom_fine_details_page.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/api.dart';

class CustomFineDetailsPage extends StatefulWidget {
  final String fineId;
  const CustomFineDetailsPage({super.key, required this.fineId});

  @override
  State<CustomFineDetailsPage> createState() => _CustomFineDetailsPageState();
}

class _CustomFineDetailsPageState extends State<CustomFineDetailsPage> {
  Map<String, dynamic>? fine;
  bool loading = true;
  String? error;

  bool isEditingReason = false;
  bool isEditingPayment = false;
  String editedReason = '';
  String editedPaymentMethod = 'cash';

  @override
  void initState() {
    super.initState();
    _fetchFineDetails();
  }

  Future<void> _fetchFineDetails() async {
    setState(() { loading = true; error = null; });
    try {
      final res = await ApiService.get('/fines/custom/${widget.fineId}');
      final f = res.data['fine'] as Map<String, dynamic>;
      setState(() {
        fine = f;
        editedReason = f['reason'] ?? '';
        editedPaymentMethod = f['payment_method'] ?? 'cash';
        loading = false;
      });
    } catch (e) {
      setState(() { error = 'Failed to load fine details'; loading = false; });
    }
  }

  Future<void> _handleSaveReason() async {
    try {
      await ApiService.put('/fines/custom/${widget.fineId}/reason', data: {'reason': editedReason});
      setState(() => isEditingReason = false);
      _fetchFineDetails();
      _showSnack('Reason updated successfully!', success: true);
    } catch (e) {
      _showSnack('Failed to update reason');
    }
  }

  Future<void> _handleSavePaymentMethod() async {
    try {
      await ApiService.put('/fines/custom/${widget.fineId}/payment-method', data: {'payment_method': editedPaymentMethod});
      setState(() => isEditingPayment = false);
      _fetchFineDetails();
      _showSnack('Payment method updated!', success: true);
    } catch (e) {
      _showSnack('Failed to update payment method');
    }
  }

  Future<void> _handleMarkAsPaid() async {
    final confirmed = await _showConfirmDialog('Mark this fine as paid?', '');
    if (!confirmed) return;
    try {
      await ApiService.post('/fines/custom/${widget.fineId}/mark-paid');
      _fetchFineDetails();
      _showSnack('Fine marked as paid!', success: true);
    } catch (e) {
      _showSnack('Failed to mark as paid');
    }
  }

  Future<void> _handleWaive() async {
    final reason = await _showTextInputDialog('Waive Fine', 'Enter reason for waiving this fine:');
    if (reason == null || reason.isEmpty) return;
    try {
      await ApiService.post('/fines/custom/${widget.fineId}/waive', data: {'reason': reason});
      _fetchFineDetails();
      _showSnack('Fine waived successfully!', success: true);
    } catch (e) {
      _showSnack('Failed to waive fine');
    }
  }

  void _showSnack(String msg, {bool success = false}) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: success ? Colors.green : Colors.red),
    );
  }

  Future<bool> _showConfirmDialog(String title, String content) async {
    return await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: content.isNotEmpty ? Text(content) : null,
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Confirm')),
        ],
      ),
    ) ?? false;
  }

  Future<String?> _showTextInputDialog(String title, String hint) async {
    String value = '';
    return await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: TextField(
          onChanged: (v) => value = v,
          decoration: InputDecoration(hintText: hint),
          maxLines: 3,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, null), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, value), child: const Text('Submit')),
        ],
      ),
    );
  }

  String _formatDate(dynamic val) {
    if (val == null) return '';
    final dt = DateTime.tryParse(val.toString());
    if (dt == null) return '';
    return '${dt.month}/${dt.day}/${dt.year}';
  }

  String _paymentIcon(String? method) {
    switch (method) {
      case 'card': return '💳';
      case 'upi': return '📱';
      case 'online': return '🌐';
      default: return '💵';
    }
  }

  Widget _buildCard(Widget child) => Container(
    width: double.infinity,
    margin: const EdgeInsets.only(bottom: 24),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 10, offset: const Offset(0, 2))],
    ),
    padding: const EdgeInsets.all(24),
    child: child,
  );

  Widget _buildStatusBadge() {
    final status = fine!['status'] ?? 'pending';
    Color bg, fg;
    String label;
    if (status == 'paid')        { bg = const Color(0xFFDCFCE7); fg = const Color(0xFF166534); label = '✓ Paid'; }
    else if (status == 'waived') { bg = const Color(0xFFFEF9C3); fg = const Color(0xFF854D0E); label = 'Waived'; }
    else                         { bg = const Color(0xFFFEE2E2); fg = const Color(0xFF991B1B); label = '⏳ Pending'; }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(50)),
      child: Text(label, style: TextStyle(color: fg, fontWeight: FontWeight.w600, fontSize: 13)),
    );
  }

  Widget _buildInfoRow(String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
      const SizedBox(height: 4),
      Text(value, style: const TextStyle(fontSize: 16)),
    ]),
  );

  Widget _buildEditButton(VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: const Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.edit_outlined, size: 16, color: Color(0xFF2563EB)),
      SizedBox(width: 4),
      Text('Edit', style: TextStyle(color: Color(0xFF2563EB), fontSize: 13)),
    ]),
  );

  @override
  Widget build(BuildContext context) {
    if (loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (error != null || fine == null) {
      return Scaffold(
        body: Padding(padding: const EdgeInsets.all(24), child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            GestureDetector(onTap: () => context.go('/fines'), child: const Text('← Back to Fines', style: TextStyle(color: Color(0xFF6B7280)))),
            const SizedBox(height: 16),
            Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(8)), child: Text(error ?? 'Fine not found', style: const TextStyle(color: Color(0xFFB91C1C)))),
          ],
        )),
      );
    }

    final status = fine!['status'] ?? 'pending';

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(children: [
                GestureDetector(onTap: () => context.go('/fines'), child: const Text('← Back', style: TextStyle(color: Color(0xFF6B7280)))),
                const SizedBox(width: 16),
                const Text('Custom Fine Details', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              ]),
              const SizedBox(height: 24),

              _buildCard(Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status
                  _buildStatusBadge(),
                  const SizedBox(height: 24),

                  // Info grid
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    // Left column
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      // Fine ID with Custom badge
                      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const Text('Fine ID', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
                        const SizedBox(height: 4),
                        Text('CF-${fine!['payment_id'] ?? ''}', style: const TextStyle(fontSize: 16)),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: const Color(0xFFF5F3FF), borderRadius: BorderRadius.circular(50)),
                          child: const Text('Custom Fine', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF7C3AED))),
                        ),
                      ]),
                      const SizedBox(height: 16),

                      // Borrower
                      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const Text('Borrower', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
                        const SizedBox(height: 4),
                        Text('${fine!['borrower_name'] ?? ''}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                        Text('ID: ${fine!['borrower_id'] ?? ''}', style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
                        if (fine!['rf_id'] != null)
                          Text('RF ID: ${fine!['rf_id']}', style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280))),
                      ]),
                      const SizedBox(height: 16),

                      // Book copy (if linked)
                      if (fine!['copy_code'] != null) ...[
                        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Text('Book Copy', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
                          const SizedBox(height: 4),
                          Text(fine!['book_title'] ?? 'Unknown Book', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(6)),
                            child: Text('${fine!['copy_code']}', style: const TextStyle(fontSize: 12, fontFamily: 'monospace', color: Color(0xFF374151))),
                          ),
                        ]),
                        const SizedBox(height: 16),
                      ],

                      // Amount
                      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const Text('Amount', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
                        const SizedBox(height: 4),
                        Text('₹${fine!['amount'] ?? 0}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFFDC2626))),
                      ]),
                    ])),

                    const SizedBox(width: 24),

                    // Right column
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      if (fine!['payment_date'] != null)
                        _buildInfoRow(status == 'waived' ? 'Waived On' : 'Paid On', _formatDate(fine!['payment_date'])),
                    ])),
                  ]),

                  // Reason section
                  const Divider(height: 32),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text('Reason', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
                    if (!isEditingReason) _buildEditButton(() => setState(() => isEditingReason = true)),
                  ]),
                  const SizedBox(height: 8),
                  if (isEditingReason) ...[
                    TextFormField(
                      initialValue: editedReason,
                      onChanged: (v) => editedReason = v,
                      maxLines: 3,
                      decoration: InputDecoration(
                        hintText: 'Enter reason...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                        contentPadding: const EdgeInsets.all(12),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(children: [
                      ElevatedButton(
                        onPressed: _handleSaveReason,
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF16A34A)),
                        child: const Text('Save', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: () { setState(() { isEditingReason = false; editedReason = fine!['reason'] ?? ''; }); },
                        child: const Text('Cancel'),
                      ),
                    ]),
                  ] else
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: const Color(0xFFF9FAFB), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFE5E7EB))),
                      child: Text(fine!['reason'] ?? '', style: const TextStyle(fontSize: 16)),
                    ),

                  // Payment method section
                  if (fine!['payment_method'] != null || status == 'paid') ...[
                    const Divider(height: 32),
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      const Text('Payment Method', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
                      if (!isEditingPayment && status != 'waived') _buildEditButton(() => setState(() => isEditingPayment = true)),
                    ]),
                    const SizedBox(height: 8),
                    if (isEditingPayment) ...[
                      DropdownButtonFormField<String>(
                        value: editedPaymentMethod,
                        decoration: InputDecoration(border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)), contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
                        items: const [
                          DropdownMenuItem(value: 'cash',   child: Text('💵 Cash')),
                          DropdownMenuItem(value: 'card',   child: Text('💳 Card')),
                          DropdownMenuItem(value: 'upi',    child: Text('📱 UPI')),
                          DropdownMenuItem(value: 'online', child: Text('🌐 Online Transfer')),
                        ],
                        onChanged: (v) => setState(() => editedPaymentMethod = v ?? 'cash'),
                      ),
                      const SizedBox(height: 8),
                      Row(children: [
                        ElevatedButton(
                          onPressed: _handleSavePaymentMethod,
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF16A34A)),
                          child: const Text('Save', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton(
                          onPressed: () { setState(() { isEditingPayment = false; editedPaymentMethod = fine!['payment_method'] ?? 'cash'; }); },
                          child: const Text('Cancel'),
                        ),
                      ]),
                    ] else
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: const Color(0xFFF9FAFB), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFE5E7EB))),
                        child: Text('${_paymentIcon(fine!['payment_method'])} ${fine!['payment_method'] ?? 'Not specified'}', style: const TextStyle(fontSize: 16)),
                      ),
                  ],

                  // Action buttons
                  if (status == 'pending') ...[
                    const Divider(height: 32),
                    Row(children: [
                      Expanded(child: ElevatedButton.icon(
                        onPressed: _handleMarkAsPaid,
                        icon: const Icon(Icons.check_circle_outline),
                        label: const Text('Mark as Paid', style: TextStyle(fontWeight: FontWeight.w600)),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF16A34A), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14)),
                      )),
                      const SizedBox(width: 16),
                      Expanded(child: ElevatedButton.icon(
                        onPressed: _handleWaive,
                        icon: const Icon(Icons.close),
                        label: const Text('Waive Fine', style: TextStyle(fontWeight: FontWeight.w600)),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD97706), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14)),
                      )),
                    ]),
                  ],

                  // Paid/Waived info banner
                  if (status != 'pending') ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: status == 'paid' ? const Color(0xFFF0FDF4) : const Color(0xFFFEFCE8),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: status == 'paid' ? const Color(0xFFBBF7D0) : const Color(0xFFFDE68A)),
                      ),
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Icon(Icons.info_outline, color: status == 'paid' ? const Color(0xFF16A34A) : const Color(0xFFD97706), size: 20),
                        const SizedBox(width: 12),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(status == 'paid' ? 'Fine Paid' : 'Fine Waived',
                              style: TextStyle(fontWeight: FontWeight.w600, color: status == 'paid' ? const Color(0xFF166534) : const Color(0xFF854D0E))),
                          Text('You can still edit the reason and payment method if needed.',
                              style: TextStyle(fontSize: 13, color: status == 'paid' ? const Color(0xFF16A34A) : const Color(0xFFD97706))),
                        ])),
                      ]),
                    ),
                  ],
                ],
              )),
            ],
          ),
        ),
      ),
    );
  }
}