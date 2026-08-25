import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../../config/theme_colors.dart';
import '../../../../models/track_item.dart';
import '../../../../providers/timeline_provider.dart';

class PipOverlaySheet extends StatelessWidget {
  const PipOverlaySheet({super.key});

  static const List<Map<String, dynamic>> blendModes = [
    {'name': 'Normal', 'mode': BlendMode.srcOver},
    {'name': 'Screen', 'mode': BlendMode.screen},
    {'name': 'Multiply', 'mode': BlendMode.multiply},
    {'name': 'Overlay', 'mode': BlendMode.overlay},
    {'name': 'Darken', 'mode': BlendMode.darken},
    {'name': 'Lighten', 'mode': BlendMode.lighten},
  ];

  Future<void> _addOverlayClip(BuildContext context) async {
    final picker = ImagePicker();
    final picked = await picker.pickVideo(source: ImageSource.gallery);
    if (picked != null && context.mounted) {
      await context.read<TimelineProvider>().importMediaFile(
            picked.path,
            type: TrackType.overlay,
            title: 'PIP: ${picked.name}',
          );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final timeline = context.watch<TimelineProvider>();
    final selectedItem = timeline.selectedItem;

    return Container(
      height: 360,
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
                const Text('Overlay / Picture-in-Picture (PIP)', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white70),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Add Overlay Button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: ElevatedButton.icon(
              onPressed: () => _addOverlayClip(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.black,
                minimumSize: const Size(double.infinity, 44),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: const Icon(Icons.add_to_photos_rounded, size: 20),
              label: const Text('Add Overlay from Gallery', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),

          const SizedBox(height: 12),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text('Blend Modes', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold)),
            ),
          ),
          const SizedBox(height: 8),

          // Blend Mode Grid
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 2.2,
              ),
              itemCount: blendModes.length,
              itemBuilder: (ctx, i) {
                final bm = blendModes[i];
                final mode = bm['mode'] as BlendMode;
                final isSelected = selectedItem?.blendMode == mode;

                return GestureDetector(
                  onTap: () {
                    if (selectedItem != null) {
                      selectedItem.blendMode = mode;
                      timeline.updateTrackItem(selectedItem);
                    }
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary.withOpacity(0.2) : AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: isSelected ? AppColors.primary : Colors.white10, width: 1.5),
                    ),
                    child: Center(
                      child: Text(
                        bm['name'] as String,
                        style: TextStyle(
                          color: isSelected ? AppColors.primary : Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
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
