// lib/widgets/form_widgets.dart
//
// Shared form primitives used across Add/Edit pages.
//
import 'package:flutter/material.dart';

// ── Field label with optional required star ───────────────────────────────

class FieldLabel extends StatelessWidget {
  final String label;
  final bool required;
  final String? hint;
  const FieldLabel({super.key, required this.label, this.required = false, this.hint});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
        if (required) const Text(' *', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold)),
      ]),
      if (hint != null) ...[
        const SizedBox(height: 2),
        Text(hint!, style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
      ],
    ]);
  }
}

// ── Standard text field with validation state ─────────────────────────────

class ValidatedField extends StatelessWidget {
  final TextEditingController controller;
  final String placeholder;
  final bool hasError;
  final bool isValid;
  final bool touched;
  final TextInputType? keyboardType;
  final int? maxLines;
  final String? error;
  final String? hint;
  final VoidCallback? onTap;
  final bool readOnly;
  final Widget? suffix;
  final ValueChanged<String>? onChanged; // ← added

  const ValidatedField({
    super.key,
    required this.controller,
    required this.placeholder,
    this.hasError = false,
    this.isValid  = false,
    this.touched  = false,
    this.keyboardType,
    this.maxLines = 1,
    this.error,
    this.hint,
    this.onTap,
    this.readOnly = false,
    this.suffix,
    this.onChanged, // ← added
  });

  @override
  Widget build(BuildContext context) {
    Color borderColor = const Color(0xFFD1D5DB);
    Color fillColor   = Colors.white;

    if (touched) {
      if (hasError) {
        borderColor = const Color(0xFFEF4444);
        fillColor   = const Color(0xFFFEF2F2);
      } else if (isValid) {
        borderColor = const Color(0xFF10B981);
        fillColor   = const Color(0xFFF0FDF4);
      }
    }

    final border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: BorderSide(color: borderColor, width: 2),
    );

    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      maxLines: maxLines,
      readOnly: readOnly,
      onTap: onTap,
      onChanged: onChanged, // ← added
      style: const TextStyle(fontSize: 14, color: Color(0xFF1F2937)),
      decoration: InputDecoration(
        hintText: placeholder,
        hintStyle: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
        contentPadding: const EdgeInsets.all(14),
        border: border,
        enabledBorder: border,
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(
            color: hasError ? const Color(0xFFEF4444) : const Color(0xFF2563EB),
            width: 2,
          ),
        ),
        filled: true,
        fillColor: fillColor,
        suffixIcon: suffix,
      ),
    );
  }
}

// ── Inline validation message ─────────────────────────────────────────────

class ValidationMsg extends StatelessWidget {
  final String msg;
  final bool isError;
  const ValidationMsg({super.key, required this.msg, required this.isError});

  @override
  Widget build(BuildContext context) {
    final color = isError ? const Color(0xFFDC2626) : const Color(0xFF16A34A);
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(children: [
        Icon(isError ? Icons.error_outline : Icons.check_circle_outline, size: 14, color: color),
        const SizedBox(width: 4),
        Flexible(child: Text(msg, style: TextStyle(fontSize: 12, color: color))),
      ]),
    );
  }
}

// ── Error summary banner ──────────────────────────────────────────────────

class ErrorBanner extends StatelessWidget {
  final String title;
  final List<String> messages;
  const ErrorBanner({super.key, this.title = 'Cannot submit', required this.messages});

  @override
  Widget build(BuildContext context) {
    if (messages.isEmpty) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFFECACA), width: 2),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Icon(Icons.error_outline, size: 18, color: Color(0xFFDC2626)),
        const SizedBox(width: 8),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF991B1B))),
          const SizedBox(height: 4),
          ...messages.map((m) => Padding(
            padding: const EdgeInsets.only(bottom: 2),
            child: Text('• $m', style: const TextStyle(fontSize: 12, color: Color(0xFFB91C1C))),
          )),
        ])),
      ]),
    );
  }
}

// ── Submit / Cancel row ───────────────────────────────────────────────────

class FormActions extends StatelessWidget {
  final String submitLabel;
  final bool loading;
  final bool disabled;
  final VoidCallback onSubmit;
  final VoidCallback onCancel;
  final Color submitColor;

  const FormActions({
    super.key,
    required this.submitLabel,
    required this.loading,
    required this.disabled,
    required this.onSubmit,
    required this.onCancel,
    this.submitColor = const Color(0xFF16A34A),
  });

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Expanded(child: ElevatedButton(
        onPressed: (loading || disabled) ? null : onSubmit,
        style: ElevatedButton.styleFrom(
          backgroundColor: submitColor,
          disabledBackgroundColor: const Color(0xFF9CA3AF),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          padding: const EdgeInsets.symmetric(vertical: 14),
          elevation: 0,
        ),
        child: loading
            ? const SizedBox(width: 18, height: 18,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Text(submitLabel,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
      )),
      const SizedBox(width: 12),
      OutlinedButton(
        onPressed: onCancel,
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Color(0xFFD1D5DB), width: 2),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
        ),
        child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF374151))),
      ),
    ]);
  }
}

// ── Searchable single-select dropdown ─────────────────────────────────────
//
// Renders a text input. When focused, shows a dropdown below with:
//  - optional "+ Add new …" sticky row at top
//  - filtered list of items
//
// Usage:
//   SearchDropdown(
//     label: 'Category',
//     placeholder: 'Search categories...',
//     items: _categories,
//     idField: 'category_id',
//     nameField: 'category_name',
//     selectedId: _form['category_id'],
//     accentColor: Color(0xFF2563EB),
//     onSelect: (id) => setState(() => _form['category_id'] = id),
//     onClear: () => setState(() => _form['category_id'] = null),
//     onAddNew: () => _showAddModal(),
//     addNewLabel: 'Add New Category',
//   )

class SearchDropdown extends StatefulWidget {
  final String label;
  final String placeholder;
  final List<dynamic> items;
  final String idField;
  final String nameField;
  final dynamic selectedId;
  final Color accentColor;
  final ValueChanged<dynamic> onSelect;
  final VoidCallback onClear;
  final VoidCallback? onAddNew;
  final String? addNewLabel;
  final bool required;

  const SearchDropdown({
    super.key,
    required this.label,
    required this.placeholder,
    required this.items,
    required this.idField,
    required this.nameField,
    required this.selectedId,
    required this.accentColor,
    required this.onSelect,
    required this.onClear,
    this.onAddNew,
    this.addNewLabel,
    this.required = false,
  });

  @override
  State<SearchDropdown> createState() => _SearchDropdownState();
}

class _SearchDropdownState extends State<SearchDropdown> {
  final _ctrl  = TextEditingController();
  final _focus = FocusNode();
  bool _open   = false;

  @override
  void initState() {
    super.initState();
    _focus.addListener(() {
      if (_focus.hasFocus) { setState(() { _open = true; _ctrl.clear(); }); }
    });
  }

  @override
  void dispose() { _ctrl.dispose(); _focus.dispose(); super.dispose(); }

  String _displayName() {
    if (widget.selectedId == null) return '';
    final item = widget.items.firstWhere(
      (i) => i[widget.idField].toString() == widget.selectedId.toString(),
      orElse: () => null,
    );
    return item?[widget.nameField] ?? '';
  }

  List<dynamic> get _filtered {
    final q = _ctrl.text.toLowerCase();
    if (q.isEmpty) return widget.items;
    return widget.items
        .where((i) => (i[widget.nameField] as String).toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final display = _open ? null : (_displayName().isNotEmpty ? _displayName() : null);

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      FieldLabel(label: widget.label, required: widget.required),
      const SizedBox(height: 6),
      TextField(
        controller: _ctrl,
        focusNode: _focus,
        onChanged: (_) => setState(() {}),
        style: const TextStyle(fontSize: 14, color: Color(0xFF1F2937)),
        decoration: InputDecoration(
          hintText: display ?? widget.placeholder,
          hintStyle: TextStyle(
            color: display != null ? const Color(0xFF1F2937) : const Color(0xFF9CA3AF),
            fontSize: 13,
          ),
          contentPadding: const EdgeInsets.all(14),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFD1D5DB), width: 2)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: widget.selectedId != null ? widget.accentColor.withOpacity(0.5) : const Color(0xFFD1D5DB), width: 2)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: widget.accentColor, width: 2)),
          filled: true,
          fillColor: widget.selectedId != null ? widget.accentColor.withOpacity(0.05) : Colors.white,
          suffixIcon: widget.selectedId != null
              ? GestureDetector(
                  onTap: () { widget.onClear(); setState(() { _ctrl.clear(); _open = false; _focus.unfocus(); }); },
                  child: Icon(Icons.close, size: 16, color: widget.accentColor),
                )
              : Icon(Icons.keyboard_arrow_down, size: 20, color: widget.accentColor.withOpacity(0.6)),
        ),
      ),

      // Dropdown
      if (_open) ...[
        const SizedBox(height: 2),
        Container(
          constraints: const BoxConstraints(maxHeight: 220),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: widget.accentColor.withOpacity(0.3), width: 2),
            boxShadow: const [BoxShadow(color: Color(0x18000000), blurRadius: 16, offset: Offset(0, 4))],
          ),
          child: Column(children: [
            // Add new
            if (widget.onAddNew != null)
              GestureDetector(
                onTap: () { widget.onAddNew!(); setState(() { _open = false; _focus.unfocus(); }); },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                  decoration: BoxDecoration(
                    color: widget.accentColor.withOpacity(0.07),
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                    border: Border(bottom: BorderSide(color: widget.accentColor.withOpacity(0.15))),
                  ),
                  child: Row(children: [
                    Icon(Icons.add, size: 15, color: widget.accentColor),
                    const SizedBox(width: 8),
                    Text(
                      _ctrl.text.isNotEmpty
                          ? '${widget.addNewLabel ?? 'Add New'} "${_ctrl.text}"'
                          : (widget.addNewLabel ?? 'Add New'),
                      style: TextStyle(fontSize: 13, color: widget.accentColor, fontWeight: FontWeight.w600),
                    ),
                  ]),
                ),
              ),

            // Items list
            Flexible(child: ListView.separated(
              shrinkWrap: true,
              separatorBuilder: (_, __) => const Divider(height: 1, color: Color(0xFFF3F4F6)),
              itemCount: _filtered.length,
              itemBuilder: (_, i) {
                final item = _filtered[i];
                final id   = item[widget.idField];
                final name = item[widget.nameField] as String;
                final isSelected = widget.selectedId?.toString() == id.toString();

                return GestureDetector(
                  onTap: () {
                    widget.onSelect(id);
                    setState(() { _open = false; _ctrl.clear(); _focus.unfocus(); });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                    color: isSelected ? widget.accentColor.withOpacity(0.08) : Colors.white,
                    child: Row(children: [
                      Expanded(child: Text(name,
                          style: TextStyle(fontSize: 13,
                              color: isSelected ? widget.accentColor : const Color(0xFF374151),
                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal))),
                      if (isSelected) Icon(Icons.check, size: 15, color: widget.accentColor),
                    ]),
                  ),
                );
              },
            )),

            // No results
            if (_filtered.isEmpty)
              const Padding(
                padding: EdgeInsets.all(14),
                child: Text('No results found', style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
              ),
          ]),
        ),

        // Tap-outside dismissal
        GestureDetector(
          onTap: () => setState(() { _open = false; _ctrl.clear(); _focus.unfocus(); }),
          child: Container(color: Colors.transparent),
        ),
      ],
    ]);
  }
}

// ── Multi-select with chips ───────────────────────────────────────────────

class MultiSelectDropdown extends StatefulWidget {
  final String label;
  final String placeholder;
  final List<dynamic> items;
  final String idField;
  final String nameField;
  final List<dynamic> selectedIds;
  final Color accentColor;
  final ValueChanged<dynamic> onAdd;
  final ValueChanged<dynamic> onRemove;
  final VoidCallback? onAddNew;
  final String? addNewLabel;
  final bool required;

  const MultiSelectDropdown({
    super.key,
    required this.label,
    required this.placeholder,
    required this.items,
    required this.idField,
    required this.nameField,
    required this.selectedIds,
    required this.accentColor,
    required this.onAdd,
    required this.onRemove,
    this.onAddNew,
    this.addNewLabel,
    this.required = false,
  });

  @override
  State<MultiSelectDropdown> createState() => _MultiSelectDropdownState();
}

class _MultiSelectDropdownState extends State<MultiSelectDropdown> {
  final _ctrl  = TextEditingController();
  final _focus = FocusNode();
  bool _open   = false;

  @override
  void initState() {
    super.initState();
    _focus.addListener(() {
      if (_focus.hasFocus) setState(() { _open = true; });
    });
  }

  @override
  void dispose() { _ctrl.dispose(); _focus.dispose(); super.dispose(); }

  List<dynamic> get _filtered {
    final q = _ctrl.text.toLowerCase();
    if (q.isEmpty) return widget.items;
    return widget.items
        .where((i) => (i[widget.nameField] as String).toLowerCase().contains(q))
        .toList();
  }

  bool _isSelected(dynamic id) =>
      widget.selectedIds.any((s) => s.toString() == id.toString());

  String _nameOf(dynamic id) {
    final item = widget.items.firstWhere(
      (i) => i[widget.idField].toString() == id.toString(),
      orElse: () => null,
    );
    return item?[widget.nameField] ?? '';
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      FieldLabel(label: widget.label, required: widget.required),
      const SizedBox(height: 6),

      // Selected chips
      if (widget.selectedIds.isNotEmpty) ...[
        Wrap(spacing: 6, runSpacing: 6, children: widget.selectedIds.map((id) => Container(
          padding: const EdgeInsets.fromLTRB(10, 5, 6, 5),
          decoration: BoxDecoration(
            color: widget.accentColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: widget.accentColor.withOpacity(0.3)),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Text(_nameOf(id),
                style: TextStyle(fontSize: 12, color: widget.accentColor, fontWeight: FontWeight.w600)),
            const SizedBox(width: 5),
            GestureDetector(
              onTap: () => widget.onRemove(id),
              child: Icon(Icons.close, size: 13, color: widget.accentColor),
            ),
          ]),
        )).toList()),
        const SizedBox(height: 6),
      ],

      // Search input
      TextField(
        controller: _ctrl,
        focusNode: _focus,
        onChanged: (_) => setState(() {}),
        style: const TextStyle(fontSize: 14, color: Color(0xFF1F2937)),
        decoration: InputDecoration(
          hintText: widget.placeholder,
          hintStyle: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
          contentPadding: const EdgeInsets.all(14),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFD1D5DB), width: 2)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: widget.selectedIds.isNotEmpty ? widget.accentColor.withOpacity(0.4) : const Color(0xFFD1D5DB), width: 2)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: widget.accentColor, width: 2)),
          filled: true, fillColor: Colors.white,
        ),
      ),

      // Dropdown
      if (_open && (_ctrl.text.isNotEmpty || widget.onAddNew != null)) ...[
        const SizedBox(height: 2),
        Container(
          constraints: const BoxConstraints(maxHeight: 200),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: widget.accentColor.withOpacity(0.3), width: 2),
            boxShadow: const [BoxShadow(color: Color(0x18000000), blurRadius: 12, offset: Offset(0, 4))],
          ),
          child: Column(children: [
            if (widget.onAddNew != null)
              GestureDetector(
                onTap: () { widget.onAddNew!(); setState(() { _open = false; _ctrl.clear(); _focus.unfocus(); }); },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                  decoration: BoxDecoration(
                    color: widget.accentColor.withOpacity(0.07),
                    border: Border(bottom: BorderSide(color: widget.accentColor.withOpacity(0.15))),
                  ),
                  child: Row(children: [
                    Icon(Icons.add, size: 15, color: widget.accentColor),
                    const SizedBox(width: 8),
                    Text(
                      _ctrl.text.isNotEmpty
                          ? '${widget.addNewLabel ?? 'Add New'} "${_ctrl.text}"'
                          : (widget.addNewLabel ?? 'Add New'),
                      style: TextStyle(fontSize: 13, color: widget.accentColor, fontWeight: FontWeight.w600),
                    ),
                  ]),
                ),
              ),

            Flexible(child: ListView.separated(
              shrinkWrap: true,
              separatorBuilder: (_, __) => const Divider(height: 1, color: Color(0xFFF3F4F6)),
              itemCount: _filtered.length,
              itemBuilder: (_, i) {
                final item = _filtered[i];
                final id   = item[widget.idField];
                final sel  = _isSelected(id);
                return GestureDetector(
                  onTap: () {
                    sel ? widget.onRemove(id) : widget.onAdd(id);
                    setState(() { _ctrl.clear(); });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                    color: sel ? widget.accentColor.withOpacity(0.08) : Colors.white,
                    child: Row(children: [
                      Expanded(child: Text(item[widget.nameField],
                          style: TextStyle(fontSize: 13,
                              color: sel ? widget.accentColor : const Color(0xFF374151),
                              fontWeight: sel ? FontWeight.w600 : FontWeight.normal))),
                      if (sel) Icon(Icons.check, size: 15, color: widget.accentColor),
                    ]),
                  ),
                );
              },
            )),
            if (_filtered.isEmpty)
              const Padding(padding: EdgeInsets.all(14),
                  child: Text('No results found', style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)))),
          ]),
        ),
      ],
    ]);
  }
}

// ── Quick-add mini modal (for inline "Add Author", "Add Genre" etc.) ───────

class QuickAddModal extends StatefulWidget {
  final String title;
  final String placeholder;
  final Color accentColor;
  final Future<void> Function(String) onAdd;
  final VoidCallback onClose;

  const QuickAddModal({
    super.key,
    required this.title,
    required this.placeholder,
    required this.onAdd,
    required this.onClose,
    this.accentColor = const Color(0xFF2563EB),
  });

  @override
  State<QuickAddModal> createState() => _QuickAddModalState();
}

class _QuickAddModalState extends State<QuickAddModal> {
  final _ctrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  Future<void> _submit() async {
    if (_ctrl.text.trim().isEmpty) return;
    setState(() => _loading = true);
    try {
      await widget.onAdd(_ctrl.text.trim());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onClose,
      child: Container(
        color: const Color(0x80000000),
        child: Center(
          child: GestureDetector(
            onTap: () {},
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 24),
              constraints: const BoxConstraints(maxWidth: 400),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                boxShadow: const [BoxShadow(color: Color(0x30000000), blurRadius: 24, offset: Offset(0, 8))],
              ),
              child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(widget.title,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
                const SizedBox(height: 16),
                TextField(
                  controller: _ctrl,
                  autofocus: true,
                  onSubmitted: (_) => _submit(),
                  style: const TextStyle(fontSize: 14),
                  decoration: InputDecoration(
                    hintText: widget.placeholder,
                    hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)),
                    contentPadding: const EdgeInsets.all(14),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFD1D5DB), width: 2)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFD1D5DB), width: 2)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: widget.accentColor, width: 2)),
                  ),
                ),
                const SizedBox(height: 16),
                Row(children: [
                  Expanded(child: ElevatedButton(
                    onPressed: _loading ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: widget.accentColor,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      elevation: 0,
                    ),
                    child: _loading
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Add', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                  )),
                  const SizedBox(width: 10),
                  Expanded(child: OutlinedButton(
                    onPressed: widget.onClose,
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFE5E7EB)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text('Cancel', style: TextStyle(color: Color(0xFF6B7280))),
                  )),
                ]),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Page card wrapper ─────────────────────────────────────────────────────

class FormCard extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const FormCard({super.key, required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB)),
        boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 12, offset: Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF374151))),
          const SizedBox(height: 20),
          ...children,
        ],
      ),
    );
  }
}