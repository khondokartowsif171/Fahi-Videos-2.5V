import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../config/theme_colors.dart';
import '../../../models/track_item.dart';
import '../../../providers/timeline_provider.dart';
import 'subtools/beat_sync_sheet.dart';
import 'subtools/captions_sheet.dart';
import 'subtools/chroma_key_sheet.dart';
import 'subtools/clip_animations_sheet.dart';
import 'subtools/color_grading_sheet.dart';
import 'subtools/pip_overlay_sheet.dart';
import 'subtools/sfx_library_sheet.dart';
import 'subtools/speed_curves_sheet.dart';
import 'subtools/transitions_sheet.dart';
import 'subtools/voice_effects_sheet.dart';

class ToolbarBottom extends StatelessWidget {
  const ToolbarBottom({super.key});

  void _openSheet(BuildContext context, Widget sheet) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => sheet,
    );
  }

  @override
  Widget build(BuildContext context) {
    final timeline = context.watch<TimelineProvider>();
    final selectedItem = timeline.selectedItem;

    return Container(
      height: 72,
      decoration: const BoxDecoration(
        color: Color(0xFF12121B),
        border: Border(top: BorderSide(color: Colors.white10, width: 0.5)),
      ),
      child: ListView(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        children: [
          // 1. Split Clip
          _buildToolItem(
            icon: Icons.content_cut_rounded,
            label: 'Split',
            color: const Color(0xFF00E5FF),
            enabled: selectedItem != null,
            onTap: () => timeline.splitSelectedItem(),
          ),

          // 2. Velocity Speed Curves
          _buildToolItem(
            icon: Icons.speed_rounded,
            label: 'Speed',
            color: const Color(0xFFFF9100),
            enabled: selectedItem != null,
            onTap: () => _openSheet(context, const SpeedCurvesSheet()),
          ),

          // 3. Clip Animations (In/Out/Combo)
          _buildToolItem(
            icon: Icons.animation_rounded,
            label: 'Animation',
            color: const Color(0xFFFF4081),
            enabled: selectedItem != null,
            onTap: () => _openSheet(context, const ClipAnimationsSheet()),
          ),

          // 4. Transitions
          _buildToolItem(
            icon: Icons.auto_awesome_motion_rounded,
            label: 'Transitions',
            color: const Color(0xFF7C4DFF),
            enabled: selectedItem != null,
            onTap: () => _openSheet(context, const TransitionsSheet()),
          ),

          // 5. Chroma Key / Green Screen
          _buildToolItem(
            icon: Icons.filter_vintage_rounded,
            label: 'Chroma Key',
            color: const Color(0xFF00E676),
            enabled: selectedItem != null,
            onTap: () => _openSheet(context, const ChromaKeySheet()),
          ),

          // 6. Pro Color Adjustments
          _buildToolItem(
            icon: Icons.tune_rounded,
            label: 'Adjust',
            color: const Color(0xFFFFD600),
            enabled: selectedItem != null,
            onTap: () => _openSheet(context, const ColorGradingSheet()),
          ),

          // 7. Overlay / PIP
          _buildToolItem(
            icon: Icons.layers_rounded,
            label: 'Overlay',
            color: const Color(0xFF00B0FF),
            onTap: () => _openSheet(context, const PipOverlaySheet()),
          ),

          // 8. Auto-Captions (Alex Hormozi)
          _buildToolItem(
            icon: Icons.subtitles_rounded,
            label: 'Auto Captions',
            color: const Color(0xFFFFEA00),
            onTap: () => _openSheet(context, const CaptionsSheet()),
          ),

          // 9. Voice Effects & Noise Reduction
          _buildToolItem(
            icon: Icons.record_voice_over_rounded,
            label: 'Voice FX',
            color: const Color(0xFF00E676),
            enabled: selectedItem != null,
            onTap: () => _openSheet(context, const VoiceEffectsSheet()),
          ),

          // 10. Sound Effects Library (SFX)
          _buildToolItem(
            icon: Icons.music_note_rounded,
            label: 'SFX Audio',
            color: const Color(0xFF00E5FF),
            onTap: () => _openSheet(context, const SfxLibrarySheet()),
          ),

          // 11. Beat-Sync
          _buildToolItem(
            icon: Icons.graphic_eq_rounded,
            label: 'Beat Sync',
            color: const Color(0xFF651FFF),
            onTap: () => _openSheet(context, const BeatSyncSheet()),
          ),

          // 12. Delete Clip
          _buildToolItem(
            icon: Icons.delete_outline_rounded,
            label: 'Delete',
            color: const Color(0xFFFF5252),
            enabled: selectedItem != null,
            onTap: () {
              if (selectedItem != null) {
                timeline.removeTrackItem(selectedItem.id);
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildToolItem({
    required IconData icon,
    required String label,
    required Color color,
    bool enabled = true,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          color: enabled ? Colors.transparent : Colors.white.withOpacity(0.02),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 22,
              color: enabled ? color : Colors.white24,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: enabled ? Colors.white : Colors.white24,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
