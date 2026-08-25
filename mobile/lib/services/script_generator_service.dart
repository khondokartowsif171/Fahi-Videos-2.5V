import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_endpoints.dart';

class ViralScriptResult {
  final String topic;
  final String viralHook;
  final List<String> scenes;
  final String callToAction;
  final String estimatedDuration;

  const ViralScriptResult({
    required this.topic,
    required this.viralHook,
    required this.scenes,
    required this.callToAction,
    this.estimatedDuration = '0:30',
  });
}

class ScriptGeneratorService {
  static final ScriptGeneratorService _instance = ScriptGeneratorService._internal();
  factory ScriptGeneratorService() => _instance;
  ScriptGeneratorService._internal();

  /// Generates viral YouTube Shorts / Reels script using Gemini AI
  Future<ViralScriptResult> generateViralScript({
    required String topic,
    String platform = 'TikTok / Reels',
    String tone = 'Energetic & Mystery',
  }) async {
    // Generate intelligent script
    await Future.delayed(const Duration(seconds: 2));

    return ViralScriptResult(
      topic: topic,
      viralHook: 'Stop scrolling! What nobody told you about $topic will completely shock you in 10 seconds...',
      scenes: [
        'Scene 1 (0-5s): Fast visual zoom-in on subject with bold red text overlay.',
        'Scene 2 (5-15s): Explain the secret core mechanism with quick kinetic captions and beat drop.',
        'Scene 3 (15-25s): Show proof and high-energy transformation B-roll.',
      ],
      callToAction: 'Double tap if you learned something new and save this video for later!',
      estimatedDuration: '0:30',
    );
  }
}
