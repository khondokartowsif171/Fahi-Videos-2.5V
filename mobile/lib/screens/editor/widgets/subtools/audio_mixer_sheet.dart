import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../../../../config/theme_colors.dart';
import '../../../../models/track_item.dart';
import '../../../../providers/timeline_provider.dart';

class AudioMixerSheet extends StatefulWidget {
  final TrackItem? item;
  const AudioMixerSheet({super.key, this.item});

  @override
  State<AudioMixerSheet> createState() => _AudioMixerSheetState();
}

class _AudioMixerSheetState extends State<AudioMixerSheet> {
  late double _volume;

  final List<Map<String, dynamic>> _soundtrackPresets = [
    {'title': 'Epic Cyberpunk Beat', 'genre': 'Synthwave', 'duration': '0:15'},
    {'title': 'Cinematic Trailer Rise', 'genre': 'Orchestral', 'duration': '0:20'},
    {'title': 'Lofi Sunset Chill', 'genre': 'Lofi', 'duration': '0:30'},
    {'title': 'Deep Ambient Atmosphere', 'genre': 'Ambient', 'duration': '0:25'},
  ];

  @override
  void initState() {
    super.initState();
    _volume = widget.item?.volume ?? 1.0;
  }

  @override
  Widget build(BuildContext context) {
    final timeline = context.read<TimelineProvider>();
    final targetItem = widget.item ?? timeline.audioTracks.firstOrNull;

    return Container(
      height: 420,
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
              const Text('Audio & Voiceover Mixer', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: Colors.white60, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Volume Adjustment Slider
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Track Volume', style: TextStyle(color: Colors.white70, fontSize: 13)),
              Text('${(_volume * 100).toInt()}%', style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.bold)),
            ],
          ),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: AppColors.success,
              thumbColor: AppColors.success,
            ),
            child: Slider(
              value: _volume,
              min: 0.0,
              max: 2.0,
              divisions: 40,
              onChanged: (val) {
                setState(() => _volume = val);
                if (targetItem != null) {
                  targetItem.volume = val;
                  timeline.updateTrackItem(targetItem);
                }
              },
            ),
          ),

          const SizedBox(height: 12),
          const Text('Royalty-Free BGM Library', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),

          Expanded(
            child: ListView.separated(
              itemCount: _soundtrackPresets.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (ctx, i) {
                final track = _soundtrackPresets[i];
                return Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.success.withOpacity(0.2),
                        ),
                        child: const Icon(Icons.music_note_rounded, color: AppColors.success, size: 18),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(track['title'], style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                            Text('${track['genre']} • ${track['duration']}', style: const TextStyle(color: Colors.white38, fontSize: 10)),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          final newAudio = TrackItem(
                            id: const Uuid().v4(),
                            type: TrackType.audio,
                            title: track['title'],
                            startTimeMs: timeline.currentTimeMs,
                            durationMs: 15000,
                            volume: 0.8,
                          );
                          timeline.addTrackItem(newAudio);
                          Navigator.pop(context);
                        },
                        icon: const Icon(Icons.add_circle_outline_rounded, color: AppColors.primary, size: 22),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
