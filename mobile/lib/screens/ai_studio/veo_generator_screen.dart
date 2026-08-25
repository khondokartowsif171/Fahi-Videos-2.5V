import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../../config/theme_colors.dart';
import '../../models/ai_generation_model.dart';
import '../../models/track_item.dart';
import '../../providers/ai_studio_provider.dart';
import '../../providers/timeline_provider.dart';
import '../editor/editor_screen.dart';

class VeoGeneratorScreen extends StatefulWidget {
  const VeoGeneratorScreen({super.key});

  @override
  State<VeoGeneratorScreen> createState() => _VeoGeneratorScreenState();
}

class _VeoGeneratorScreenState extends State<VeoGeneratorScreen> {
  final TextEditingController _promptController = TextEditingController();
  String _selectedRatio = '9:16';
  String _selectedMotion = 'Cinematic Camera';

  final List<String> _ratios = ['9:16', '16:9', '1:1'];
  final List<String> _motions = ['Cinematic Camera', 'Drone Fly', 'Cyberpunk Neon', 'Time-Lapse', 'Anime Action'];

  final List<String> _promptPresets = [
    'Futuristic neon cyberpunk city in heavy rain, cinematic lighting, ultra-realistic 8K',
    'Cinematic aerial drone sweep across misty Nordic pine mountains and frozen lake',
    'Hyper-detailed macro slow motion of golden honey dripping over fresh waffles',
    'Sci-fi astronaut discovering glowing alien flora in an underground crystal cavern',
  ];

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final aiStudio = context.watch<AiStudioProvider>();
    final timeline = context.read<TimelineProvider>();

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
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(shape: BoxShape.circle, gradient: AppColors.accentGradient),
              child: const Icon(Icons.auto_awesome_rounded, size: 14, color: Colors.white),
            ),
            const SizedBox(width: 10),
            const Text('Google Flow / Veo 3.1 Studio', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Studio Header Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: AppColors.darkCardGradient,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.secondary.withOpacity(0.3), width: 1),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text('AI Generative Video Engine', style: TextStyle(color: AppColors.secondary, fontSize: 13, fontWeight: FontWeight.bold)),
                        SizedBox(height: 4),
                        Text('Powered by Google Veo 3.1 & Gemini Flow. Type your imagination into cinema-grade clips.', style: TextStyle(color: Colors.white70, fontSize: 11)),
                      ],
                    ),
                  ),
                  const Icon(Icons.videocam_outlined, size: 36, color: AppColors.secondary),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Prompt Input Card
            const Text('Video Prompt', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.surfaceBorder),
              ),
              child: Column(
                children: [
                  TextField(
                    controller: _promptController,
                    maxLines: 3,
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                    decoration: const InputDecoration(
                      hintText: 'Describe the scene, motion, lighting, camera angle...',
                      hintStyle: TextStyle(color: Colors.white30, fontSize: 13),
                      contentPadding: EdgeInsets.all(14),
                      border: InputBorder.none,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: const BoxDecoration(
                      color: AppColors.surfaceLight,
                      borderRadius: BorderRadius.vertical(bottom: Radius.circular(12)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.lightbulb_outline_rounded, size: 14, color: AppColors.accent),
                        const SizedBox(width: 6),
                        const Text('Quick Prompt Ideas:', style: TextStyle(color: Colors.white60, fontSize: 11)),
                        const Spacer(),
                        InkWell(
                          onTap: () {
                            final sample = (_promptPresets..shuffle()).first;
                            _promptController.text = sample;
                          },
                          child: const Text('Inspire Me ✨', style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Aspect Ratio & Motion Style Selectors
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Aspect Ratio', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        children: _ratios.map((r) {
                          final isSelected = _selectedRatio == r;
                          return ChoiceChip(
                            label: Text(r),
                            selected: isSelected,
                            selectedColor: AppColors.primary,
                            backgroundColor: AppColors.surfaceLight,
                            labelStyle: TextStyle(color: isSelected ? Colors.black : Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                            onSelected: (val) {
                              if (val) setState(() => _selectedRatio = r);
                            },
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Motion Preset', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(color: AppColors.surfaceLight, borderRadius: BorderRadius.circular(8)),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedMotion,
                            dropdownColor: AppColors.surface,
                            isExpanded: true,
                            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                            items: _motions.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
                            onChanged: (val) {
                              if (val != null) setState(() => _selectedMotion = val);
                            },
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Generate Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: aiStudio.isGenerating
                    ? null
                    : () {
                        if (_promptController.text.trim().isNotEmpty) {
                          aiStudio.generateVideo(
                            prompt: _promptController.text.trim(),
                            aspectRatio: _selectedRatio,
                            motionStyle: _selectedMotion,
                          );
                          _promptController.clear();
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.secondary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 6,
                  shadowColor: AppColors.secondary.withOpacity(0.5),
                ),
                icon: aiStudio.isGenerating
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.auto_awesome_rounded),
                label: Text(
                  aiStudio.isGenerating ? 'Synthesizing with Veo 3.1...' : 'Generate AI Video Clip',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
            ),

            const SizedBox(height: 28),

            // Generations History List
            const Text('Generated AI Clips', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),

            ...aiStudio.tasks.map((task) {
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.surfaceBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: task.status == GenerationStatus.completed
                                ? AppColors.success.withOpacity(0.2)
                                : AppColors.accent.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            task.status.name.toUpperCase(),
                            style: TextStyle(
                              color: task.status == GenerationStatus.completed ? AppColors.success : AppColors.accent,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(task.aspectRatio, style: const TextStyle(color: Colors.white38, fontSize: 11)),
                        const Spacer(),
                        Text(task.motionStyle ?? '', style: const TextStyle(color: AppColors.primary, fontSize: 11)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(task.prompt, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500)),
                    const SizedBox(height: 10),

                    // Progress Bar if Processing
                    if (task.status == GenerationStatus.processing || task.status == GenerationStatus.submitting) ...[
                      LinearProgressIndicator(
                        value: task.progress > 0 ? task.progress : null,
                        backgroundColor: AppColors.surfaceLight,
                        valueColor: const AlwaysStoppedAnimation<Color>(AppColors.secondary),
                      ),
                      const SizedBox(height: 6),
                      Text('Rendering frames ${(task.progress * 100).toInt()}%...', style: const TextStyle(color: Colors.white38, fontSize: 10)),
                    ],

                    // Import to Timeline Button if Completed
                    if (task.status == GenerationStatus.completed && task.resultVideoUrl != null)
                      Align(
                        alignment: Alignment.centerRight,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            final newClip = TrackItem(
                              id: const Uuid().v4(),
                              type: TrackType.video,
                              title: 'AI Clip (${task.prompt.split(" ").take(2).join(" ")})',
                              sourcePath: task.resultVideoUrl,
                              startTimeMs: timeline.currentTimeMs,
                              durationMs: 6000,
                            );
                            timeline.addTrackItem(newClip);
                            Navigator.push(context, MaterialPageRoute(builder: (_) => const EditorScreen()));
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          icon: const Icon(Icons.add_to_photos_rounded, size: 14),
                          label: const Text('Add to Timeline', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                        ),
                      ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
