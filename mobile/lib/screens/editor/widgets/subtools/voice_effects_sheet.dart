import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/theme_colors.dart';
import '../../../../models/voice_effect_model.dart';
import '../../../../providers/timeline_provider.dart';

import '../../../../models/track_item.dart';

class VoiceEffectsSheet extends StatelessWidget {
  final TrackItem? item;
  const VoiceEffectsSheet({super.key, this.item});

  @override
  Widget build(BuildContext context) {
    final timeline = context.watch<TimelineProvider>();
    final selectedItem = item ?? timeline.selectedItem ?? timeline.videoTracks.firstOrNull;

    return Container(
      height: 380,
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
                const Text('Voice Effects & Audio Enhancer', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white70),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Noise Reduction Toggle Bar
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.noise_control_off_rounded, color: AppColors.primary, size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text('AI Noise Reduction', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                      Text('Removes hum, hiss & background noise', style: TextStyle(color: Colors.white38, fontSize: 10)),
                    ],
                  ),
                ),
                Switch(
                  value: selectedItem?.isNoiseReductionActive ?? false,
                  activeColor: AppColors.primary,
                  onChanged: (val) {
                    if (selectedItem != null) {
                      selectedItem.isNoiseReductionActive = val;
                      timeline.updateTrackItem(selectedItem);
                    }
                  },
                ),
              ],
            ),
          ),

          // Voice Changer Presets Grid
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 0.9,
              ),
              itemCount: VoiceEffectPreset.presets.length,
              itemBuilder: (ctx, i) {
                final preset = VoiceEffectPreset.presets[i];
                final isApplied = (selectedItem?.voiceEffect?.id ?? 'none') == preset.id;

                return GestureDetector(
                  onTap: () {
                    if (selectedItem != null) {
                      selectedItem.voiceEffect = preset.id == 'none' ? null : preset;
                      timeline.updateTrackItem(selectedItem);
                    }
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      color: isApplied ? AppColors.primary.withOpacity(0.2) : AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isApplied ? AppColors.primary : Colors.transparent,
                        width: 2,
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(preset.icon, color: isApplied ? AppColors.primary : Colors.white, size: 24),
                        const SizedBox(height: 6),
                        Text(
                          preset.name,
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: isApplied ? AppColors.primary : Colors.white70,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
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
