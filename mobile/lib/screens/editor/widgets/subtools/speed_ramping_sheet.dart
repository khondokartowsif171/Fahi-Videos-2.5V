import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/theme_colors.dart';
import '../../../../models/track_item.dart';
import '../../../../providers/timeline_provider.dart';

class SpeedRampingSheet extends StatefulWidget {
  final TrackItem item;
  const SpeedRampingSheet({super.key, required this.item});

  @override
  State<SpeedRampingSheet> createState() => _SpeedRampingSheetState();
}

class _SpeedRampingSheetState extends State<SpeedRampingSheet> {
  late double _speed;
  final List<double> _presets = [0.2, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0];

  @override
  void initState() {
    super.initState();
    _speed = widget.item.speed;
  }

  @override
  Widget build(BuildContext context) {
    final timeline = context.read<TimelineProvider>();

    return Container(
      padding: const EdgeInsets.all(20),
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
              const Text(
                'Speed Control / Curve',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              Text(
                '${_speed.toStringAsFixed(1)}x',
                style: const TextStyle(color: AppColors.primary, fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Speed Slider
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: AppColors.primary,
              inactiveTrackColor: AppColors.surfaceLight,
              thumbColor: AppColors.primary,
              overlayColor: AppColors.primary.withOpacity(0.2),
            ),
            child: Slider(
              value: _speed,
              min: 0.1,
              max: 10.0,
              divisions: 99,
              onChanged: (val) {
                setState(() => _speed = val);
                timeline.setItemSpeed(widget.item, val);
              },
            ),
          ),

          const SizedBox(height: 12),

          // Speed Quick Preset Chips
          Wrap(
            spacing: 8,
            children: _presets.map((p) {
              final isSelected = (_speed - p).abs() < 0.05;
              return ChoiceChip(
                label: Text('${p}x'),
                selected: isSelected,
                selectedColor: AppColors.primary,
                backgroundColor: AppColors.surfaceLight,
                labelStyle: TextStyle(
                  color: isSelected ? Colors.black : Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
                onSelected: (selected) {
                  if (selected) {
                    setState(() => _speed = p);
                    timeline.setItemSpeed(widget.item, p);
                  }
                },
              );
            }).toList(),
          ),

          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Apply Speed Ramping', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}
