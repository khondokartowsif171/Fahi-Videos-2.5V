import 'package:flutter/material.dart';
import '../models/ai_generation_model.dart';
import '../services/veo_ai_service.dart';

class AiStudioProvider extends ChangeNotifier {
  final VeoAiService _veoService = VeoAiService();
  final List<AiGenerationTask> _tasks = [];
  bool _isGenerating = false;
  String? _customApiKey;

  List<AiGenerationTask> get tasks => _tasks;
  bool get isGenerating => _isGenerating;
  String? get customApiKey => _customApiKey;

  AiStudioProvider() {
    _initSampleTasks();
  }

  void setCustomApiKey(String? key) {
    _customApiKey = key;
    notifyListeners();
  }

  void _initSampleTasks() {
    _tasks.add(
      AiGenerationTask(
        id: 'sample-1',
        prompt: 'Futuristic cyberpunk neon city with flying cars and heavy rain, 8K ultra-realistic cinematic lighting',
        aspectRatio: '9:16',
        motionStyle: 'Cinematic Camera Glide',
        status: GenerationStatus.completed,
        progress: 1.0,
        resultVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      ),
    );
  }

  Future<AiGenerationTask> generateVideo({
    required String prompt,
    String? imageBase64,
    String aspectRatio = '16:9',
    String resolution = '720p',
    String motionStyle = 'Cinematic',
  }) async {
    _isGenerating = true;
    notifyListeners();

    final task = await _veoService.generateVideo(
      prompt: prompt,
      imageBase64: imageBase64,
      aspectRatio: aspectRatio,
      resolution: resolution,
      motionStyle: motionStyle,
      geminiApiKey: _customApiKey,
    );

    _tasks.insert(0, task);
    _isGenerating = false;
    notifyListeners();

    // Start background status polling
    _startPolling(task);

    return task;
  }

  void _startPolling(AiGenerationTask task) async {
    while (task.status == GenerationStatus.processing ||
        task.status == GenerationStatus.submitting) {
      await Future.delayed(const Duration(seconds: 3));
      await _veoService.pollTaskStatus(task);
      notifyListeners();
    }
  }

  void deleteTask(String id) {
    _tasks.removeWhere((t) => t.id == id);
    notifyListeners();
  }
}
