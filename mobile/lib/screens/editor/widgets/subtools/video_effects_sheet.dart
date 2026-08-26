import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../../../../config/theme_colors.dart';
import '../../../../models/track_item.dart';
import '../../../../providers/timeline_provider.dart';

class VideoEffectsSheet extends StatelessWidget {
  const VideoEffectsSheet({super.key});

  static const List<Map<String, dynamic>> effectPresets = [
    {'id': 'fx_edge_glow', 'name': 'Edge Glow', 'cat': 'Trending', 'icon': Icons.flare_rounded, 'color': Color(0xFF00E5FF)},
    {'id': 'fx_cyber_glitch', 'name': 'Cyber Glitch', 'cat': 'Glitch', 'icon': Icons.broken_image_rounded, 'color': Color(0xFFFF0055)},
    {'id': 'fx_diamond_blur', 'name': 'Diamond Blur', 'cat': 'Blur', 'icon': Icons.blur_on_rounded, 'color': Color(0xFF7C4DFF)},
    {'id': 'fx_camera_shake', 'name': 'Camera Shake', 'cat': 'Motion', 'icon': Icons.vibration_rounded, 'color': Color(0xFFFF9100)},
    {'id': 'fx_flash_white', 'name': 'Flash White', 'cat': 'Light', 'icon': Icons.flash_on_rounded, 'color': Color(0xFFFFEA00)},
    {'id': 'fx_rgb_split', 'name': 'RGB Split', 'cat': 'Glitch', 'icon': Icons.view_column_rounded, 'color': Color(0xFF00E676)},
    {'id': 'fx_vhs_retro', 'name': 'VHS Tape', 'cat': 'Retro', 'icon': Icons.videocam_rounded, 'color': Color(0xFFE040FB)},
    {'id': 'fx_fire_aura', 'name': 'Fire Aura', 'cat': 'Body FX', 'icon': Icons.local_fire_department_rounded, 'color': Color(0xFFFF3D00)},
  ];

  @override
  Widget build(BuildContext context) {
    final timeline = context.read<TimelineProvider>();

    return Container(
      height: 400,
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
              const Text('Video & Body Effects (CapCut)', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: Colors.white60, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 12),

          Expanded(
            child: GridView.builder(
              itemCount: effectPresets.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 0.85,
              ),
              itemBuilder: (ctx, i) {
                final fx = effectPresets[i];
                final color = fx['color'] as Color;

                return GestureDetector(
                  onTap: () {
                    final newFxItem = TrackItem(
                      id: const Uuid().v4(),
                      type: TrackType.effect,
                      title: fx['name'] as String,
                      startTimeMs: timeline.currentTimeMs,
                      durationMs: 3000,
                    );
                    timeline.addTrackItem(newFxItem);
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('✨ Added ${fx['name']} to Effects track!'), backgroundColor: color),
                    );
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: color.withOpacity(0.15),
                          ),
                          child: Icon(fx['icon'] as IconData, color: color, size: 22),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          fx['name'] as String,
                          textAlign: TextAlign.center,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
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
