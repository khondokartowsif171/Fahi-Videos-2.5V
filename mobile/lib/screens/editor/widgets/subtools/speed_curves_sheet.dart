import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/theme_colors.dart';
import '../../../../models/speed_curve_model.dart';
import '../../../../models/track_item.dart';
import '../../../../providers/timeline_provider.dart';

class SpeedCurvesSheet extends StatefulWidget {
  final TrackItem? item;
  const SpeedCurvesSheet({super.key, this.item});

  @override
  State<SpeedCurvesSheet> createState() => _SpeedCurvesSheetState();
}

class _SpeedCurvesSheetState extends State<SpeedCurvesSheet> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late double _speed;

  final List<double> _quickSpeeds = [0.2, 0.5, 1.0, 1.5, 2.0, 5.0, 10.0];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _speed = widget.item?.speed ?? 1.0;
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final timeline = context.watch<TimelineProvider>();
    final targetItem = widget.item ?? timeline.selectedItem ?? timeline.videoTracks.firstOrNull;

    if (targetItem == null) {
      return Container(
        height: 200,
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: const Center(
          child: Text('Select or import a video first to change speed', style: TextStyle(color: Colors.white60)),
        ),
      );
    }

    return Container(
      height: 420,
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
                const Text('Speed Adjustment', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close, color: Colors.white60, size: 20),
                ),
              ],
            ),
          ),

          // Tab Bar: Normal vs Curve
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(10),
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              labelColor: Colors.black,
              unselectedLabelColor: Colors.white60,
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
              tabs: const [
                Tab(text: 'Normal Speed'),
                Tab(text: 'Curve (Velocity)'),
              ],
            ),
          ),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // Tab 1: Normal Speed
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      // Speed readout
                      Text(
                        '${_speed.toStringAsFixed(1)}x',
                        style: const TextStyle(color: AppColors.primary, fontSize: 32, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),

                      // Speed Slider
                      SliderTheme(
                        data: SliderTheme.of(context).copyWith(
                          activeTrackColor: AppColors.primary,
                          inactiveTrackColor: Colors.white12,
                          thumbColor: AppColors.primary,
                          trackHeight: 4,
                        ),
                        child: Slider(
                          value: _speed.clamp(0.1, 10.0),
                          min: 0.1,
                          max: 10.0,
                          divisions: 99,
                          onChanged: (val) {
                            setState(() => _speed = val);
                            targetItem.speed = val;
                            timeline.updateTrackItem(targetItem);
                          },
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Quick Speed Chips
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(),
                        child: Row(
                          children: _quickSpeeds.map((s) {
                            final isSel = (_speed - s).abs() < 0.05;
                            return Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ChoiceChip(
                                label: Text('${s}x'),
                                selected: isSel,
                                selectedColor: AppColors.primary,
                                backgroundColor: AppColors.surfaceLight,
                                labelStyle: TextStyle(
                                  color: isSel ? Colors.black : Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                ),
                                onSelected: (sel) {
                                  if (sel) {
                                    setState(() => _speed = s);
                                    targetItem.speed = s;
                                    timeline.updateTrackItem(targetItem);
                                  }
                                },
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ],
                  ),
                ),

                // Tab 2: Velocity Curve Presets
                GridView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: SpeedCurvePreset.presets.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                    childAspectRatio: 1.4,
                  ),
                  itemBuilder: (ctx, i) {
                    final preset = SpeedCurvePreset.presets[i];
                    final isSelected = targetItem.speedCurve?.id == preset.id;

                    return InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: () {
                        targetItem.speedCurve = preset;
                        timeline.updateTrackItem(targetItem);
                        Navigator.pop(context);
                      },
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected ? AppColors.primary : Colors.white10,
                            width: isSelected ? 2 : 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Row(
                              children: [
                                Icon(preset.icon, color: AppColors.primary, size: 18),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    preset.name,
                                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              preset.description,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: Colors.white38, fontSize: 9),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
