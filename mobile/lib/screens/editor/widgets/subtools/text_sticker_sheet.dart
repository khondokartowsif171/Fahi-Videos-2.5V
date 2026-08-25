import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../../../../config/theme_colors.dart';
import '../../../../models/track_item.dart';
import '../../../../providers/timeline_provider.dart';

class TextStickerSheet extends StatefulWidget {
  const TextStickerSheet({super.key});

  @override
  State<TextStickerSheet> createState() => _TextStickerSheetState();
}

class _TextStickerSheetState extends State<TextStickerSheet> {
  final TextEditingController _textController = TextEditingController();
  Color _selectedColor = Colors.white;
  double _fontSize = 26.0;

  final List<Color> _colors = [
    Colors.white,
    AppColors.primary,
    AppColors.secondary,
    AppColors.accent,
    AppColors.success,
    Colors.yellow,
    Colors.redAccent,
  ];

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final timeline = context.read<TimelineProvider>();

    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Add Kinetic Text & Title', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: Colors.white60, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Text Input Field
          TextField(
            controller: _textController,
            autofocus: true,
            style: TextStyle(color: _selectedColor, fontSize: _fontSize, fontWeight: FontWeight.bold),
            decoration: InputDecoration(
              hintText: 'Enter your text caption...',
              hintStyle: const TextStyle(color: Colors.white30, fontSize: 16),
              filled: true,
              fillColor: AppColors.surfaceLight,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            ),
          ),

          const SizedBox(height: 16),

          // Color Palette Picker
          const Text('Text Color & Glow', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Row(
            children: _colors.map((c) {
              final isSelected = _selectedColor == c;
              return GestureDetector(
                onTap: () => setState(() => _selectedColor = c),
                child: Container(
                  margin: const EdgeInsets.only(right: 12),
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: c,
                    shape: BoxShape.circle,
                    border: Border.all(color: isSelected ? Colors.white : Colors.transparent, width: 2.5),
                    boxShadow: isSelected ? [BoxShadow(color: c.withOpacity(0.6), blurRadius: 8)] : null,
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 20),

          // Add to Timeline Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                if (_textController.text.trim().isNotEmpty) {
                  final textItem = TrackItem(
                    id: const Uuid().v4(),
                    type: TrackType.text,
                    title: _textController.text.trim(),
                    textContent: _textController.text.trim(),
                    startTimeMs: timeline.currentTimeMs,
                    durationMs: 4000,
                    textColor: _selectedColor,
                    fontSize: _fontSize,
                  );
                  timeline.addTrackItem(textItem);
                  Navigator.pop(context);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Add Text Layer to Timeline', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}
