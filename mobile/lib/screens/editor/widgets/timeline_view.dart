import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../config/theme_colors.dart';
import '../../../models/track_item.dart';
import '../../../providers/timeline_provider.dart';

class TimelineView extends StatefulWidget {
  const TimelineView({super.key});

  @override
  State<TimelineView> createState() => _TimelineViewState();
}

class _TimelineViewState extends State<TimelineView> {
  final ScrollController _scrollController = ScrollController();

  // Pixels per second at 1.0x zoom
  static const double basePixelsPerSecond = 60.0;

  @override
  Widget build(BuildContext context) {
    final timeline = context.watch<TimelineProvider>();
    final pxPerMs = (basePixelsPerSecond * timeline.zoomLevel) / 1000.0;
    final totalWidth = timeline.totalDurationMs * pxPerMs + 200; // Extra padding

    return Container(
      color: AppColors.background,
      child: Column(
        children: [
          // Timeline Controls Bar (Play/Pause, Split, Zoom Slider, Timecode)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(bottom: BorderSide(color: AppColors.surfaceBorder, width: 0.5)),
            ),
            child: Row(
              children: [
                IconButton(
                  onPressed: () => timeline.setPlaying(!timeline.isPlaying),
                  icon: Icon(
                    timeline.isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                    color: AppColors.primary,
                    size: 26,
                  ),
                  tooltip: timeline.isPlaying ? 'Pause' : 'Play',
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: timeline.canUndo ? () => timeline.undo() : null,
                  icon: Icon(Icons.undo_rounded, size: 20, color: timeline.canUndo ? Colors.white : Colors.white24),
                  tooltip: 'Undo',
                ),
                IconButton(
                  onPressed: timeline.canRedo ? () => timeline.redo() : null,
                  icon: Icon(Icons.redo_rounded, size: 20, color: timeline.canRedo ? Colors.white : Colors.white24),
                  tooltip: 'Redo',
                ),
                const Spacer(),
                // Split Tool Shortcut Button
                if (timeline.selectedItem != null)
                  ElevatedButton.icon(
                    onPressed: () => timeline.splitSelectedItem(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary.withOpacity(0.15),
                      foregroundColor: AppColors.primary,
                      elevation: 0,
                      side: const BorderSide(color: AppColors.primary, width: 1),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    ),
                    icon: const Icon(Icons.content_cut_rounded, size: 14),
                    label: const Text('Split', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),
          ),

          // Multi-Track Interactive Canvas with Center Playhead
          Expanded(
            child: Stack(
              children: [
                // Scrollable Tracks Area
                SingleChildScrollView(
                  controller: _scrollController,
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: SizedBox(
                    width: totalWidth,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Time Ruler Ticks
                        _buildTimeRuler(timeline, pxPerMs, totalWidth),

                        const SizedBox(height: 6),

                        // Track 1: Video Lane
                        _buildTrackLane(
                          timeline: timeline,
                          type: TrackType.video,
                          title: 'Video / Main',
                          icon: Icons.videocam_rounded,
                          color: AppColors.trackVideo,
                          pxPerMs: pxPerMs,
                        ),

                        const SizedBox(height: 6),

                        // Track 2: Audio / BGM Lane
                        _buildTrackLane(
                          timeline: timeline,
                          type: TrackType.audio,
                          title: 'Audio / Voice',
                          icon: Icons.music_note_rounded,
                          color: AppColors.trackAudio,
                          pxPerMs: pxPerMs,
                        ),

                        const SizedBox(height: 6),

                        // Track 3: Text & Titles Lane
                        _buildTrackLane(
                          timeline: timeline,
                          type: TrackType.text,
                          title: 'Text / Titles',
                          icon: Icons.title_rounded,
                          color: AppColors.trackText,
                          pxPerMs: pxPerMs,
                        ),

                        const SizedBox(height: 6),

                        // Track 4: Effects & Filters Lane
                        _buildTrackLane(
                          timeline: timeline,
                          type: TrackType.effect,
                          title: 'Effects',
                          icon: Icons.auto_awesome_rounded,
                          color: AppColors.trackEffect,
                          pxPerMs: pxPerMs,
                        ),
                      ],
                    ),
                  ),
                ),

                // Center/Draggable Playhead Indicator Line
                Positioned(
                  left: (timeline.currentTimeMs * pxPerMs) - _scrollController.offset.clamp(0, double.infinity),
                  top: 0,
                  bottom: 0,
                  child: IgnorePointer(
                    child: Container(
                      width: 2,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        boxShadow: [
                          BoxShadow(color: AppColors.primary, blurRadius: 4, spreadRadius: 1),
                        ],
                      ),
                      child: Align(
                        alignment: Alignment.topCenter,
                        child: Container(
                          width: 12,
                          height: 12,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeRuler(TimelineProvider timeline, double pxPerMs, double totalWidth) {
    const tickIntervalMs = 1000; // 1 second ticks
    final totalTicks = timeline.totalDurationMs ~/ tickIntervalMs;

    return Container(
      height: 24,
      color: AppColors.surfaceLight.withOpacity(0.5),
      child: Stack(
        children: List.generate(totalTicks + 1, (i) {
          final pos = (i * tickIntervalMs) * pxPerMs;
          return Positioned(
            left: pos,
            top: 0,
            bottom: 0,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(width: 1, height: i % 5 == 0 ? 16 : 8, color: Colors.white38),
                if (i % 5 == 0)
                  Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 2),
                    child: Text(
                      '${i}s',
                      style: const TextStyle(color: Colors.white54, fontSize: 9, fontFamily: 'monospace'),
                    ),
                  ),
              ],
            ),
          );
        }),
      ),
    );
  }

  Widget _buildTrackLane({
    required TimelineProvider timeline,
    required TrackType type,
    required String title,
    required IconData icon,
    required Color color,
    required double pxPerMs,
  }) {
    final items = timeline.tracks.where((t) => t.type == type).toList();

    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: AppColors.surface.withOpacity(0.6),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppColors.surfaceBorder.withOpacity(0.5), width: 0.5),
      ),
      child: Stack(
        children: [
          // Track Name Background Label
          Positioned(
            left: 8,
            top: 0,
            bottom: 0,
            child: Row(
              children: [
                Icon(icon, size: 14, color: color.withOpacity(0.5)),
                const SizedBox(width: 4),
                Text(
                  title,
                  style: TextStyle(color: Colors.white.withOpacity(0.2), fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),

          // Track Clip Items
          ...items.map((item) {
            final isSelected = timeline.selectedItem?.id == item.id;
            final leftPos = item.startTimeMs * pxPerMs;
            final width = (item.durationMs * pxPerMs).clamp(40.0, 10000.0);

            return Positioned(
              left: leftPos,
              top: 4,
              bottom: 4,
              width: width,
              child: GestureDetector(
                onTap: () => timeline.selectItem(item),
                child: Container(
                  decoration: BoxDecoration(
                    color: isSelected ? color : color.withOpacity(0.75),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                      color: isSelected ? Colors.white : Colors.transparent,
                      width: isSelected ? 2 : 0,
                    ),
                    boxShadow: isSelected
                        ? [BoxShadow(color: color.withOpacity(0.4), blurRadius: 8, spreadRadius: 1)]
                        : null,
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Row(
                    children: [
                      Icon(icon, size: 12, color: Colors.white),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          item.textContent ?? item.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                        ),
                      ),
                      if (item.speed != 1.0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(color: Colors.black45, borderRadius: BorderRadius.circular(3)),
                          child: Text('${item.speed}x', style: const TextStyle(color: Colors.white, fontSize: 9)),
                        ),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
