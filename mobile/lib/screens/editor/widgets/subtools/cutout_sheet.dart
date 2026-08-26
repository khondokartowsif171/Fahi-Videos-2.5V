import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/theme_colors.dart';
import '../../../../models/track_item.dart';
import '../../../../providers/timeline_provider.dart';

class CutoutSheet extends StatefulWidget {
  final TrackItem? item;
  const CutoutSheet({super.key, this.item});

  @override
  State<CutoutSheet> createState() => _CutoutSheetState();
}

class _CutoutSheetState extends State<CutoutSheet> {
  int _selectedTab = 0; // 0 = Auto Cutout, 1 = Chroma Key, 2 = Custom Cutout
  late bool _isAutoCutout;
  late Color _chromaColor;
  late double _intensity;

  final List<Color> _presetColors = [
    const Color(0xFF00FF00), // Pure Green
    const Color(0xFF0000FF), // Pure Blue
    const Color(0xFF000000), // Black
    const Color(0xFFFFFFFF), // White
    const Color(0xFFFF0000), // Red
  ];

  @override
  void initState() {
    super.initState();
    final target = widget.item;
    _isAutoCutout = target?.isAutoCutoutActive ?? false;
    _chromaColor = target?.chromaKeyColor ?? const Color(0xFF00FF00);
    _intensity = target?.chromaIntensity ?? 0.5;
  }

  void _applyChanges(TimelineProvider timeline, TrackItem target) {
    target.isAutoCutoutActive = _isAutoCutout;
    target.chromaKeyColor = _chromaColor;
    target.chromaIntensity = _intensity;
    timeline.updateTrackItem(target);
  }

  @override
  Widget build(BuildContext context) {
    final timeline = context.read<TimelineProvider>();
    final targetItem = widget.item ?? timeline.selectedItem ?? timeline.videoTracks.firstOrNull;

    return Container(
      height: 420,
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
              const Text('Cutout & Remove BG', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: Colors.white60, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Tab Bar Selector
          Row(
            children: [
              _tabButton(0, 'Auto Cutout', Icons.person_search_rounded),
              const SizedBox(width: 8),
              _tabButton(1, 'Chroma Key', Icons.color_lens_rounded),
              const SizedBox(width: 8),
              _tabButton(2, 'Custom Cutout', Icons.brush_rounded),
            ],
          ),

          const SizedBox(height: 20),

          // Tab 0: Auto Cutout
          if (_selectedTab == 0) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _isAutoCutout ? AppColors.primary : Colors.white12),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.primary.withOpacity(0.15),
                    ),
                    child: const Icon(Icons.auto_fix_high_rounded, color: AppColors.primary, size: 26),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('AI Smart Portrait Cutout', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                        Text('Instantly isolates humans and removes background', style: TextStyle(color: Colors.white38, fontSize: 10)),
                      ],
                    ),
                  ),
                  Switch(
                    value: _isAutoCutout,
                    activeColor: AppColors.primary,
                    onChanged: (val) {
                      setState(() => _isAutoCutout = val);
                      if (targetItem != null) _applyChanges(timeline, targetItem);
                    },
                  ),
                ],
              ),
            ),
          ],

          // Tab 1: Chroma Key
          if (_selectedTab == 1) ...[
            const Text('Select Key Color', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: _presetColors.map((color) {
                final isSelected = _chromaColor.value == color.value;
                return GestureDetector(
                  onTap: () {
                    setState(() => _chromaColor = color);
                    if (targetItem != null) _applyChanges(timeline, targetItem);
                  },
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: color,
                      shape: BoxShape.circle,
                      border: Border.all(color: isSelected ? Colors.white : Colors.white24, width: isSelected ? 3 : 1),
                    ),
                    child: isSelected ? const Icon(Icons.check, size: 18, color: Colors.black) : null,
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Keying Intensity', style: TextStyle(color: Colors.white70, fontSize: 12)),
                Text('${(_intensity * 100).toInt()}%', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
              ],
            ),
            Slider(
              value: _intensity,
              min: 0.0,
              max: 1.0,
              activeColor: AppColors.primary,
              onChanged: (val) {
                setState(() => _intensity = val);
                if (targetItem != null) _applyChanges(timeline, targetItem);
              },
            ),
          ],

          // Tab 2: Custom Cutout
          if (_selectedTab == 2) ...[
            Center(
              child: Column(
                children: [
                  const Icon(Icons.touch_app_rounded, color: AppColors.secondary, size: 48),
                  const SizedBox(height: 12),
                  const Text('Interactive Brush Cutout', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  const Text('Brush over areas on video preview to keep or erase', style: TextStyle(color: Colors.white38, fontSize: 11)),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('✨ Custom brush mode active! Tap on canvas to paint.'), backgroundColor: AppColors.secondary),
                      );
                      Navigator.pop(context);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.secondary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Start Brush Painting', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _tabButton(int index, String title, IconData icon) {
    final isSelected = _selectedTab == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedTab = index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary.withOpacity(0.15) : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: isSelected ? AppColors.primary : Colors.white10),
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? AppColors.primary : Colors.white60, size: 20),
              const SizedBox(height: 4),
              Text(title, style: TextStyle(color: isSelected ? AppColors.primary : Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }
}
