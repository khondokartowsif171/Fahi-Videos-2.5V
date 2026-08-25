import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../config/theme_colors.dart';
import '../../../providers/editor_state_provider.dart';
import '../../../providers/timeline_provider.dart';
import 'subtools/audio_mixer_sheet.dart';
import 'subtools/beat_sync_sheet.dart';
import 'subtools/captions_sheet.dart';
import 'subtools/filters_effects_sheet.dart';
import 'subtools/speed_curves_sheet.dart';
import 'subtools/speed_ramping_sheet.dart';
import 'subtools/text_sticker_sheet.dart';

class ToolbarBottom extends StatelessWidget {
  const ToolbarBottom({super.key});

  @override
  Widget build(BuildContext context) {
    final timeline = context.watch<TimelineProvider>();
    final editorState = context.watch<EditorStateProvider>();
    final selectedItem = timeline.selectedItem;

    return Container(
      height: 72,
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.surfaceBorder, width: 0.5)),
      ),
      child: selectedItem != null
          ? _buildSelectedClipToolbar(context, timeline)
          : _buildMainMenuToolbar(context, editorState),
    );
  }

  // CapCut Contextual Action Toolbar when a clip is selected
  Widget _buildSelectedClipToolbar(BuildContext context, TimelineProvider timeline) {
    return ListView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      physics: const BouncingScrollPhysics(),
      children: [
        _buildToolBtn(
          icon: Icons.close_rounded,
          label: 'Deselect',
          color: Colors.white60,
          onTap: () => timeline.selectItem(null),
        ),
        _buildToolBtn(
          icon: Icons.content_cut_rounded,
          label: 'Split',
          color: AppColors.primary,
          onTap: () => timeline.splitSelectedItem(),
        ),
        _buildToolBtn(
          icon: Icons.speed_rounded,
          label: 'Speed',
          color: AppColors.accent,
          onTap: () {
            showModalBottomSheet(
              context: context,
              backgroundColor: Colors.transparent,
              builder: (_) => SpeedRampingSheet(item: timeline.selectedItem!),
            );
          },
        ),
        _buildToolBtn(
          icon: Icons.trending_up_rounded,
          label: 'Velocity Curve',
          color: AppColors.primary,
          onTap: () {
            showModalBottomSheet(
              context: context,
              backgroundColor: Colors.transparent,
              builder: (_) => SpeedCurvesSheet(item: timeline.selectedItem!),
            );
          },
        ),
        _buildToolBtn(
          icon: Icons.person_remove_rounded,
          label: 'AI Cutout',
          color: timeline.selectedItem!.isAutoCutoutActive ? AppColors.success : Colors.white70,
          onTap: () {
            timeline.selectedItem!.isAutoCutoutActive = !timeline.selectedItem!.isAutoCutoutActive;
            timeline.updateTrackItem(timeline.selectedItem!);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(timeline.selectedItem!.isAutoCutoutActive
                    ? '✨ AI Background Cutout Enabled (No Green Screen Needed)'
                    : 'AI Cutout Disabled'),
                backgroundColor: AppColors.surfaceLight,
              ),
            );
          },
        ),
        _buildToolBtn(
          icon: Icons.volume_up_rounded,
          label: 'Volume',
          color: AppColors.success,
          onTap: () {
            showModalBottomSheet(
              context: context,
              backgroundColor: Colors.transparent,
              builder: (_) => AudioMixerSheet(item: timeline.selectedItem!),
            );
          },
        ),
        _buildToolBtn(
          icon: Icons.auto_awesome_rounded,
          label: 'Filters',
          color: AppColors.secondary,
          onTap: () {
            showModalBottomSheet(
              context: context,
              backgroundColor: Colors.transparent,
              builder: (_) => FiltersEffectsSheet(item: timeline.selectedItem!),
            );
          },
        ),
        _buildToolBtn(
          icon: Icons.delete_outline_rounded,
          label: 'Delete',
          color: AppColors.error,
          onTap: () => timeline.removeTrackItem(timeline.selectedItem!.id),
        ),
      ],
    );
  }

  // CapCut Global Project Toolbar
  Widget _buildMainMenuToolbar(BuildContext context, EditorStateProvider editorState) {
    return ListView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      physics: const BouncingScrollPhysics(),
      children: [
        _buildToolBtn(
          icon: Icons.closed_caption_rounded,
          label: 'Auto Captions',
          color: AppColors.accent,
          onTap: () {
            showModalBottomSheet(
              context: context,
              backgroundColor: Colors.transparent,
              builder: (_) => const CaptionsSheet(),
            );
          },
        ),
        _buildToolBtn(
          icon: Icons.graphic_eq_rounded,
          label: 'Beat Sync',
          color: AppColors.primary,
          onTap: () {
            showModalBottomSheet(
              context: context,
              backgroundColor: Colors.transparent,
              builder: (_) => const BeatSyncSheet(),
            );
          },
        ),
        _buildToolBtn(
          icon: Icons.music_note_rounded,
          label: 'Audio / Voice',
          onTap: () {
            showModalBottomSheet(
              context: context,
              backgroundColor: Colors.transparent,
              builder: (_) => const AudioMixerSheet(),
            );
          },
        ),
        _buildToolBtn(
          icon: Icons.title_rounded,
          label: 'Text & Titles',
          onTap: () {
            showModalBottomSheet(
              context: context,
              backgroundColor: Colors.transparent,
              builder: (_) => const TextStickerSheet(),
            );
          },
        ),
        _buildToolBtn(
          icon: Icons.auto_fix_high_rounded,
          label: 'Effects',
          onTap: () {
            showModalBottomSheet(
              context: context,
              backgroundColor: Colors.transparent,
              builder: (_) => const FiltersEffectsSheet(),
            );
          },
        ),
        _buildToolBtn(
          icon: Icons.aspect_ratio_rounded,
          label: 'Ratio',
          onTap: () => _showRatioPicker(context, editorState),
        ),
      ],
    );
  }

  Widget _buildToolBtn({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Color color = Colors.white,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 72,
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 22, color: color),
            const SizedBox(height: 4),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: color.withOpacity(0.9), fontSize: 10, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }

  void _showRatioPicker(BuildContext context, EditorStateProvider editorState) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Canvas Aspect Ratio', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _ratioOption(ctx, editorState, AspectRatioPreset.ratio9_16, '9:16', 'TikTok / Reels'),
                  _ratioOption(ctx, editorState, AspectRatioPreset.ratio16_9, '16:9', 'YouTube'),
                  _ratioOption(ctx, editorState, AspectRatioPreset.ratio1_1, '1:1', 'Instagram'),
                  _ratioOption(ctx, editorState, AspectRatioPreset.ratio4_5, '4:5', 'Portrait'),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _ratioOption(BuildContext ctx, EditorStateProvider editorState, AspectRatioPreset preset, String name, String desc) {
    final isSelected = editorState.aspectRatio == preset;
    return GestureDetector(
      onTap: () {
        editorState.setAspectRatio(preset);
        Navigator.pop(ctx);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withOpacity(0.2) : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? AppColors.primary : Colors.transparent),
        ),
        child: Column(
          children: [
            Text(name, style: TextStyle(color: isSelected ? AppColors.primary : Colors.white, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(desc, style: const TextStyle(color: Colors.white38, fontSize: 9)),
          ],
        ),
      ),
    );
  }
}
