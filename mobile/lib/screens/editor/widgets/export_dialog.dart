import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../config/theme_colors.dart';
import '../../../providers/editor_state_provider.dart';

class ExportDialog extends StatefulWidget {
  const ExportDialog({super.key});

  @override
  State<ExportDialog> createState() => _ExportDialogState();
}

class _ExportDialogState extends State<ExportDialog> {
  String _selectedRes = '1080p';
  int _selectedFps = 30;

  final List<String> _resolutions = ['720p HD', '1080p Full HD', '2K QHD', '4K Ultra HD'];
  final List<int> _frameRates = [24, 30, 60];

  @override
  Widget build(BuildContext context) {
    final editorState = context.watch<EditorStateProvider>();

    return Dialog(
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Export Video (CapCut Pro)', style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold)),
                if (!editorState.isExporting)
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close, color: Colors.white60, size: 20),
                  ),
              ],
            ),
            const SizedBox(height: 20),

            if (editorState.isExporting) ...[
              Center(
                child: Column(
                  children: [
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox(
                          width: 84,
                          height: 84,
                          child: CircularProgressIndicator(
                            value: editorState.exportProgress,
                            strokeWidth: 6,
                            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                            backgroundColor: AppColors.surfaceLight,
                          ),
                        ),
                        Text(
                          '${(editorState.exportProgress * 100).toInt()}%',
                          style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Text('Rendering & Compositing Frames...', style: TextStyle(color: Colors.white70, fontSize: 13)),
                    const SizedBox(height: 6),
                    const Text('Hardware accelerated GPU encoder active', style: TextStyle(color: Colors.white30, fontSize: 11)),
                  ],
                ),
              ),
            ] else ...[
              // Resolution Selector
              const Text('Resolution', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: _resolutions.map((res) {
                  final isSelected = _selectedRes == res;
                  return ChoiceChip(
                    label: Text(res),
                    selected: isSelected,
                    selectedColor: AppColors.primary,
                    backgroundColor: AppColors.surfaceLight,
                    labelStyle: TextStyle(color: isSelected ? Colors.black : Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                    onSelected: (selected) {
                      if (selected) setState(() => _selectedRes = res);
                    },
                  );
                }).toList(),
              ),

              const SizedBox(height: 16),

              // Frame Rate (FPS) Selector
              const Text('Frame Rate (FPS)', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Row(
                children: _frameRates.map((fps) {
                  final isSelected = _selectedFps == fps;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text('$fps FPS'),
                      selected: isSelected,
                      selectedColor: AppColors.secondary,
                      backgroundColor: AppColors.surfaceLight,
                      labelStyle: TextStyle(color: isSelected ? Colors.white : Colors.white70, fontWeight: FontWeight.bold, fontSize: 12),
                      onSelected: (selected) {
                        if (selected) setState(() => _selectedFps = fps);
                      },
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 24),

              // Start Render Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    editorState.startExport(resolution: _selectedRes, fps: _selectedFps);
                    for (int i = 1; i <= 100; i += 10) {
                      await Future.delayed(const Duration(milliseconds: 300));
                      editorState.updateExportProgress(i / 100.0);
                    }
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('✅ Video successfully exported to Gallery!'),
                          backgroundColor: AppColors.success,
                        ),
                      );
                      Navigator.pop(context);
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Export Video', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
