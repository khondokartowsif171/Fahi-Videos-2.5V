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
import 'subtools/clip_animations_sheet.dart';
import 'subtools/color_grading_sheet.dart';
import 'subtools/crop_transform_sheet.dart';
import 'subtools/cutout_sheet.dart';
import 'subtools/filters_effects_sheet.dart';
import 'subtools/pip_overlay_sheet.dart';
import 'subtools/sfx_library_sheet.dart';
import 'subtools/speed_curves_sheet.dart';
import 'subtools/text_sticker_sheet.dart';
import 'subtools/transitions_sheet.dart';
import 'subtools/video_effects_sheet.dart';
import 'subtools/voice_effects_sheet.dart';
import 'subtools/volume_fade_sheet.dart';

class ToolbarBottom extends StatefulWidget {
  const ToolbarBottom({super.key});

  @override
  State<ToolbarBottom> createState() => _ToolbarBottomState();
}

class _ToolbarBottomState extends State<ToolbarBottom> {
  bool _isClipEditMode = false;

  void _openSheet(BuildContext context, Widget sheet) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => sheet,
    );
  }

  Future<void> _handleToolWithTarget(BuildContext context, Widget Function(TrackItem? item) sheetBuilder) async {
    final timeline = context.read<TimelineProvider>();
    if (timeline.tracks.isEmpty) {
      final picker = ImagePicker();
      final picked = await picker.pickVideo(source: ImageSource.gallery);
      if (picked != null && context.mounted) {
        await timeline.importMediaFile(picked.path, type: TrackType.video, title: picked.name);
        if (context.mounted) _openSheet(context, sheetBuilder(timeline.videoTracks.firstOrNull));
      }
      return;
    }

    final target = timeline.selectedItem ?? timeline.videoTracks.firstOrNull;
    if (target != null && timeline.selectedItem == null) {
      timeline.selectItem(target);
    }

    if (context.mounted) _openSheet(context, sheetBuilder(target));
  }

  Future<void> _handleReplaceMedia(BuildContext context) async {
    final timeline = context.read<TimelineProvider>();
    final target = timeline.selectedItem ?? timeline.videoTracks.firstOrNull;
    if (target == null) return;

    final picker = ImagePicker();
    final picked = await picker.pickVideo(source: ImageSource.gallery);
    if (picked != null && context.mounted) {
      timeline.replaceSelectedMedia(picked.path, picked.name);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✅ Clip media replaced successfully!'), backgroundColor: AppColors.primary),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final timeline = context.watch<TimelineProvider>();
    final isClipSelected = timeline.selectedItem != null || _isClipEditMode;

    return Container(
      height: 74,
      decoration: const BoxDecoration(
        color: Color(0xFF101017),
        border: Border(top: BorderSide(color: Colors.white10, width: 0.5)),
      ),
      child: isClipSelected ? _buildClipEditToolbar(context, timeline) : _buildMainMenuToolbar(context, timeline),
    );
  }

  // ==========================================
  // LEVEL 1: CapCut Main Level Toolbar
  // ==========================================
  Widget _buildMainMenuToolbar(BuildContext context, TimelineProvider timeline) {
    return ListView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      children: [
        // 1. Edit (Switches to Clip Edit Mode)
        _buildToolBtn(
          icon: Icons.content_cut_rounded,
          label: 'Edit',
          color: const Color(0xFF00E5FF),
          onTap: () {
            if (timeline.videoTracks.isNotEmpty) {
              timeline.selectItem(timeline.videoTracks.first);
            }
            setState(() => _isClipEditMode = true);
          },
        ),

        // 2. Audio & SFX
        _buildToolBtn(
          icon: Icons.multitrack_audio_rounded,
          label: 'Audio',
          color: const Color(0xFF00E676),
          onTap: () => _openSheet(context, const AudioMixerSheet()),
        ),

        // 3. Text & Subtitles
        _buildToolBtn(
          icon: Icons.title_rounded,
          label: 'Text',
          color: const Color(0xFFFFD600),
          onTap: () => _openSheet(context, const TextStickerSheet()),
        ),

        // 4. Overlay (PIP)
        _buildToolBtn(
          icon: Icons.layers_rounded,
          label: 'Overlay',
          color: const Color(0xFF00B0FF),
          onTap: () => _openSheet(context, const PipOverlaySheet()),
        ),

        // 5. Effects (Video & Body FX)
        _buildToolBtn(
          icon: Icons.auto_awesome_rounded,
          label: 'Effects',
          color: const Color(0xFFFF2A85),
          onTap: () => _openSheet(context, const VideoEffectsSheet()),
        ),

        // 6. Transitions
        _buildToolBtn(
          icon: Icons.auto_awesome_motion_rounded,
          label: 'Transitions',
          color: const Color(0xFF7C4DFF),
          onTap: () => _handleToolWithTarget(context, (item) => TransitionsSheet(item: item)),
        ),

        // 7. Filters & LUTs
        _buildToolBtn(
          icon: Icons.filter_vintage_rounded,
          label: 'Filters',
          color: const Color(0xFF00E676),
          onTap: () => _handleToolWithTarget(context, (item) => FiltersEffectsSheet(item: item)),
        ),

        // 8. Adjust (Color Grading)
        _buildToolBtn(
          icon: Icons.tune_rounded,
          label: 'Adjust',
          color: const Color(0xFFFF9100),
          onTap: () => _handleToolWithTarget(context, (item) => ColorGradingSheet(item: item)),
        ),

        // 9. Format (Canvas Aspect Ratio)
        _buildToolBtn(
          icon: Icons.aspect_ratio_rounded,
          label: 'Ratio',
          color: const Color(0xFFE040FB),
          onTap: () => _openSheet(context, const CanvasRatioSheet()),
        ),

        // 10. Auto Captions (Alex Hormozi)
        _buildToolBtn(
          icon: Icons.subtitles_rounded,
          label: 'Auto Captions',
          color: const Color(0xFFFFD54F),
          onTap: () => _openSheet(context, const CaptionsSheet()),
        ),

        // 11. Beat Sync
        _buildToolBtn(
          icon: Icons.graphic_eq_rounded,
          label: 'Beat Sync',
          color: const Color(0xFF651FFF),
          onTap: () => _openSheet(context, const BeatSyncSheet()),
        ),
      ],
    );
  }

  // ==========================================
  // LEVEL 2: CapCut Clip Edit Toolbar
  // ==========================================
  Widget _buildClipEditToolbar(BuildContext context, TimelineProvider timeline) {
    return ListView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      children: [
        // Back to Main Menu Button
        GestureDetector(
          onTap: () {
            timeline.selectItem(null);
            setState(() => _isClipEditMode = false);
          },
          child: Container(
            margin: const EdgeInsets.only(right: 6),
            padding: const EdgeInsets.symmetric(horizontal: 10),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Colors.white70),
                SizedBox(height: 2),
                Text('Main', style: TextStyle(color: Colors.white70, fontSize: 9, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ),

        // 1. Split
        _buildToolBtn(
          icon: Icons.content_cut_rounded,
          label: 'Split',
          color: const Color(0xFF00E5FF),
          onTap: () => timeline.splitSelectedItem(),
        ),

        // 2. Speed (Curves & Normal)
        _buildToolBtn(
          icon: Icons.speed_rounded,
          label: 'Speed',
          color: const Color(0xFFFF9100),
          onTap: () => _openSheet(context, SpeedCurvesSheet(item: timeline.selectedItem)),
        ),

        // 3. Animation (In / Out / Combo)
        _buildToolBtn(
          icon: Icons.animation_rounded,
          label: 'Animation',
          color: const Color(0xFFFF4081),
          onTap: () => _openSheet(context, ClipAnimationsSheet(item: timeline.selectedItem)),
        ),

        // 4. Cutout & Remove BG
        _buildToolBtn(
          icon: Icons.person_search_rounded,
          label: 'Cutout',
          color: const Color(0xFF76FF03),
          onTap: () => _openSheet(context, CutoutSheet(item: timeline.selectedItem)),
        ),

        // 5. Crop, Rotate & Transform
        _buildToolBtn(
          icon: Icons.crop_rounded,
          label: 'Transform',
          color: const Color(0xFF00E5FF),
          onTap: () => _openSheet(context, CropTransformSheet(item: timeline.selectedItem)),
        ),

        // 6. Volume & Fade
        _buildToolBtn(
          icon: Icons.volume_up_rounded,
          label: 'Volume',
          color: const Color(0xFF00E676),
          onTap: () => _openSheet(context, VolumeFadeSheet(item: timeline.selectedItem)),
        ),

        // 7. Voice FX
        _buildToolBtn(
          icon: Icons.record_voice_over_rounded,
          label: 'Voice FX',
          color: const Color(0xFF00E676),
          onTap: () => _openSheet(context, VoiceEffectsSheet(item: timeline.selectedItem)),
        ),

        // 8. Extract Audio
        _buildToolBtn(
          icon: Icons.audio_file_rounded,
          label: 'Extract Audio',
          color: const Color(0xFFFFB300),
          onTap: () {
            timeline.extractAudioFromSelected();
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('🎵 Audio extracted to dedicated track!'), backgroundColor: AppColors.accent),
            );
          },
        ),

        // 9. Freeze Frame
        _buildToolBtn(
          icon: Icons.ac_unit_rounded,
          label: 'Freeze',
          color: const Color(0xFF80D8FF),
          onTap: () {
            timeline.freezeSelectedAtPlayhead();
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('🧊 3-second Freeze frame created!'), backgroundColor: Color(0xFF80D8FF)),
            );
          },
        ),

        // 10. Reverse Playback
        _buildToolBtn(
          icon: Icons.replay_rounded,
          label: 'Reverse',
          color: const Color(0xFFEA80FC),
          onTap: () {
            timeline.toggleReverseSelected();
            final isRev = timeline.selectedItem?.isReversed ?? false;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(isRev ? '🔁 Reverse playback active!' : '▶️ Normal playback restored'), backgroundColor: const Color(0xFFEA80FC)),
            );
          },
        ),

        // 11. Duplicate / Copy
        _buildToolBtn(
          icon: Icons.copy_rounded,
          label: 'Copy',
          color: const Color(0xFFB388FF),
          onTap: () {
            timeline.duplicateSelectedItem();
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('📑 Clip duplicated on timeline!'), backgroundColor: Color(0xFFB388FF)),
            );
          },
        ),

        // 12. Replace Media
        _buildToolBtn(
          icon: Icons.published_with_changes_rounded,
          label: 'Replace',
          color: const Color(0xFFFFAB40),
          onTap: () => _handleReplaceMedia(context),
        ),

        // 13. Delete
        _buildToolBtn(
          icon: Icons.delete_outline_rounded,
          label: 'Delete',
          color: const Color(0xFFFF5252),
          onTap: () {
            if (timeline.selectedItem != null) {
              timeline.removeTrackItem(timeline.selectedItem!.id);
            }
          },
        ),
      ],
    );
  }

  Widget _buildToolBtn({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          color: Colors.transparent,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 22, color: color),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}
