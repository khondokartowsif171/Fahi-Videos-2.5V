import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import '../../../config/color_matrix_helper.dart';
import '../../../config/theme_colors.dart';
import '../../../models/caption_model.dart';
import '../../../models/clip_animation_model.dart';
import '../../../models/track_item.dart';
import '../../../models/transition_model.dart';
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
  double _appliedSpeed = 1.0;
  double _appliedVolume = 1.0;

  @override
  void initState() {
    super.initState();
    _checkAndInitVideo();
  }

  void _checkAndInitVideo() {
    final timeline = context.read<TimelineProvider>();
    final mainVideo = timeline.videoTracks.firstOrNull;

    if (mainVideo?.sourcePath != null && mainVideo!.sourcePath != _loadedSourcePath) {
      _controller?.removeListener(_onVideoProgress);
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
          _applyAudioAndSpeedSettings(mainVideo);
        }
      });
    } else if (mainVideo != null && _controller != null && _controller!.value.isInitialized) {
      _applyAudioAndSpeedSettings(mainVideo);
    }
  }

  void _applyAudioAndSpeedSettings(TrackItem mainVideo) {
    if (_controller == null || !_controller!.value.isInitialized) return;

    if (_appliedSpeed != mainVideo.speed) {
      _appliedSpeed = mainVideo.speed.clamp(0.1, 10.0);
      _controller?.setPlaybackSpeed(_appliedSpeed);
    }

    if (_appliedVolume != mainVideo.volume) {
      _appliedVolume = mainVideo.volume.clamp(0.0, 2.0);
      _controller?.setVolume(_appliedVolume);
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
    } else if (mainVideo != null) {
      _applyAudioAndSpeedSettings(mainVideo);
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

    final activeOverlays = timeline.tracks.where((t) {
      return t.type == TrackType.overlay &&
          timeline.currentTimeMs >= t.startTimeMs &&
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
                    // Main Video Track Layer with Color Matrix, Transitions, Animations & Keyframes
                    if (_controller != null && _controller!.value.isInitialized)
                      Builder(builder: (_) {
                        final currentMs = timeline.currentTimeMs;
                        final kfProps = mainVideo != null
                            ? keyframeProvider.interpolateClipProperties(mainVideo, currentMs)
                            : null;

                        double scale = kfProps?['scale'] ?? 1.0;
                        double rotation = kfProps?['rotation'] ?? 0.0;
                        double opacity = (kfProps?['opacity'] ?? 1.0) as double;
                        Offset position = mainVideo?.position ?? Offset.zero;

                        // 1. In-Animation calculation
                        if (mainVideo?.inAnimation != null) {
                          final inDurationMs = (mainVideo!.inAnimation!.defaultDurationSec * 1000).round();
                          final elapsed = currentMs - mainVideo.startTimeMs;
                          if (elapsed >= 0 && elapsed < inDurationMs) {
                            final progress = (elapsed / inDurationMs).clamp(0.0, 1.0);
                            if (mainVideo.inAnimation!.id == 'in_fade') {
                              opacity *= progress;
                            } else if (mainVideo.inAnimation!.id == 'in_zoom1') {
                              scale *= (0.3 + 0.7 * progress);
                            } else if (mainVideo.inAnimation!.id == 'in_zoom2') {
                              scale *= (1.8 - 0.8 * progress);
                            }
                          }
                        }

                        // 2. Out-Animation calculation
                        if (mainVideo?.outAnimation != null) {
                          final outDurationMs = 500;
                          final remaining = (mainVideo!.startTimeMs + mainVideo.durationMs) - currentMs;
                          if (remaining >= 0 && remaining < outDurationMs) {
                            final progress = (remaining / outDurationMs).clamp(0.0, 1.0);
                            if (mainVideo.outAnimation!.id == 'out_fade') {
                              opacity *= progress;
                            } else if (mainVideo.outAnimation!.id == 'out_zoom') {
                              scale *= (0.2 + 0.8 * progress);
                            }
                          }
                        }

                        // 3. Color Grading & Filter Shader Matrix
                        final matrix = ColorMatrixHelper.generateCombinedMatrix(
                          adjustments: mainVideo?.colorGrading ?? ColorGradingSettings(),
                          filterId: mainVideo?.filterName,
                        );

                        Widget videoContent = ColorFiltered(
                          colorFilter: ColorFilter.matrix(matrix),
                          child: FittedBox(
                            fit: BoxFit.cover,
                            child: SizedBox(
                              width: _controller!.value.size.width,
                              height: _controller!.value.size.height,
                              child: VideoPlayer(_controller!),
                            ),
                          ),
                        );

                        // 4. Chroma Key Blend (if green screen is active)
                        if (mainVideo?.chromaKeyColor != null) {
                          videoContent = ColorFiltered(
                            colorFilter: ColorFilter.mode(
                              mainVideo!.chromaKeyColor!.withOpacity(mainVideo.chromaIntensity),
                              BlendMode.dstOut,
                            ),
                            child: videoContent,
                          );
                        }

                        return Opacity(
                          opacity: opacity.clamp(0.0, 1.0),
                          child: Transform.translate(
                            offset: position,
                            child: Transform.rotate(
                              angle: rotation,
                              child: Transform.scale(
                                scale: scale,
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(4),
                                  child: Stack(
                                    fit: StackFit.expand,
                                    children: [
                                      videoContent,

                                      // Vignette Overlay
                                      if ((mainVideo?.colorGrading.vignette ?? 0.0) > 0.05)
                                        Container(
                                          decoration: BoxDecoration(
                                            gradient: RadialGradient(
                                              radius: 0.85,
                                              colors: [
                                                Colors.transparent,
                                                Colors.black.withOpacity(mainVideo!.colorGrading.vignette.clamp(0.0, 0.9)),
                                              ],
                                            ),
                                          ),
                                        ),

                                      // 5. Transition Overlay (Flash / Fade)
                                      if (mainVideo?.transition != null)
                                        _buildTransitionOverlay(mainVideo!.transition!, currentMs, mainVideo),
                                    ],
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

                    // Active Overlay / PIP Tracks
                    ...activeOverlays.map((overlayItem) {
                      return Positioned(
                        left: overlayItem.position.dx,
                        top: overlayItem.position.dy,
                        child: Transform.rotate(
                          angle: overlayItem.rotation,
                          child: Transform.scale(
                            scale: overlayItem.scale,
                            child: Opacity(
                              opacity: overlayItem.opacity.clamp(0.0, 1.0),
                              child: Container(
                                width: 140,
                                height: 90,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppColors.primary, width: 1),
                                  color: Colors.black87,
                                ),
                                child: Center(
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.layers_rounded, color: AppColors.primary, size: 20),
                                      const SizedBox(height: 4),
                                      Text(overlayItem.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 10)),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    }),

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

  Widget _buildTransitionOverlay(TransitionPreset transition, int currentMs, TrackItem item) {
    final transDurationMs = item.transitionDurationMs;
    final elapsed = currentMs - item.startTimeMs;
    if (elapsed < 0 || elapsed > transDurationMs) return const SizedBox.shrink();

    final progress = (elapsed / transDurationMs).clamp(0.0, 1.0);

    if (transition.id == 'fade_white') {
      return Container(
        color: Colors.white.withOpacity((1.0 - progress).clamp(0.0, 1.0)),
      );
    } else if (transition.id == 'fade_black') {
      return Container(
        color: Colors.black.withOpacity((1.0 - progress).clamp(0.0, 1.0)),
      );
    } else if (transition.id == 'rgb_glitch') {
      return Opacity(
        opacity: (0.8 * (1.0 - progress)).clamp(0.0, 1.0),
        child: Container(
          color: (progress * 10).toInt() % 2 == 0 ? Colors.cyanAccent.withOpacity(0.4) : Colors.magentaAccent.withOpacity(0.4),
        ),
      );
    }

    return const SizedBox.shrink();
  }
}
