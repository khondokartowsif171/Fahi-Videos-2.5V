import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../../../../config/theme_colors.dart';
import '../../../../models/track_item.dart';
import '../../../../providers/timeline_provider.dart';

class SfxLibrarySheet extends StatelessWidget {
  const SfxLibrarySheet({super.key});

  static const List<Map<String, dynamic>> sfxList = [
    {'name': 'Whoosh Transition', 'category': 'Transition', 'durationMs': 800, 'icon': Icons.air_rounded},
    {'name': 'Cinematic Impact Boom', 'category': 'Cinematic', 'durationMs': 2500, 'icon': Icons.blur_on_rounded},
    {'name': 'Camera Shutter Snap', 'category': 'Action', 'durationMs': 600, 'icon': Icons.camera_alt_rounded},
    {'name': 'Meme Vine Boom', 'category': 'Meme', 'durationMs': 1200, 'icon': Icons.notifications_active_rounded},
    {'name': 'Mouse Click Pop', 'category': 'UI', 'durationMs': 300, 'icon': Icons.touch_app_rounded},
    {'name': 'Fast Glitch Static', 'category': 'Glitch', 'durationMs': 1000, 'icon': Icons.graphic_eq_rounded},
    {'name': 'Funny Cartoon Boing', 'category': 'Funny', 'durationMs': 900, 'icon': Icons.sports_basketball_rounded},
    {'name': 'Riser Tension Swell', 'category': 'Cinematic', 'durationMs': 4000, 'icon': Icons.trending_up_rounded},
  ];

  @override
  Widget build(BuildContext context) {
    final timeline = context.watch<TimelineProvider>();

    return Container(
      height: 400,
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
                const Text('CapCut Sound Effects (SFX)', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white70),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // SFX List
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: sfxList.length,
              separatorBuilder: (_, __) => const Divider(color: Colors.white10, height: 1),
              itemBuilder: (ctx, i) {
                final sfx = sfxList[i];
                final durationSec = ((sfx['durationMs'] as int) / 1000).toStringAsFixed(1);

                return ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(sfx['icon'] as IconData, color: AppColors.primary, size: 20),
                  ),
                  title: Text(sfx['name'] as String, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                  subtitle: Text('${sfx['category']} • ${durationSec}s', style: const TextStyle(color: Colors.white38, fontSize: 11)),
                  trailing: ElevatedButton(
                    onPressed: () {
                      final item = TrackItem(
                        id: const Uuid().v4(),
                        type: TrackType.audio,
                        title: sfx['name'] as String,
                        startTimeMs: timeline.currentTimeMs,
                        durationMs: sfx['durationMs'] as int,
                        volume: 1.0,
                      );
                      timeline.addTrackItem(item);
                      Navigator.pop(context);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.black,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                    child: const Text('Add', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
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
