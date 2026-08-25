import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../config/theme_colors.dart';
import '../../../providers/keyframe_provider.dart';
import '../../../providers/timeline_provider.dart';

class KeyframeBar extends StatelessWidget {
  const KeyframeBar({super.key});

  @override
  Widget build(BuildContext context) {
    final timeline = context.watch<TimelineProvider>();
    final keyframeProvider = context.watch<KeyframeProvider>();
    final selectedItem = timeline.selectedItem;

    if (selectedItem == null) return const SizedBox.shrink();

    final offsetMs = timeline.currentTimeMs - selectedItem.startTimeMs;
    final hasKeyframeAtCurrent = selectedItem.keyframes.any(
      (k) => (k.timeOffsetMs - offsetMs).abs() < 100,
    );

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      color: AppColors.surface,
      child: Row(
        children: [
          // Keyframe Diamond Action Button
          GestureDetector(
            onTap: () {
              keyframeProvider.toggleKeyframeAt(
                item: selectedItem,
                currentPlayheadMs: timeline.currentTimeMs,
              );
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: hasKeyframeAtCurrent ? AppColors.secondary : AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: hasKeyframeAtCurrent ? Colors.white : AppColors.secondary, width: 1),
              ),
              child: Row(
                children: [
                  Transform.rotate(
                    angle: 0.785, // 45 degrees diamond
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: hasKeyframeAtCurrent ? Colors.white : AppColors.secondary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    hasKeyframeAtCurrent ? 'Remove Keyframe' : 'Add Keyframe',
                    style: TextStyle(
                      color: hasKeyframeAtCurrent ? Colors.white : AppColors.secondary,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(width: 12),
          Text(
            '${selectedItem.keyframes.length} Keyframes Active',
            style: const TextStyle(color: Colors.white54, fontSize: 11),
          ),
        ],
      ),
    );
  }
}
