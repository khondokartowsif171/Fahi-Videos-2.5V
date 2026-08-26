import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme_colors.dart';
import '../../providers/editor_state_provider.dart';
import '../../providers/timeline_provider.dart';
import 'widgets/export_dialog.dart';
import 'widgets/keyframe_bar.dart';
import 'widgets/preview_player.dart';
import 'widgets/timeline_view.dart';
import 'widgets/toolbar_bottom.dart';

class EditorScreen extends StatelessWidget {
  const EditorScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final editorState = context.watch<EditorStateProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFF0C0C12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF14141E),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Container(
              width: 7,
              height: 7,
              decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.primary),
            ),
            const SizedBox(width: 8),
            Text(
              editorState.projectName,
              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        actions: [
          // CapCut Resolution Badge
          Container(
            margin: const EdgeInsets.symmetric(vertical: 12),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.08),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: Colors.white12, width: 0.5),
            ),
            child: const Row(
              children: [
                Text('1080P', style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold)),
                SizedBox(width: 2),
                Icon(Icons.arrow_drop_down, color: Colors.white70, size: 14),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // CapCut Blue Export Button
          Padding(
            padding: const EdgeInsets.only(right: 12, top: 10, bottom: 10),
            child: ElevatedButton.icon(
              onPressed: () {
                showDialog(
                  context: context,
                  barrierDismissible: false,
                  builder: (_) => const ExportDialog(),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.black,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              icon: const Icon(Icons.arrow_upward_rounded, size: 14),
              label: const Text('Export', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: const [
            // Top Half: Interactive Preview Canvas
            Expanded(
              flex: 5,
              child: PreviewPlayer(),
            ),

            // Keyframe Diamond Action Bar
            KeyframeBar(),

            // Bottom Half: Multi-Track Timeline & Controls
            Expanded(
              flex: 4,
              child: TimelineView(),
            ),

            // Bottom CapCut Toolbars (Level 1 / Level 2)
            ToolbarBottom(),
          ],
        ),
      ),
    );
  }
}
