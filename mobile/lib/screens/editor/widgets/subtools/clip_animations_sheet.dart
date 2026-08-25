import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/theme_colors.dart';
import '../../../../models/clip_animation_model.dart';
import '../../../../providers/timeline_provider.dart';

class ClipAnimationsSheet extends StatefulWidget {
  const ClipAnimationsSheet({super.key});

  @override
  State<ClipAnimationsSheet> createState() => _ClipAnimationsSheetState();
}

class _ClipAnimationsSheetState extends State<ClipAnimationsSheet> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final timeline = context.watch<TimelineProvider>();
    final selectedItem = timeline.selectedItem;

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
                const Text('Clip Animations (In / Out / Combo)', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white70),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // In / Out / Combo Tabs
          TabBar(
            controller: _tabController,
            indicatorColor: AppColors.primary,
            labelColor: AppColors.primary,
            unselectedLabelColor: Colors.white38,
            labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
            tabs: const [
              Tab(text: 'IN ANIMATION'),
              Tab(text: 'OUT ANIMATION'),
              Tab(text: 'COMBO 3D'),
            ],
          ),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildAnimationGrid(
                  presets: ClipAnimationPreset.inAnimations,
                  selectedPreset: selectedItem?.inAnimation,
                  onSelect: (p) {
                    if (selectedItem != null) {
                      selectedItem.inAnimation = p;
                      timeline.updateTrackItem(selectedItem);
                    }
                  },
                ),
                _buildAnimationGrid(
                  presets: ClipAnimationPreset.outAnimations,
                  selectedPreset: selectedItem?.outAnimation,
                  onSelect: (p) {
                    if (selectedItem != null) {
                      selectedItem.outAnimation = p;
                      timeline.updateTrackItem(selectedItem);
                    }
                  },
                ),
                _buildAnimationGrid(
                  presets: ClipAnimationPreset.comboAnimations,
                  selectedPreset: selectedItem?.comboAnimation,
                  onSelect: (p) {
                    if (selectedItem != null) {
                      selectedItem.comboAnimation = p;
                      timeline.updateTrackItem(selectedItem);
                    }
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnimationGrid({
    required List<ClipAnimationPreset> presets,
    required ClipAnimationPreset? selectedPreset,
    required Function(ClipAnimationPreset?) onSelect,
  }) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.1,
      ),
      itemCount: presets.length + 1,
      itemBuilder: (ctx, i) {
        if (i == 0) {
          final isNone = selectedPreset == null;
          return GestureDetector(
            onTap: () => onSelect(null),
            child: Container(
              decoration: BoxDecoration(
                color: isNone ? AppColors.primary.withOpacity(0.2) : AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isNone ? AppColors.primary : Colors.transparent, width: 2),
              ),
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.block_rounded, color: Colors.white60, size: 28),
                  SizedBox(height: 6),
                  Text('None', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          );
        }

        final preset = presets[i - 1];
        final isApplied = selectedPreset?.id == preset.id;

        return GestureDetector(
          onTap: () => onSelect(preset),
          child: Container(
            decoration: BoxDecoration(
              color: isApplied ? AppColors.primary.withOpacity(0.2) : AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: isApplied ? AppColors.primary : Colors.transparent, width: 2),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(preset.icon, color: isApplied ? AppColors.primary : Colors.white, size: 28),
                const SizedBox(height: 6),
                Text(preset.name, textAlign: TextAlign.center, style: TextStyle(color: isApplied ? AppColors.primary : Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        );
      },
    );
  }
}
