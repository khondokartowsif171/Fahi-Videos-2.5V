import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/theme_colors.dart';
import '../../../../models/filter_model.dart';
import '../../../../models/track_item.dart';
import '../../../../providers/timeline_provider.dart';

class FiltersEffectsSheet extends StatelessWidget {
  final TrackItem? item;
  const FiltersEffectsSheet({super.key, this.item});

  @override
  Widget build(BuildContext context) {
    final timeline = context.read<TimelineProvider>();
    final targetItem = item ?? timeline.videoTracks.firstOrNull;

    return Container(
      height: 360,
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
              const Text('Color Filters & LUTs', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: Colors.white60, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: GridView.builder(
              itemCount: VideoFilterPreset.presets.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.9,
              ),
              itemBuilder: (ctx, i) {
                final preset = VideoFilterPreset.presets[i];
                final isSelected = targetItem?.filterName == preset.id;

                return GestureDetector(
                  onTap: () {
                    if (targetItem != null) {
                      targetItem.filterName = preset.id;
                      timeline.updateTrackItem(targetItem);
                    }
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected ? AppColors.secondary : Colors.white10,
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: isSelected ? AppColors.accentGradient : AppColors.primaryGradient,
                          ),
                          child: const Icon(Icons.filter_vintage_rounded, color: Colors.white, size: 22),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          preset.name,
                          style: TextStyle(
                            color: isSelected ? AppColors.secondary : Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
