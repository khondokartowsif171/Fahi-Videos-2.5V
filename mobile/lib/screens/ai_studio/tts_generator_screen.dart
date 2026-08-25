import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../../config/theme_colors.dart';
import '../../models/track_item.dart';
import '../../models/voice_model.dart';
import '../../providers/timeline_provider.dart';
import '../../services/elevenlabs_service.dart';
import '../editor/editor_screen.dart';

class TtsGeneratorScreen extends StatefulWidget {
  const TtsGeneratorScreen({super.key});

  @override
  State<TtsGeneratorScreen> createState() => _TtsGeneratorScreenState();
}

class _TtsGeneratorScreenState extends State<TtsGeneratorScreen> {
  final TextEditingController _scriptController = TextEditingController();
  final ElevenLabsService _ttsService = ElevenLabsService();

  ElevenLabsVoice _selectedVoice = ElevenLabsVoice.defaultVoices.first;
  double _stability = 0.5;
  double _similarity = 0.75;
  bool _isSynthesizing = false;
  String? _generatedAudioPath;

  @override
  void dispose() {
    _scriptController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
        title: const Text('ElevenLabs AI Voice Studio', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Voice Models Selector Carousel
            const Text('Select AI Voice Actor', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            SizedBox(
              height: 110,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: ElevenLabsVoice.defaultVoices.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (ctx, i) {
                  final voice = ElevenLabsVoice.defaultVoices[i];
                  final isSelected = _selectedVoice.voiceId == voice.voiceId;

                  return GestureDetector(
                    onTap: () => setState(() => _selectedVoice = voice),
                    child: Container(
                      width: 100,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.success.withOpacity(0.15) : AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected ? AppColors.success : AppColors.surfaceBorder,
                          width: isSelected ? 2 : 1,
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: isSelected ? AppColors.primaryGradient : null,
                              color: isSelected ? null : AppColors.surfaceLight,
                            ),
                            child: const Icon(Icons.mic_rounded, color: Colors.white, size: 20),
                          ),
                          const SizedBox(height: 6),
                          Text(voice.name, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                          Text(voice.category.split('/').first.trim(), style: const TextStyle(color: Colors.white38, fontSize: 9)),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 20),

            // Script Textarea
            const Text('Script / Voiceover Text', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.surfaceBorder),
              ),
              child: TextField(
                controller: _scriptController,
                maxLines: 4,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                decoration: const InputDecoration(
                  hintText: 'Enter your video voiceover script here...',
                  hintStyle: TextStyle(color: Colors.white30, fontSize: 13),
                  contentPadding: EdgeInsets.all(14),
                  border: InputBorder.none,
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Voice Dynamics Settings (Stability & Clarity)
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Stability (${(_stability * 100).toInt()}%)', style: const TextStyle(color: Colors.white70, fontSize: 11)),
                      Slider(
                        value: _stability,
                        min: 0.0,
                        max: 1.0,
                        activeColor: AppColors.success,
                        onChanged: (v) => setState(() => _stability = v),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Clarity (${(_similarity * 100).toInt()}%)', style: const TextStyle(color: Colors.white70, fontSize: 11)),
                      Slider(
                        value: _similarity,
                        min: 0.0,
                        max: 1.0,
                        activeColor: AppColors.primary,
                        onChanged: (v) => setState(() => _similarity = v),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Generate Speech Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isSynthesizing
                    ? null
                    : () async {
                        if (_scriptController.text.trim().isNotEmpty) {
                          setState(() => _isSynthesizing = true);
                          final audioPath = await _ttsService.generateSpeech(
                            text: _scriptController.text.trim(),
                            voiceId: _selectedVoice.voiceId,
                            stability: _stability,
                            similarityBoost: _similarity,
                          );
                          setState(() {
                            _isSynthesizing = false;
                            _generatedAudioPath = audioPath ?? 'simulated_audio.mp3';
                          });
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.success,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: _isSynthesizing
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                    : const Icon(Icons.record_voice_over_rounded),
                label: Text(
                  _isSynthesizing ? 'Synthesizing Audio with ElevenLabs...' : 'Generate Voiceover',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ),
            ),

            if (_generatedAudioPath != null) ...[
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.success.withOpacity(0.5)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 24),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Audio Generated Successfully', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                          Text('Voice: ${_selectedVoice.name}', style: const TextStyle(color: Colors.white38, fontSize: 10)),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      onPressed: () {
                        final audioTrack = TrackItem(
                          id: const Uuid().v4(),
                          type: TrackType.audio,
                          title: 'TTS (${_selectedVoice.name})',
                          sourcePath: _generatedAudioPath,
                          startTimeMs: timeline.currentTimeMs,
                          durationMs: 6000,
                          volume: 1.0,
                        );
                        timeline.addTrackItem(audioTrack);
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const EditorScreen()));
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      ),
                      child: const Text('Add to Timeline', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
