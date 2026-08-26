import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../config/theme_colors.dart';
import '../../../models/track_item.dart';
import '../../../providers/timeline_provider.dart';
import 'subtools/audio_mixer_sheet.dart';
import 'subtools/beat_sync_sheet.dart';
import 'subtools/canvas_ratio_sheet.dart';
import 'subtools/captions_sheet.dart';
import 'subtools/chroma_key_sheet.dart';
import 'subtools/clip_animations_sheet.dart';
import 'subtools/color_grading_sheet.dart';
import 'subtools/filters_effects_sheet.dart';
import 'subtools/pip_overlay_sheet.dart';
import 'subtools/sfx_library_sheet.dart';
import 'subtools/speed_curves_sheet.dart';
import 'subtools/text_sticker_sheet.dart';
import 'subtools/transitions_sheet.dart';
import 'subtools/voice_effects_sheet.dart';

class ToolbarBottom extends StatelessWidget {
  const ToolbarBottom({super.key});

  void _openSheet(BuildContext context, Widget sheet) {
    final timeline = context.read<TimelineProvider>();
    // Auto-select main video clip if none is selected
    if (timeline.selectedItem == null && timeline.videoTracks.isNotEmpty) {
      timeline.selectItem(timeline.videoTracks.first);
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => sheet,
    );
  }

  Future<void> _handleToolWithClip(BuildContext context, Widget sheet) async {
    final timeline = context.read<TimelineProvider>();
    if (timeline.tracks.isEmpty) {
      // Prompt user to import video first
      final picker = ImagePicker();
      final picked = await picker.pickVideo(source: ImageSource.gallery);
      if (picked != null && context.mounted) {
        await timeline.importMediaFile(picked.path, type: TrackType.video, title: picked.name);
        if (context.mounted) _openSheet(context, sheet);
      }
      return;
    }

    if (timeline.selectedItem == null && timeline.videoTracks.isNotEmpty) {
      timeline.selectItem(timeline.videoTracks.first);
    }

    if (context.mounted) _openSheet(context, sheet);
  }

  @override
  Widget build(BuildContext context) {
    final timeline = context.watch<TimelineProvider>();
    final hasClips = timeline.tracks.isNotEmpty;

    return Container(
      height: 74,
      decoration: const BoxDecoration(
        color: Color(0xFF12121B),
        border: Border(top: BorderSide(color: Colors.white10, width: 0.5)),
      ),
      child: ListView(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        children: [
          // 1. Split Clip
          _buildToolItem(
            icon: Icons.content_cut_rounded,
            label: 'Split',
            color: const Color(0xFF00E5FF),
            enabled: hasClips,
            onTap: () {
              if (timeline.selectedItem == null && timeline.videoTracks.isNotEmpty) {
                timeline.selectItem(timeline.videoTracks.first);
              }
              timeline.splitSelectedItem();
            },
          ),

          // 2. Velocity Speed Curves & Normal Speed
          _buildToolItem(
            icon: Icons.speed_rounded,
            label: 'Speed',
            color: const Color(0xFFFF9100),
            enabled: true,
            onTap: () => _handleToolWithClip(context, const SpeedCurvesSheet()),
          ),

          // 3. Animations (In / Out / Combo)
          _buildToolItem(
            icon: Icons.animation_rounded,
            label: 'Animation',
            color: const Color(0xFFFF4081),
            enabled: true,
            onTap: () => _handleToolWithClip(context, const ClipAnimationsSheet()),
          ),

          // 4. Transitions (3D / Glitch / Zoom)
          _buildToolItem(
            icon: Icons.auto_awesome_motion_rounded,
            label: 'Transitions',
            color: const Color(0xFF7C4DFF),
            enabled: true,
            onTap: () => _handleToolWithClip(context, const TransitionsSheet()),
          ),

          // 5. Adjustments & Color Grading
          _buildToolItem(
            icon: Icons.tune_rounded,
            label: 'Adjust',
            color: const Color(0xFFFFD600),
            enabled: true,
            onTap: () => _handleToolWithClip(context, const ColorGradingSheet()),
          ),

          // 6. Color Filters & LUTs
          _buildToolItem(
            icon: Icons.filter_vintage_rounded,
            label: 'Filters',
            color: const Color(0xFF00E676),
            enabled: true,
            onTap: () => _handleToolWithClip(context, const FiltersEffectsSheet()),
          ),

          // 7. Chroma Key (Green Screen)
          _buildToolItem(
            icon: Icons.auto_fix_high_rounded,
            label: 'Chroma Key',
            color: const Color(0xFF76FF03),
            enabled: true,
            onTap: () => _handleToolWithClip(context, const ChromaKeySheet()),
          ),

          // 8. Text & Titles
          _buildToolItem(
            icon: Icons.title_rounded,
            label: 'Text',
            color: const Color(0xFFFFEA00),
            enabled: true,
            onTap: () => _openSheet(context, const TextStickerSheet()),
          ),

          // 9. Overlay / PIP
          _buildToolItem(
            icon: Icons.layers_rounded,
            label: 'Overlay',
            color: const Color(0xFF00B0FF),
            enabled: true,
            onTap: () => _openSheet(context, const PipOverlaySheet()),
          ),

          // 10. Voice FX & AI Noise Reduction
          _buildToolItem(
            icon: Icons.record_voice_over_rounded,
            label: 'Voice FX',
            color: const Color(0xFF00E676),
            enabled: true,
            onTap: () => _handleToolWithClip(context, const VoiceEffectsSheet()),
          ),

          // 11. Audio Mixer & Music
          _buildToolItem(
            icon: Icons.multitrack_audio_rounded,
            label: 'Audio',
            color: const Color(0xFF69F0AE),
            enabled: true,
            onTap: () => _openSheet(context, const AudioMixerSheet()),
          ),

          // 12. Sound Effects Library (SFX)
          _buildToolItem(
            icon: Icons.music_note_rounded,
            label: 'SFX Audio',
            color: const Color(0xFF00E5FF),
            enabled: true,
            onTap: () => _openSheet(context, const SfxLibrarySheet()),
          ),

          // 13. Canvas Aspect Ratio
          _buildToolItem(
            icon: Icons.aspect_ratio_rounded,
            label: 'Format',
            color: const Color(0xFFE040FB),
            enabled: true,
            onTap: () => _openSheet(context, const CanvasRatioSheet()),
          ),

          // 14. Auto Captions (Alex Hormozi)
          _buildToolItem(
            icon: Icons.subtitles_rounded,
            label: 'Auto Captions',
            color: const Color(0xFFFFD54F),
            enabled: true,
            onTap: () => _openSheet(context, const CaptionsSheet()),
          ),

          // 15. Beat Sync (Auto-Cutter)
          _buildToolItem(
            icon: Icons.graphic_eq_rounded,
            label: 'Beat Sync',
            color: const Color(0xFF651FFF),
            enabled: true,
            onTap: () => _openSheet(context, const BeatSyncSheet()),
          ),

          // 16. Delete Clip
          _buildToolItem(
            icon: Icons.delete_outline_rounded,
            label: 'Delete',
            color: const Color(0xFFFF5252),
            enabled: timeline.selectedItem != null,
            onTap: () {
              if (timeline.selectedItem != null) {
                timeline.removeTrackItem(timeline.selectedItem!.id);
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
