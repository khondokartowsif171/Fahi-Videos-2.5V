import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import '../../../config/color_matrix_helper.dart';
import '../../../config/theme_colors.dart';
import '../../../models/caption_model.dart';
import '../../../models/clip_animation_model.dart';
import '../../../models/color_grading_model.dart';
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
  int _lastThrottledMs = -1;

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

    final timeline = context.read<TimelineProvider>();
    final effectiveVolume = timeline.isGlobalMuted ? 0.0 : mainVideo.volume.clamp(0.0, 2.0);
    if (_appliedVolume != effectiveVolume) {
      _appliedVolume = effectiveVolume;
      _controller?.setVolume(_appliedVolume);
    }
  }

  void _onVideoProgress() {
    if (_controller != null && _controller!.value.isInitialized && mounted) {
      final posMs = _controller!.value.position.inMilliseconds;
      final durMs = _controller!.value.duration.inMilliseconds;

      // Auto-pause when reaching end of video
      if (durMs > 0 && posMs >= durMs && _controller!.value.isPlaying) {
        _controller!.pause();
        context.read<TimelineProvider>().setPlaying(false);
        return;
      }

      if (_controller!.value.isPlaying && (posMs - _lastThrottledMs).abs() >= 100) {
        _lastThrottledMs = posMs;
        context.read<TimelineProvider>().updatePlaybackPosition(posMs);
      }
    }
  }

  void _togglePlayPause() {
    final timeline = context.read<TimelineProvider>();
    if (_controller == null || !_controller!.value.isInitialized) {
      _pickVideoFromGallery();
      return;
    }

    if (_controller!.value.isPlaying) {
      _controller!.pause();
      timeline.setPlaying(false);
    } else {
      if (_controller!.value.position >= _controller!.value.duration) {
        _controller!.seekTo(Duration.zero);
        timeline.seekTo(0);
      }
      _controller!.play();
      timeline.setPlaying(true);
    }
    setState(() {});
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

    final activeCaption = captionProvider.segments.where((seg) {
      return timeline.currentTimeMs >= seg.startMs && timeline.currentTimeMs <= seg.endMs;
    }).firstOrNull;

    return Container(
      color: Colors.black,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: _togglePlayPause,
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
                      // Main Video Track Layer with Live Transforms, Matrix & Effects
                      if (_controller != null && _controller!.value.isInitialized)
                        Builder(builder: (_) {
                          final currentMs = timeline.currentTimeMs;
                          final kfProps = mainVideo != null
                              ? keyframeProvider.interpolateClipProperties(mainVideo, currentMs)
                              : null;

                          double scale = (kfProps?['scale'] ?? (mainVideo?.scale ?? 1.0)) as double;
                          double rotation = (kfProps?['rotation'] ?? (mainVideo?.rotation ?? 0.0)) as double;
                          double opacity = ((kfProps?['opacity'] ?? (mainVideo?.opacity ?? 1.0)) as num).toDouble();
                          Offset position = (kfProps?['position'] ?? (mainVideo?.position ?? Offset.zero)) as Offset;

                          // In-Animation calculation
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

                          // Out-Animation calculation
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

                          // Color Grading & Filter Shader Matrix
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

                          // Crop Ratio Preset
                          if (mainVideo != null && mainVideo.cropAspectRatio > 0.0) {
                            videoContent = Center(
                              child: AspectRatio(
                                aspectRatio: mainVideo.cropAspectRatio,
                                child: videoContent,
                              ),
                            );
                          }

                          // Chroma Key Blend (if green screen is active)
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
                                  scaleX: (mainVideo?.isFlippedHorizontal ?? false) ? -scale : scale,
                                  scaleY: (mainVideo?.isFlippedVertical ?? false) ? -scale : scale,
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

                                        // Transition Overlay (Flash / Fade)
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
                              child: Opacity(
                                opacity: textItem.opacity.clamp(0.0, 1.0),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: textItem.textBackgroundColor,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: Colors.white24),
                                  ),
                                  child: Text(
                                    textItem.textContent ?? 'Sample Text',
                                    style: TextStyle(
                                      fontSize: textItem.fontSize,
                                      color: textItem.textColor,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      }),

                      // Active Alex Hormozi AI Auto-Caption
                      if (activeCaption != null)
                        Positioned(
                          bottom: 40,
                          left: 20,
                          right: 20,
                          child: Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: Colors.black.withOpacity(0.75),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.primary.withOpacity(0.6), width: 1.5),
                              ),
                              child: Text(
                                activeCaption.fullText.toUpperCase(),
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: AppColors.primary,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 1.2,
                                  shadows: [
                                    Shadow(color: Colors.black, blurRadius: 4, offset: Offset(2, 2)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),

            // Top Status Bar: Format Ratio & Timecode
            Positioned(
              top: 12,
              left: 14,
              right: 14,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.6),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: Text(
                      editorState.aspectRatioName,
                      style: const TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.6),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: Text(
                      '${_formatTime(timeline.currentTimeMs)} / ${_formatTime(timeline.totalDurationMs)}',
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.5),
                    ),
                  ),
                ],
              ),
            ),

            // Tap to Play / Pause Center Icon Overlay
            if (!timeline.isPlaying && _controller != null && _controller!.value.isInitialized)
              GestureDetector(
                onTap: _togglePlayPause,
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.black.withOpacity(0.65),
                    border: Border.all(color: AppColors.primary, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.4),
                        blurRadius: 16,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 38),
                ),
              ),
          ],
        ),
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
          color: (progress * 10).toInt() % 2 == 0 ? Colors.cyanAccent.withOpacity(0.4) : Colors.pinkAccent.withOpacity(0.4),
        ),
      );
    }

    return const SizedBox.shrink();
  }
}
