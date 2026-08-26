import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/theme_colors.dart';
import '../../../../models/track_item.dart';
import '../../../../providers/timeline_provider.dart';

class CropTransformSheet extends StatefulWidget {
  final TrackItem? item;
  const CropTransformSheet({super.key, this.item});

  @override
  State<CropTransformSheet> createState() => _CropTransformSheetState();
}

class _CropTransformSheetState extends State<CropTransformSheet> {
  late double _rotation;
  late double _scale;
  late bool _isFlippedH;
  late bool _isFlippedV;
  late double _cropRatio;

  final List<Map<String, dynamic>> _cropPresets = [
    {'label': 'Free', 'ratio': 0.0, 'icon': Icons.crop_free_rounded},
    {'label': '9:16', 'ratio': 9.0 / 16.0, 'icon': Icons.stay_current_portrait_rounded},
    {'label': '1:1', 'ratio': 1.0, 'icon': Icons.crop_square_rounded},
    {'label': '16:9', 'ratio': 16.0 / 9.0, 'icon': Icons.stay_current_landscape_rounded},
    {'label': '4:5', 'ratio': 4.0 / 5.0, 'icon': Icons.crop_portrait_rounded},
    {'label': '3:4', 'ratio': 3.0 / 4.0, 'icon': Icons.crop_3_2_rounded},
  ];

  @override
  void initState() {
    super.initState();
    final target = widget.item;
    _rotation = target?.rotation ?? 0.0;
    _scale = target?.scale ?? 1.0;
    _isFlippedH = target?.isFlippedHorizontal ?? false;
    _isFlippedV = target?.isFlippedVertical ?? false;
    _cropRatio = target?.cropAspectRatio ?? 0.0;
  }

  void _applyChanges(TimelineProvider timeline, TrackItem target) {
    target.rotation = _rotation;
    target.scale = _scale;
    target.isFlippedHorizontal = _isFlippedH;
    target.isFlippedVertical = _isFlippedV;
    target.cropAspectRatio = _cropRatio;
    timeline.updateTrackItem(target);
  }

  @override
  Widget build(BuildContext context) {
    final timeline = context.read<TimelineProvider>();
    final targetItem = widget.item ?? timeline.selectedItem ?? timeline.videoTracks.firstOrNull;

    return Container(
      height: 440,
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
              const Text('Crop, Rotate & Transform', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: Colors.white60, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Crop Aspect Ratio Presets
          const Text('Crop Ratio Preset', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            child: Row(
              children: _cropPresets.map((preset) {
                final ratio = preset['ratio'] as double;
                final isSelected = (_cropRatio - ratio).abs() < 0.01;

                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    avatar: Icon(preset['icon'] as IconData, size: 16, color: isSelected ? Colors.black : Colors.white70),
                    label: Text(preset['label'] as String),
                    selected: isSelected,
                    selectedColor: AppColors.primary,
                    backgroundColor: AppColors.surfaceLight,
                    labelStyle: TextStyle(color: isSelected ? Colors.black : Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                    onSelected: (selected) {
                      if (selected && targetItem != null) {
                        setState(() => _cropRatio = ratio);
                        _applyChanges(timeline, targetItem);
                      }
                    },
                  ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: 16),

          // Quick Transform Actions: Rotate 90 deg, Flip H, Flip V
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: targetItem == null
                      ? null
                      : () {
                          setState(() {
                            _rotation = (_rotation + (pi / 2)) % (2 * pi);
                          });
                          _applyChanges(timeline, targetItem);
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.surfaceLight,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.rotate_90_degrees_cw_rounded, color: AppColors.primary, size: 18),
                  label: const Text('Rotate 90°', style: TextStyle(fontSize: 11)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: targetItem == null
                      ? null
                      : () {
                          setState(() => _isFlippedH = !_isFlippedH);
                          _applyChanges(timeline, targetItem);
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _isFlippedH ? AppColors.primary.withOpacity(0.2) : AppColors.surfaceLight,
                    foregroundColor: _isFlippedH ? AppColors.primary : Colors.white,
                    side: BorderSide(color: _isFlippedH ? AppColors.primary : Colors.transparent),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.flip_rounded, size: 18),
                  label: const Text('Mirror H', style: TextStyle(fontSize: 11)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: targetItem == null
                      ? null
                      : () {
                          setState(() => _isFlippedV = !_isFlippedV);
                          _applyChanges(timeline, targetItem);
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _isFlippedV ? AppColors.primary.withOpacity(0.2) : AppColors.surfaceLight,
                    foregroundColor: _isFlippedV ? AppColors.primary : Colors.white,
                    side: BorderSide(color: _isFlippedV ? AppColors.primary : Colors.transparent),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.flip_camera_android_rounded, size: 18),
                  label: const Text('Flip V', style: TextStyle(fontSize: 11)),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Scale / Zoom Slider
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Scale & Zoom', style: TextStyle(color: Colors.white70, fontSize: 12)),
              Text('${(_scale * 100).toInt()}%', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
            ],
          ),
          Slider(
            value: _scale,
            min: 0.5,
            max: 3.0,
            divisions: 50,
            activeColor: AppColors.primary,
            onChanged: (val) {
              setState(() => _scale = val);
              if (targetItem != null) _applyChanges(timeline, targetItem);
            },
          ),
        ],
      ),
    );
  }
}
