import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/theme_colors.dart';
import '../../../../models/transition_model.dart';
import '../../../../providers/timeline_provider.dart';

class TransitionsSheet extends StatefulWidget {
  const TransitionsSheet({super.key});

  @override
  State<TransitionsSheet> createState() => _TransitionsSheetState();
}

class _TransitionsSheetState extends State<TransitionsSheet> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  double _durationSec = 0.5;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: TransitionCategory.values.length, vsync: this);
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
                const Text('CapCut Transitions', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white70),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Categories Tab Bar
          TabBar(
            controller: _tabController,
            isScrollable: true,
            indicatorColor: AppColors.primary,
            labelColor: AppColors.primary,
            unselectedLabelColor: Colors.white38,
            labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
            tabs: TransitionCategory.values.map((cat) => Tab(text: cat.name.toUpperCase())).toList(),
          ),

          // Presets Grid
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: TransitionCategory.values.map((cat) {
                final categoryPresets = TransitionPreset.presets.where((p) => p.category == cat).toList();

                return GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.1,
                  ),
                  itemCount: categoryPresets.length,
                  itemBuilder: (ctx, i) {
                    final preset = categoryPresets[i];
                    final isApplied = selectedItem?.transition?.id == preset.id;

                    return GestureDetector(
                      onTap: () {
                        if (selectedItem != null) {
                          selectedItem.transition = preset;
                          selectedItem.transitionDurationMs = (_durationSec * 1000).round();
                          timeline.updateTrackItem(selectedItem);
                        }
                      },
                      child: Container(
                        decoration: BoxDecoration(
                          color: isApplied ? AppColors.primary.withOpacity(0.2) : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isApplied ? AppColors.primary : Colors.transparent,
                            width: 2,
                          ),
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
              }).toList(),
            ),
          ),

          // Duration Slider
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            color: AppColors.background,
            child: Row(
              children: [
                const Text('Duration:', style: TextStyle(color: Colors.white70, fontSize: 12)),
                Expanded(
                  child: Slider(
                    value: _durationSec,
                    min: 0.1,
                    max: 2.0,
                    divisions: 19,
                    activeColor: AppColors.primary,
                    onChanged: (val) {
                      setState(() => _durationSec = val);
                      if (selectedItem != null && selectedItem.transition != null) {
                        selectedItem.transitionDurationMs = (val * 1000).round();
                        timeline.updateTrackItem(selectedItem);
                      }
                    },
                  ),
                ),
                Text('${_durationSec.toStringAsFixed(1)}s', style: const TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
