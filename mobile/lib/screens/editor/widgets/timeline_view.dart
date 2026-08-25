import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
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
  static const double basePixelsPerSecond = 60.0;

  Future<void> _importVideo(BuildContext context) async {
    final picker = ImagePicker();
    final picked = await picker.pickVideo(source: ImageSource.gallery);
    if (picked != null && context.mounted) {
      await context.read<TimelineProvider>().importMediaFile(
            picked.path,
            type: TrackType.video,
            title: picked.name,
          );
    }
  }

  Future<void> _importAudio(BuildContext context) async {
    final result = await FilePicker.platform.pickFiles(type: FileType.audio);
    if (result != null && result.files.single.path != null && context.mounted) {
      final path = result.files.single.path!;
      final name = result.files.single.name;
      await context.read<TimelineProvider>().importMediaFile(
            path,
            type: TrackType.audio,
            title: name,
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final timeline = context.watch<TimelineProvider>();
    final pxPerMs = (basePixelsPerSecond * timeline.zoomLevel) / 1000.0;
    final totalWidth = (timeline.totalDurationMs * pxPerMs + 300).clamp(MediaQuery.of(context).size.width, 100000.0);

    return Container(
      color: const Color(0xFF0F0F16),
      child: Column(
        children: [
          // Timeline Controls Bar
          Container(
            height: 44,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: const BoxDecoration(
              color: Color(0xFF161622),
              border: Border(bottom: BorderSide(color: Colors.white10, width: 0.5)),
            ),
            child: Row(
              children: [
                IconButton(
                  onPressed: () => timeline.setPlaying(!timeline.isPlaying),
                  icon: Icon(
                    timeline.isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                    color: AppColors.primary,
                    size: 24,
                  ),
                ),
                IconButton(
                  onPressed: timeline.canUndo ? () => timeline.undo() : null,
                  icon: Icon(Icons.undo_rounded, size: 18, color: timeline.canUndo ? Colors.white : Colors.white24),
                ),
                IconButton(
                  onPressed: timeline.canRedo ? () => timeline.redo() : null,
                  icon: Icon(Icons.redo_rounded, size: 18, color: timeline.canRedo ? Colors.white : Colors.white24),
                ),
                const Spacer(),
                // Split Tool Shortcut Button
                if (timeline.selectedItem != null)
                  ElevatedButton.icon(
                    onPressed: () => timeline.splitSelectedItem(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary.withOpacity(0.2),
                      foregroundColor: AppColors.primary,
                      elevation: 0,
                      side: const BorderSide(color: AppColors.primary, width: 1),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                    icon: const Icon(Icons.content_cut_rounded, size: 13),
                    label: const Text('Split', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),
          ),

          // Scrollable Multi-Track Lanes with Center Playhead
          Expanded(
            child: GestureDetector(
              onHorizontalDragUpdate: (details) {
                final newOffset = _scrollController.offset - details.delta.dx;
                _scrollController.jumpTo(newOffset.clamp(0.0, _scrollController.position.maxScrollExtent));
                final currentMs = ((_scrollController.offset + 100) / pxPerMs).round();
                timeline.seekTo(currentMs);
              },
              child: Stack(
                children: [
                  SingleChildScrollView(
                    controller: _scrollController,
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    child: SizedBox(
                      width: totalWidth,
                      child: SingleChildScrollView(
                        physics: const BouncingScrollPhysics(),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Time Ruler
                            _buildTimeRuler(timeline, pxPerMs, totalWidth),
                            const SizedBox(height: 4),

                            // Track 1: Video Lane
                            _buildTrackLane(
                              context: context,
                              timeline: timeline,
                              type: TrackType.video,
                              title: 'Video Track',
                              icon: Icons.videocam_rounded,
                              color: const Color(0xFF00E5FF),
                              pxPerMs: pxPerMs,
                              onAdd: () => _importVideo(context),
                            ),

                            const SizedBox(height: 6),

                            // Track 2: Overlay / PIP Lane
                            _buildTrackLane(
                              context: context,
                              timeline: timeline,
                              type: TrackType.overlay,
                              title: 'Overlay / PIP',
                              icon: Icons.layers_rounded,
                              color: const Color(0xFF00B0FF),
                              pxPerMs: pxPerMs,
                            ),

                            const SizedBox(height: 6),

                            // Track 3: Audio / Voice Lane
                            _buildTrackLane(
                              context: context,
                              timeline: timeline,
                              type: TrackType.audio,
                              title: 'Audio / Voice',
                              icon: Icons.music_note_rounded,
                              color: const Color(0xFF00E676),
                              pxPerMs: pxPerMs,
                              onAdd: () => _importAudio(context),
                            ),

                            const SizedBox(height: 6),

                            // Track 4: Text Lane
                            _buildTrackLane(
                              context: context,
                              timeline: timeline,
                              type: TrackType.text,
                              title: 'Text & Titles',
                              icon: Icons.title_rounded,
                              color: const Color(0xFFFFD600),
                              pxPerMs: pxPerMs,
                            ),

                            const SizedBox(height: 6),

                            // Track 5: Effects Lane
                            _buildTrackLane(
                              context: context,
                              timeline: timeline,
                              type: TrackType.effect,
                              title: 'Effects',
                              icon: Icons.auto_awesome_rounded,
                              color: const Color(0xFFFF4081),
                              pxPerMs: pxPerMs,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Center/Draggable Playhead Indicator Line
                  Positioned(
                    left: 100,
                    top: 0,
                    bottom: 0,
                    child: IgnorePointer(
                      child: Container(
                        width: 2,
                        color: Colors.white,
                        child: Align(
                          alignment: Alignment.topCenter,
                          child: Container(
                            width: 10,
                            height: 10,
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
          ),
        ],
      ),
    );
  }

  Widget _buildTimeRuler(TimelineProvider timeline, double pxPerMs, double totalWidth) {
    const tickIntervalMs = 1000;
    final totalTicks = (timeline.totalDurationMs ~/ tickIntervalMs) + 5;

    return Container(
      height: 20,
      color: const Color(0xFF14141E),
      child: Stack(
        children: List.generate(totalTicks, (i) {
          final pos = (i * tickIntervalMs) * pxPerMs;
          return Positioned(
            left: pos,
            top: 0,
            bottom: 0,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(width: 1, height: i % 5 == 0 ? 14 : 6, color: Colors.white24),
                if (i % 5 == 0)
                  Padding(
                    padding: const EdgeInsets.only(left: 3, bottom: 2),
                    child: Text(
                      '${i}s',
                      style: const TextStyle(color: Colors.white38, fontSize: 8, fontFamily: 'monospace'),
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
    required BuildContext context,
    required TimelineProvider timeline,
    required TrackType type,
    required String title,
    required IconData icon,
    required Color color,
    required double pxPerMs,
    VoidCallback? onAdd,
  }) {
    final items = timeline.tracks.where((t) => t.type == type).toList();

    return Container(
      height: 48,
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF181826),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.white10, width: 0.5),
      ),
      child: Stack(
        children: [
          // Empty State Add Button
          if (items.isEmpty && onAdd != null)
            Positioned.fill(
              child: GestureDetector(
                onTap: onAdd,
                child: Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.add_circle_outline_rounded, size: 14, color: color),
                      const SizedBox(width: 6),
                      Text('+ Add $title', style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
            ),

          // Track Clip Items
          ...items.map((item) {
            final isSelected = timeline.selectedItem?.id == item.id;
            final leftPos = item.startTimeMs * pxPerMs;
            final width = (item.durationMs * pxPerMs).clamp(48.0, 10000.0);

            return Positioned(
              left: leftPos,
              top: 3,
              bottom: 3,
              width: width,
              child: GestureDetector(
                onTap: () => timeline.selectItem(item),
                child: Container(
                  decoration: BoxDecoration(
                    color: isSelected ? color : color.withOpacity(0.8),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                      color: isSelected ? Colors.white : Colors.transparent,
                      width: isSelected ? 2 : 0,
                    ),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: Row(
                    children: [
                      Icon(icon, size: 12, color: Colors.black87),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          item.textContent ?? item.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.black87, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                      if (item.speed != 1.0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(color: Colors.black45, borderRadius: BorderRadius.circular(3)),
                          child: Text('${item.speed}x', style: const TextStyle(color: Colors.white, fontSize: 8)),
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
