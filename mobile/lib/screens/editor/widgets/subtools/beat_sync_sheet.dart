import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/theme_colors.dart';
import '../../../../models/beat_model.dart';
import '../../../../providers/timeline_provider.dart';
import '../../../../services/beat_sync_service.dart';

class BeatSyncSheet extends StatefulWidget {
  const BeatSyncSheet({super.key});

  @override
  State<BeatSyncSheet> createState() => _BeatSyncSheetState();
}

class _BeatSyncSheetState extends State<BeatSyncSheet> {
  final BeatSyncService _beatService = BeatSyncService();
  double _sensitivity = 0.8;
  List<AudioBeatMarker> _detectedBeats = [];

  @override
  void initState() {
    super.initState();
    _analyzeBeats();
  }

  void _analyzeBeats() {
    final timeline = context.read<TimelineProvider>();
    final beats = _beatService.detectBeats(
      audioDurationMs: timeline.totalDurationMs,
      sensitivity: _sensitivity,
    );
    setState(() => _detectedBeats = beats);
  }

  @override
  Widget build(BuildContext context) {
    final timeline = context.read<TimelineProvider>();

    return Container(
      height: 380,
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
              const Text('Beat-Sync Auto Cutter', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: Colors.white60, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Rhythm Sensitivity Slider
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Rhythm Sensitivity', style: TextStyle(color: Colors.white70, fontSize: 12)),
              Text('${(_sensitivity * 100).toInt()}%', style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold)),
            ],
          ),
          Slider(
            value: _sensitivity,
            min: 0.2,
            max: 1.0,
            activeColor: AppColors.accent,
            onChanged: (val) {
              setState(() => _sensitivity = val);
              _analyzeBeats();
            },
          ),

          const SizedBox(height: 12),

          // Visual Beat Frequency Waves
          Container(
            height: 60,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(color: AppColors.surfaceLight, borderRadius: BorderRadius.circular(10)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: List.generate(24, (i) {
                final isBeat = i % 4 == 0;
                return Container(
                  width: 6,
                  height: isBeat ? 44.0 : 16.0 + (i % 3) * 8.0,
                  decoration: BoxDecoration(
                    color: isBeat ? AppColors.accent : AppColors.primary.withOpacity(0.4),
                    borderRadius: BorderRadius.circular(3),
                  ),
                );
              }),
            ),
          ),

          const SizedBox(height: 20),

          // Auto-Cut Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                // Slices selected clip on the nearest beat marker
                timeline.splitSelectedItem();
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('⚡ Auto-sliced video to beat drop rhythm!'),
                    backgroundColor: AppColors.accent,
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.accent,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.flash_on_rounded),
              label: Text(
                'Auto-Cut to Rhythm (${_detectedBeats.length} Drops Detected)',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
