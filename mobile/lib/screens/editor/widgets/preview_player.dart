import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
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
  String? _loadedSourcePath;

  @override
  void initState() {
    super.initState();
    _checkAndInitVideo();
  }

  void _checkAndInitVideo() {
    final timeline = context.read<TimelineProvider>();
    final mainVideo = timeline.videoTracks.firstOrNull;

    if (mainVideo?.sourcePath != null && mainVideo!.sourcePath != _loadedSourcePath) {
      _controller?.dispose();
      _loadedSourcePath = mainVideo.sourcePath!;

      final path = _loadedSourcePath!;
      if (path.startsWith('http')) {
        _controller = VideoPlayerController.networkUrl(Uri.parse(path));
      } else if (File(path).existsSync()) {
        _controller = VideoPlayerController.file(File(path));
      }

      _controller?.initialize().then((_) {
        if (mounted) {
          setState(() {});
          _controller?.addListener(_onVideoProgress);
        }
      });
    }
  }

  void _onVideoProgress() {
    if (_controller != null && _controller!.value.isPlaying && mounted) {
      final posMs = _controller!.value.position.inMilliseconds;
      context.read<TimelineProvider>().seekTo(posMs);
    }
  }

  @override
  void dispose() {
    _controller?.removeListener(_onVideoProgress);
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

  Future<void> _pickVideoFromGallery() async {
    final picker = ImagePicker();
    final picked = await picker.pickVideo(source: ImageSource.gallery);
    if (picked != null && mounted) {
      await context.read<TimelineProvider>().importMediaFile(picked.path, type: TrackType.video, title: picked.name);
      _checkAndInitVideo();
    }
  }

  @override
  Widget build(BuildContext context) {
    final editorState = context.watch<EditorStateProvider>();
    final timeline = context.watch<TimelineProvider>();
    final captionProvider = context.watch<CaptionProvider>();
    final keyframeProvider = context.watch<KeyframeProvider>();

    final mainVideo = timeline.videoTracks.firstOrNull;
    if (mainVideo?.sourcePath != _loadedSourcePath) {
      _checkAndInitVideo();
    }

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
                      GestureDetector(
                        onTap: _pickVideoFromGallery,
                        child: Container(
                          color: const Color(0xFF14141E),
                          child: Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 56,
                                  height: 56,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: AppColors.primary.withOpacity(0.15),
                                    border: Border.all(color: AppColors.primary, width: 1.5),
                                  ),
                                  child: const Icon(Icons.add_photo_alternate_rounded, size: 28, color: AppColors.primary),
                                ),
                                const SizedBox(height: 12),
                                const Text('Tap to Import Video / Photo', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 4),
                                const Text('Select from phone gallery', style: TextStyle(color: Colors.white38, fontSize: 11)),
                              ],
                            ),
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
          if (!timeline.isPlaying && _controller != null && _controller!.value.isInitialized)
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
