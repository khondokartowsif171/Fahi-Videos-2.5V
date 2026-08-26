import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/theme_colors.dart';
import '../../../../models/track_item.dart';
import '../../../../providers/timeline_provider.dart';

class VolumeFadeSheet extends StatefulWidget {
  final TrackItem? item;
  const VolumeFadeSheet({super.key, this.item});

  @override
  State<VolumeFadeSheet> createState() => _VolumeFadeSheetState();
}

class _VolumeFadeSheetState extends State<VolumeFadeSheet> {
  late double _volume;
  late double _fadeIn;
  late double _fadeOut;
  late bool _noiseReduction;

  @override
  void initState() {
    super.initState();
    final target = widget.item;
    _volume = target?.volume ?? 1.0;
    _fadeIn = target?.fadeInSec ?? 0.0;
    _fadeOut = target?.fadeOutSec ?? 0.0;
    _noiseReduction = target?.isNoiseReductionActive ?? false;
  }

  void _applyChanges(TimelineProvider timeline, TrackItem target) {
    target.volume = _volume;
    target.fadeInSec = _fadeIn;
    target.fadeOutSec = _fadeOut;
    target.isNoiseReductionActive = _noiseReduction;
    timeline.updateTrackItem(target);
  }

  @override
  Widget build(BuildContext context) {
    final timeline = context.read<TimelineProvider>();
    final targetItem = widget.item ?? timeline.selectedItem ?? timeline.videoTracks.firstOrNull;

    return Container(
      height: 440,
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
              const Text('Volume & Fade (CapCut Pro)', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: Colors.white60, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Volume Boost Slider (0 to 1000%)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Volume (0% - 1000%)', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
              Text('${(_volume * 100).toInt()}%', style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 13)),
            ],
          ),
          Slider(
            value: _volume.clamp(0.0, 10.0),
            min: 0.0,
            max: 10.0,
            divisions: 100,
            activeColor: AppColors.success,
            onChanged: (val) {
              setState(() => _volume = val);
              if (targetItem != null) _applyChanges(timeline, targetItem);
            },
          ),

          const SizedBox(height: 12),

          // Fade In Slider
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Fade In Duration', style: TextStyle(color: Colors.white70, fontSize: 12)),
              Text('${_fadeIn.toStringAsFixed(1)}s', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
            ],
          ),
          Slider(
            value: _fadeIn.clamp(0.0, 10.0),
            min: 0.0,
            max: 10.0,
            divisions: 50,
            activeColor: AppColors.primary,
            onChanged: (val) {
              setState(() => _fadeIn = val);
              if (targetItem != null) _applyChanges(timeline, targetItem);
            },
          ),

          const SizedBox(height: 8),

          // Fade Out Slider
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Fade Out Duration', style: TextStyle(color: Colors.white70, fontSize: 12)),
              Text('${_fadeOut.toStringAsFixed(1)}s', style: const TextStyle(color: AppColors.secondary, fontWeight: FontWeight.bold)),
            ],
          ),
          Slider(
            value: _fadeOut.clamp(0.0, 10.0),
            min: 0.0,
            max: 10.0,
            divisions: 50,
            activeColor: AppColors.secondary,
            onChanged: (val) {
              setState(() => _fadeOut = val);
              if (targetItem != null) _applyChanges(timeline, targetItem);
            },
          ),

          const SizedBox(height: 12),

          // AI Noise Reduction Toggle
          GestureDetector(
            onTap: targetItem == null
                ? null
                : () {
                    setState(() => _noiseReduction = !_noiseReduction);
                    _applyChanges(timeline, targetItem);
                  },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: _noiseReduction ? AppColors.success.withOpacity(0.15) : AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _noiseReduction ? AppColors.success : Colors.white12),
              ),
              child: Row(
                children: [
                  Icon(Icons.noise_control_off_rounded, color: _noiseReduction ? AppColors.success : Colors.white60),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('AI Noise Reduction', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                        Text('Removes background hum and wind noise', style: TextStyle(color: Colors.white38, fontSize: 10)),
                      ],
                    ),
                  ),
                  Switch(
                    value: _noiseReduction,
                    activeColor: AppColors.success,
                    onChanged: (val) {
                      setState(() => _noiseReduction = val);
                      if (targetItem != null) _applyChanges(timeline, targetItem);
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
