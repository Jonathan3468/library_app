// lib/widgets/image_picker_widget.dart
//
// Equivalent of React's <ImageUpload> component.
// Picks from gallery, converts to base64, and calls onChange.
// Requires: image_picker in pubspec.yaml
//
// Usage:
//   ImagePickerWidget(value: _base64, onChange: (b64) => setState(() => _base64 = b64))
//
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

class ImagePickerWidget extends StatelessWidget {
  final String? value;          // base64 data-URL already stored
  final ValueChanged<String?> onChange;
  final bool hidePreview;       // if true, only shows the button (parent renders preview)

  const ImagePickerWidget({
    super.key,
    required this.onChange,
    this.value,
    this.hidePreview = false,
  });

  Future<void> _pick(BuildContext context) async {
    final picker = ImagePicker();
    final picked  = await picker.pickImage(source: ImageSource.gallery, imageQuality: 75);
    if (picked == null) return;
    final bytes  = await picked.readAsBytes();
    final base64 = base64Encode(bytes);
    onChange('data:image/jpeg;base64,$base64');
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Preview (optional)
        if (!hidePreview && value != null && value!.isNotEmpty) ...[
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.memory(
              base64Decode(value!.contains(',') ? value!.split(',').last : value!),
              height: 140,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          ),
          const SizedBox(height: 8),
        ],

        // Buttons row
        Row(children: [
          GestureDetector(
            onTap: () => _pick(context),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFFE5E7EB)),
                borderRadius: BorderRadius.circular(8),
                color: Colors.white,
              ),
              child: const Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.upload_outlined, size: 15, color: Color(0xFF6B7280)),
                SizedBox(width: 6),
                Text('Choose Image', style: TextStyle(fontSize: 12, color: Color(0xFF374151), fontWeight: FontWeight.w500)),
              ]),
            ),
          ),
          if (value != null && value!.isNotEmpty) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () => onChange(null),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFFFECACA)),
                  borderRadius: BorderRadius.circular(8),
                  color: const Color(0xFFFEF2F2),
                ),
                child: const Icon(Icons.close, size: 15, color: Color(0xFFEF4444)),
              ),
            ),
          ],
        ]),
      ],
    );
  }
}