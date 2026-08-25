import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import '../../../config/theme_colors.dart';
import '../../../models/caption_model.dart';
import '../../../models/track_item.dart';
import '../../../providers/caption_provider.dart';
import '../../../providers/editor_state_provider.dart';
import '../../../providers/keyframe_provider.dart';
import '../../../providers/timeline_provider.dart';

class PreviewPlayer extends StatefulWidget {
  const PreviewPlayer({super.key});

  @override
  State<PreviewPlayer> createState() => _PreviewPlayerState();
}

class _PreviewPlayerState extends State<PreviewPlayer> {
  VideoPlayerController? _controller;

  @override
  void initState() {
    super.initState();
    _initVideo();
  }

  void _initVideo() {
    final timeline = context.read<TimelineProvider>();
    final mainVideo = timeline.videoTracks.firstOrNull;
    if (mainVideo?.sourcePath != null && mainVideo!.sourcePath!.startsWith('http')) {
      _controller = VideoPlayerController.networkUrl(Uri.parse(mainVideo.sourcePath!))
        ..initialize().then((_) {
          if (mounted) setState(() {});
        });
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  String _formatTime(int ms) {
    final totalSec = ms ~/ 1000;
    final min = totalSec ~/ 60;
    final sec = totalSec % 60;
    final milli = (ms % 1000) ~/ 10;
    return '${min.toString().padLeft(2, '0')}:${sec.toString().padLeft(2, '0')}.${milli.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final editorState = context.watch<EditorStateProvider>();
    final timeline = context.watch<TimelineProvider>();
    final captionProvider = context.watch<CaptionProvider>();
    final keyframeProvider = context.watch<KeyframeProvider>();

    if (_controller != null && _controller!.value.isInitialized) {
      if (timeline.isPlaying && !_controller!.value.isPlaying) {
        _controller!.play();
      } else if (!timeline.isPlaying && _controller!.value.isPlaying) {
        _controller!.pause();
      }
    }

    final activeTexts = timeline.textTracks.where((t) {
      return timeline.currentTimeMs >= t.startTimeMs &&
          timeline.currentTimeMs <= (t.startTimeMs + t.durationMs);
    }).toList();

    // Active AI Auto-Caption segment
    final activeCaption = captionProvider.segments.where((seg) {
      return timeline.currentTimeMs >= seg.startMs && timeline.currentTimeMs <= seg.endMs;
    }).firstOrNull;

    return Container(
      color: Colors.black,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Aspect Ratio Canvas Bounding Box
          Center(
            child: AspectRatio(
              aspectRatio: editorState.aspectRatioValue,
              child: Container(
                decoration: BoxDecoration(
                  color: editorState.canvasBackgroundColor,
                  border: Border.all(color: Colors.white12, width: 1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    // Video Layer with Keyframe Animation Interpolation
                    if (_controller != null && _controller!.value.isInitialized)
                      Builder(builder: (_) {
                        final mainVideo = timeline.videoTracks.firstOrNull;
                        final kfProps = mainVideo != null
                            ? keyframeProvider.interpolateClipProperties(mainVideo, timeline.currentTimeMs)
                            : null;

                        final scale = kfProps?['scale'] ?? 1.0;
                        final rotation = kfProps?['rotation'] ?? 0.0;
                        final opacity = (kfProps?['opacity'] ?? 1.0) as double;

                        return Opacity(
                          opacity: opacity.clamp(0.0, 1.0),
                          child: Transform.rotate(
                            angle: rotation,
                            child: Transform.scale(
                              scale: scale,
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: FittedBox(
                                  fit: BoxFit.cover,
                                  child: SizedBox(
                                    width: _controller!.value.size.width,
                                    height: _controller!.value.size.height,
                                    child: VideoPlayer(_controller!),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      })
                    else
                      Container(
                        color: const Color(0xFF14141E),
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.movie_creation_outlined, size: 48, color: AppColors.primary.withOpacity(0.5)),
                              const SizedBox(height: 8),
                              const Text('Fahi Videos Canvas', style: TextStyle(color: Colors.white54, fontSize: 12)),
                            ],
                          ),
                        ),
                      ),

                    // Active Text Overlays
                    ...activeTexts.map((textItem) {
                      return Center(
                        child: Transform.rotate(
                          angle: textItem.rotation,
                          child: Transform.scale(
                            scale: textItem.scale,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              decoration: BoxDecoration(
                                color: textItem.backgroundColor ?? Colors.transparent,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                textItem.textContent ?? '',
                                textAlign: textItem.textAlign,
                                style: TextStyle(
                                  color: textItem.textColor ?? Colors.white,
                                  fontSize: textItem.fontSize ?? 24,
                                  fontWeight: FontWeight.bold,
                                  shadows: const [
                                    Shadow(color: Colors.black, blurRadius: 8, offset: Offset(2, 2)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    }),

                    // Dynamic Karaoke Auto-Captions Display
                    if (activeCaption != null)
                      Positioned(
                        bottom: 40,
                        left: 16,
                        right: 16,
                        child: Center(
                          child: Wrap(
                            alignment: WrapAlignment.center,
                            spacing: 6,
                            children: activeCaption.words.map((w) {
                              final isWordActive = timeline.currentTimeMs >= w.startMs && timeline.currentTimeMs <= w.endMs;

                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: isWordActive
                                      ? (activeCaption.style == CaptionStylePreset.hormoziYellow
                                          ? AppColors.accent
                                          : AppColors.primary)
                                      : Colors.black45,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  w.word,
                                  style: TextStyle(
                                    color: isWordActive ? Colors.black : Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    shadows: const [
                                      Shadow(color: Colors.black, blurRadius: 4, offset: Offset(1, 1)),
                                    ],
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),

          // Top Info Overlay: Aspect Ratio Badge & Timecode
          Positioned(
            top: 12,
            left: 16,
            right: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white24, width: 0.5),
                  ),
                  child: Text(
                    editorState.aspectRatio.name.replaceAll('ratio', '').replaceAll('_', ':'),
                    style: const TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white24, width: 0.5),
                  ),
                  child: Text(
                    '${_formatTime(timeline.currentTimeMs)} / ${_formatTime(timeline.totalDurationMs)}',
                    style: const TextStyle(color: Colors.white, fontSize: 11, fontFamily: 'monospace', fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),

          // Tap to Play Overlay
          if (!timeline.isPlaying)
            GestureDetector(
              onTap: () => timeline.setPlaying(true),
              child: Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.black.withOpacity(0.6),
                  border: Border.all(color: AppColors.primary, width: 1.5),
                ),
                child: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 34),
              ),
            ),
        ],
      ),
    );
  }
}
