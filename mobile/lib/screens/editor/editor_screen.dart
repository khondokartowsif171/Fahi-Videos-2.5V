import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme_colors.dart';
import '../../providers/editor_state_provider.dart';
import '../../providers/timeline_provider.dart';
import 'widgets/export_dialog.dart';
import 'widgets/preview_player.dart';
import 'widgets/timeline_view.dart';
import 'widgets/toolbar_bottom.dart';

class EditorScreen extends StatelessWidget {
  const EditorScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final editorState = context.watch<EditorStateProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.primary),
            ),
            const SizedBox(width: 8),
            Text(
              editorState.projectName,
              style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
            ),
          ],
        ),
        actions: [
          // Export Button
          Padding(
            padding: const EdgeInsets.only(right: 12),
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
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              ),
              icon: const Icon(Icons.arrow_upward_rounded, size: 16),
              label: const Text('Export', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
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

            // Bottom Half: Multi-Track Timeline & Controls
            Expanded(
              flex: 4,
              child: TimelineView(),
            ),

            // Bottom CapCut Toolbars
            ToolbarBottom(),
          ],
        ),
      ),
    );
  }
}
