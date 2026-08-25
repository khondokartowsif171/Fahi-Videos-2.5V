import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/theme_colors.dart';
import '../../../../models/caption_model.dart';
import '../../../../providers/caption_provider.dart';

class CaptionsSheet extends StatelessWidget {
  const CaptionsSheet({super.key});

  @override
  Widget build(BuildContext context) {
    final captionProvider = context.watch<CaptionProvider>();

    return Container(
      height: 420,
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
              const Text('AI Auto-Captions & Subtitles', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: Colors.white60, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Caption Style Selector (Hormozi, Neon, Bold Box)
          const Text('Caption Style Presets', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Row(
            children: [
              _styleCard(
                context,
                captionProvider,
                preset: CaptionStylePreset.hormoziYellow,
                title: 'Hormozi',
                accent: AppColors.accent,
                textColor: Colors.black,
              ),
              const SizedBox(width: 8),
              _styleCard(
                context,
                captionProvider,
                preset: CaptionStylePreset.neonCyberpunk,
                title: 'Cyberpunk',
                accent: AppColors.primary,
                textColor: Colors.white,
              ),
              const SizedBox(width: 8),
              _styleCard(
                context,
                captionProvider,
                preset: CaptionStylePreset.boldBoxed,
                title: 'Bold Boxed',
                accent: AppColors.secondary,
                textColor: Colors.white,
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Generate Captions Action
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: captionProvider.isGenerating
                  ? null
                  : () async {
                      await captionProvider.generateCaptions('current_media_track');
                      if (context.mounted) Navigator.pop(context);
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: captionProvider.isGenerating
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                  : const Icon(Icons.closed_caption_rounded),
              label: Text(
                captionProvider.isGenerating ? 'Analyzing Speech & Audio...' : 'Generate Auto Captions (Word-by-Word)',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),

          if (captionProvider.segments.isNotEmpty) ...[
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${captionProvider.segments.length} Caption Segments Active', style: const TextStyle(color: AppColors.success, fontSize: 12, fontWeight: FontWeight.bold)),
                TextButton(
                  onPressed: () => captionProvider.clearCaptions(),
                  child: const Text('Clear All', style: TextStyle(color: AppColors.error, fontSize: 11)),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _styleCard(
    BuildContext context,
    CaptionProvider provider, {
    required CaptionStylePreset preset,
    required String title,
    required Color accent,
    required Color textColor,
  }) {
    final isSelected = provider.currentStyle == preset;

    return Expanded(
      child: GestureDetector(
        onTap: () => provider.setStyle(preset),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          decoration: BoxDecoration(
            color: AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppColors.primary : Colors.white12,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: accent, borderRadius: BorderRadius.circular(4)),
                child: Text('VIRAL', style: TextStyle(color: textColor, fontWeight: FontWeight.w900, fontSize: 10)),
              ),
              const SizedBox(height: 6),
              Text(title, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }
}
