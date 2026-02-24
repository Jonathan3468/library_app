// lib/widgets/borrower_import_modal.dart
//
// CSV import modal for borrowers.
//
// Expected CSV format (first row = header, ignored):
//   borrower_name,email,phone,address,rf_id,membership_expiry
//
// - membership_expiry : ISO date e.g. 2025-12-31 (optional)
// - rf_id             : optional
// - All fields except borrower_name are optional
//
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../services/api.dart';

class BorrowerImportModal extends StatefulWidget {
  final VoidCallback onDone;
  final VoidCallback onClose;

  const BorrowerImportModal({super.key, required this.onDone, required this.onClose});

  @override
  State<BorrowerImportModal> createState() => _BorrowerImportModalState();
}

class _BorrowerImportModalState extends State<BorrowerImportModal> {
  List<_CsvRow> _rows   = [];
  bool   _importing     = false;
  int    _processed     = 0;
  int    _succeeded     = 0;
  int    _failed        = 0;
  bool   _done          = false;
  String _currentAction = '';
  final List<String> _log = [];

  // ── Pick & parse ──────────────────────────────────────────────────────

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['csv'],
      withData: true,
    );
    if (result == null || result.files.isEmpty) return;

    final bytes = result.files.first.bytes;
    if (bytes == null) return;

    final content = utf8.decode(bytes);
    final parsed  = _parseCsv(content);

    setState(() {
      _rows      = parsed;
      _processed = 0;
      _succeeded = 0;
      _failed    = 0;
      _done      = false;
      _log.clear();
    });
  }

  List<_CsvRow> _parseCsv(String content) {
    final lines = content
        .split('\n')
        .map((l) => l.trim())
        .where((l) => l.isNotEmpty)
        .toList();

    if (lines.length < 2) return [];

    final rows = <_CsvRow>[];
    for (int i = 1; i < lines.length; i++) {
      final cols = _splitCsvLine(lines[i]);
      if (cols.isEmpty) continue;
      rows.add(_CsvRow(
        borrowerName:      _col(cols, 0),
        email:             _col(cols, 1),
        phone:             _col(cols, 2),
        address:           _col(cols, 3),
        rfId:              _col(cols, 4),
        membershipExpiry:  _col(cols, 5),
        lineNumber: i + 1,
      ));
    }
    return rows.where((r) => r.borrowerName.isNotEmpty).toList();
  }

  List<String> _splitCsvLine(String line) {
    final result = <String>[];
    final buffer = StringBuffer();
    bool inQuotes = false;

    for (int i = 0; i < line.length; i++) {
      final c = line[i];
      if (c == '"') {
        inQuotes = !inQuotes;
      } else if (c == ',' && !inQuotes) {
        result.add(buffer.toString().trim());
        buffer.clear();
      } else {
        buffer.write(c);
      }
    }
    result.add(buffer.toString().trim());
    return result;
  }

  String _col(List<String> cols, int i) =>
      i < cols.length ? cols[i].trim() : '';

  // ── Import ────────────────────────────────────────────────────────────

  Future<void> _startImport() async {
    if (_rows.isEmpty) return;
    setState(() {
      _importing = true;
      _processed = 0;
      _succeeded = 0;
      _failed    = 0;
      _done      = false;
      _log.clear();
    });

    for (final row in _rows) {
      if (!mounted) break;

      setState(() => _currentAction = 'Adding "${row.borrowerName}" (row ${row.lineNumber})…');

      try {
        final payload = <String, dynamic>{
          'borrower_name': row.borrowerName,
        };
        if (row.email.isNotEmpty)            payload['email']             = row.email;
        if (row.phone.isNotEmpty)            payload['phone']             = row.phone;
        if (row.address.isNotEmpty)          payload['address']           = row.address;
        if (row.rfId.isNotEmpty)             payload['rf_id']             = row.rfId;
        if (row.membershipExpiry.isNotEmpty) payload['membership_expiry'] = row.membershipExpiry;

        await ApiService.post('/borrowers', data: payload);
        _addLog('Row ${row.lineNumber}: ✓ "${row.borrowerName}"');
        setState(() { _processed++; _succeeded++; });

      } catch (e) {
        final msg = _extractError(e);
        _addLog('Row ${row.lineNumber}: FAILED "${row.borrowerName}" — ${msg.isNotEmpty ? msg : e.toString()}', error: true);
        setState(() { _processed++; _failed++; });
      }
    }

    setState(() { _importing = false; _done = true; _currentAction = ''; });
    if (_succeeded > 0) widget.onDone();
  }

  void _addLog(String msg, {bool error = false}) {
    setState(() => _log.add(error ? '❌ $msg' : '✅ $msg'));
  }

  String _extractError(dynamic e) {
    try { return e.response?.data?['message'] ?? e.response?.data?['error'] ?? ''; }
    catch (_) { return ''; }
  }

  // ── Build ─────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _importing ? null : widget.onClose,
      child: Container(
        color: const Color(0x80000000),
        child: Center(
          child: GestureDetector(
            onTap: () {},
            child: Container(
              margin: const EdgeInsets.all(20),
              constraints: const BoxConstraints(maxWidth: 560, maxHeight: 680),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: const [BoxShadow(color: Color(0x30000000), blurRadius: 30, offset: Offset(0, 10))],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildHeader(),
                  Flexible(child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      _buildFormatHint(),
                      const SizedBox(height: 20),
                      _buildFileSection(),
                      if (_rows.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        _buildPreview(),
                      ],
                      if (_log.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        _buildLog(),
                      ],
                      if (_done) ...[
                        const SizedBox(height: 16),
                        _buildSummary(),
                      ],
                    ]),
                  )),
                  _buildFooter(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 20, 16, 16),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFF3F4F6))),
      ),
      child: Row(children: [
        const Icon(Icons.upload_file_outlined, size: 22, color: Color(0xFF7C3AED)),
        const SizedBox(width: 10),
        const Expanded(child: Text('Import Borrowers from CSV',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF1F2937)))),
        if (!_importing)
          GestureDetector(
            onTap: widget.onClose,
            child: const Icon(Icons.close, size: 20, color: Color(0xFF9CA3AF)),
          ),
      ]),
    );
  }

  Widget _buildFormatHint() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F3FF),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFDDD6FE)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [
          Icon(Icons.info_outline, size: 14, color: Color(0xFF7C3AED)),
          SizedBox(width: 6),
          Text('Expected CSV format', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF6D28D9))),
        ]),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(6)),
          child: const Text(
            'borrower_name,email,phone,address,rf_id,membership_expiry\n'
            'John Doe,john@email.com,09171234567,123 Main St,RF001,2025-12-31',
            style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontFamily: 'monospace', height: 1.5),
          ),
        ),
        const SizedBox(height: 6),
        const Text('• Only borrower_name is required; all other fields are optional', style: TextStyle(fontSize: 11, color: Color(0xFF7C3AED))),
        const Text('• membership_expiry format: YYYY-MM-DD', style: TextStyle(fontSize: 11, color: Color(0xFF7C3AED))),
        const Text('• Duplicate names will still be created — check first', style: TextStyle(fontSize: 11, color: Color(0xFF7C3AED))),
      ]),
    );
  }

  Widget _buildFileSection() {
    return GestureDetector(
      onTap: _importing ? null : _pickFile,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 24),
        decoration: BoxDecoration(
          color: _rows.isEmpty ? const Color(0xFFF9FAFB) : const Color(0xFFF5F3FF),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: _rows.isEmpty ? const Color(0xFFE5E7EB) : const Color(0xFFC4B5FD),
            width: 2,
          ),
        ),
        child: Column(children: [
          Icon(
            _rows.isEmpty ? Icons.cloud_upload_outlined : Icons.check_circle_outline,
            size: 32,
            color: _rows.isEmpty ? const Color(0xFF9CA3AF) : const Color(0xFF7C3AED),
          ),
          const SizedBox(height: 8),
          Text(
            _rows.isEmpty ? 'Tap to select CSV file' : '${_rows.length} rows loaded — tap to change',
            style: TextStyle(
              fontSize: 13, fontWeight: FontWeight.w600,
              color: _rows.isEmpty ? const Color(0xFF6B7280) : const Color(0xFF7C3AED),
            ),
          ),
          if (_rows.isEmpty)
            const Text('.csv files only', style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
        ]),
      ),
    );
  }

  Widget _buildPreview() {
    final preview = _rows.take(3).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Preview (${_rows.length} rows)', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF374151))),
      const SizedBox(height: 8),
      ...preview.map((r) => Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Row(children: [
          const Icon(Icons.person_outline, size: 14, color: Color(0xFF9CA3AF)),
          const SizedBox(width: 8),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(r.borrowerName, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
            Text(
              [if (r.email.isNotEmpty) r.email, if (r.phone.isNotEmpty) r.phone].join(' · '),
              style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
            ),
          ])),
        ]),
      )),
      if (_rows.length > 3)
        Text('… and ${_rows.length - 3} more rows', style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
    ]);
  }

  Widget _buildLog() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const Text('Import Log', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF374151))),
        if (_importing) ...[
          const SizedBox(width: 8),
          const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF7C3AED))),
          const SizedBox(width: 6),
          Expanded(child: Text(_currentAction, style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)), overflow: TextOverflow.ellipsis)),
        ],
      ]),
      const SizedBox(height: 8),
      Container(
        height: 160,
        width: double.infinity,
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(8)),
        child: ListView.builder(
          reverse: true,
          itemCount: _log.length,
          itemBuilder: (_, i) => Text(
            _log[_log.length - 1 - i],
            style: TextStyle(
              fontSize: 11,
              fontFamily: 'monospace',
              color: _log[_log.length - 1 - i].startsWith('❌')
                  ? const Color(0xFFF87171)
                  : const Color(0xFF86EFAC),
              height: 1.6,
            ),
          ),
        ),
      ),
    ]);
  }

  Widget _buildSummary() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _failed == 0 ? const Color(0xFFECFDF5) : const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _failed == 0 ? const Color(0xFFA7F3D0) : const Color(0xFFFDE68A)),
      ),
      child: Row(children: [
        Icon(_failed == 0 ? Icons.check_circle : Icons.warning_amber_rounded,
            color: _failed == 0 ? const Color(0xFF10B981) : const Color(0xFFF59E0B), size: 20),
        const SizedBox(width: 10),
        Expanded(child: Text(
          'Import complete — $_succeeded succeeded, $_failed failed out of ${_rows.length} rows',
          style: TextStyle(
            fontSize: 13, fontWeight: FontWeight.w600,
            color: _failed == 0 ? const Color(0xFF065F46) : const Color(0xFF92400E),
          ),
        )),
      ]),
    );
  }

  Widget _buildFooter() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 20),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Color(0xFFF3F4F6))),
      ),
      child: Row(children: [
        if (_rows.isNotEmpty && !_importing && !_done) ...[
          Expanded(child: ElevatedButton.icon(
            onPressed: _startImport,
            icon: const Icon(Icons.play_arrow, size: 16, color: Colors.white),
            label: Text('Import ${_rows.length} Borrowers', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF7C3AED),
              padding: const EdgeInsets.symmetric(vertical: 13),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              elevation: 0,
            ),
          )),
          const SizedBox(width: 10),
        ],
        if (_done) ...[
          Expanded(child: ElevatedButton(
            onPressed: widget.onClose,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              padding: const EdgeInsets.symmetric(vertical: 13),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              elevation: 0,
            ),
            child: const Text('Done', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
          )),
          const SizedBox(width: 10),
        ],
        if (!_importing)
          OutlinedButton(
            onPressed: widget.onClose,
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0xFFD1D5DB), width: 2),
              padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 20),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF374151), fontWeight: FontWeight.w600)),
          ),
      ]),
    );
  }
}

// ── Data model ────────────────────────────────────────────────────────────

class _CsvRow {
  final String borrowerName, email, phone, address, rfId, membershipExpiry;
  final int lineNumber;

  const _CsvRow({
    required this.borrowerName,
    required this.email,
    required this.phone,
    required this.address,
    required this.rfId,
    required this.membershipExpiry,
    required this.lineNumber,
  });
}