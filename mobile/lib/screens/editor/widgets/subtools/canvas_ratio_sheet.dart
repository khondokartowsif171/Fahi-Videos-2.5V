import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/theme_colors.dart';
import '../../../../providers/editor_state_provider.dart';

class CanvasRatioSheet extends StatelessWidget {
  const CanvasRatioSheet({super.key});

  static const List<Map<String, dynamic>> ratios = [
    {'ratio': AspectRatioPreset.ratio9_16, 'label': '9:16', 'sub': 'TikTok / Reels / Shorts', 'icon': Icons.stay_current_portrait_rounded},
    {'ratio': AspectRatioPreset.ratio16_9, 'label': '16:9', 'sub': 'YouTube / Cinema Landscape', 'icon': Icons.stay_current_landscape_rounded},
    {'ratio': AspectRatioPreset.ratio1_1, 'label': '1:1', 'sub': 'Instagram Square Post', 'icon': Icons.crop_square_rounded},
    {'ratio': AspectRatioPreset.ratio4_5, 'label': '4:5', 'sub': 'Instagram Portrait Feed', 'icon': Icons.crop_portrait_rounded},
  ];

  static const List<Color> bgColors = [
    Colors.black,
    Color(0xFF14141E),
    Color(0xFF1E1E2E),
    Color(0xFF2E1065),
    Color(0xFF064E3B),
    Color(0xFF7F1D1D),
    Color(0xFF0C4A6E),
    Colors.white,
  ];

  @override
  Widget build(BuildContext context) {
    final editorState = context.watch<EditorStateProvider>();

    return Container(
      height: 380,
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Canvas Ratio & Background', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: Colors.white60, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text('Aspect Ratio (Canvas Format)', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),

          // Ratio Cards
          Row(
            children: ratios.map((r) {
              final preset = r['ratio'] as AspectRatioPreset;
              final isSelected = editorState.aspectRatio == preset;

              return Expanded(
                child: GestureDetector(
                  onTap: () {
                    editorState.setAspectRatio(preset);
                  },
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary.withOpacity(0.2) : AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isSelected ? AppColors.primary : Colors.white10,
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Column(
                      children: [
                        Icon(r['icon'] as IconData, color: isSelected ? AppColors.primary : Colors.white70, size: 22),
                        const SizedBox(height: 6),
                        Text(r['label'] as String, style: TextStyle(color: isSelected ? AppColors.primary : Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 16),
          const Text('Canvas Background Color', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),

          // Background Color Palette
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: bgColors.map((color) {
              final isSelected = editorState.canvasBackgroundColor.value == color.value;

              return GestureDetector(
                onTap: () => editorState.setCanvasBackgroundColor(color),
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    border: Border.all(color: isSelected ? AppColors.primary : Colors.white24, width: isSelected ? 3 : 1),
                    boxShadow: isSelected ? [BoxShadow(color: AppColors.primary.withOpacity(0.5), blurRadius: 6)] : null,
                  ),
                  child: isSelected ? Icon(Icons.check, color: color == Colors.white ? Colors.black : Colors.white, size: 16) : null,
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
