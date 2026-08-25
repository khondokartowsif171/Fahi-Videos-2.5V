import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/theme_colors.dart';
import '../../../../providers/timeline_provider.dart';

class ChromaKeySheet extends StatefulWidget {
  const ChromaKeySheet({super.key});

  @override
  State<ChromaKeySheet> createState() => _ChromaKeySheetState();
}

class _ChromaKeySheetState extends State<ChromaKeySheet> {
  final List<Color> _presetColors = [
    const Color(0xFF00FF00), // Standard Green Screen
    const Color(0xFF0000FF), // Blue Screen
    const Color(0xFFFF0000), // Red
    const Color(0xFF000000), // Black
    const Color(0xFFFFFFFF), // White
  ];

  @override
  Widget build(BuildContext context) {
    final timeline = context.watch<TimelineProvider>();
    final selectedItem = timeline.selectedItem;

    final currentColor = selectedItem?.chromaKeyColor;
    final currentIntensity = selectedItem?.chromaIntensity ?? 0.5;

    return Container(
      height: 380,
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Chroma Key (Green Screen)', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white70),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Color Picker Row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                GestureDetector(
                  onTap: () {
                    if (selectedItem != null) {
                      selectedItem.chromaKeyColor = null;
                      timeline.updateTrackItem(selectedItem);
                    }
                  },
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: currentColor == null ? AppColors.primary.withOpacity(0.2) : AppColors.surfaceLight,
                      border: Border.all(color: currentColor == null ? AppColors.primary : Colors.white24, width: 2),
                    ),
                    child: const Icon(Icons.block_rounded, color: Colors.white70, size: 20),
                  ),
                ),
                ..._presetColors.map((col) {
                  final isSelected = currentColor?.value == col.value;

                  return GestureDetector(
                    onTap: () {
                      if (selectedItem != null) {
                        selectedItem.chromaKeyColor = col;
                        timeline.updateTrackItem(selectedItem);
                      }
                    },
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: col,
                        border: Border.all(
                          color: isSelected ? Colors.white : Colors.transparent,
                          width: 3,
                        ),
                        boxShadow: isSelected ? [BoxShadow(color: col.withOpacity(0.5), blurRadius: 8)] : null,
                      ),
                      child: isSelected ? const Icon(Icons.check_rounded, color: Colors.white, size: 22) : null,
                    ),
                  );
                }),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Intensity Slider
          if (currentColor != null) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
              child: Row(
                children: [
                  const Text('Intensity:', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold)),
                  Expanded(
                    child: Slider(
                      value: currentIntensity,
                      min: 0.0,
                      max: 1.0,
                      divisions: 20,
                      activeColor: AppColors.primary,
                      onChanged: (val) {
                        if (selectedItem != null) {
                          selectedItem.chromaIntensity = val;
                          timeline.updateTrackItem(selectedItem);
                        }
                      },
                    ),
                  ),
                  Text('${(currentIntensity * 100).round()}%', style: const TextStyle(color: AppColors.primary, fontSize: 13, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
