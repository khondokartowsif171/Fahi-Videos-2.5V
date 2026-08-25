import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import '../config/api_endpoints.dart';
import '../models/voice_model.dart';

class ElevenLabsService {
  static final ElevenLabsService _instance = ElevenLabsService._internal();
  factory ElevenLabsService() => _instance;
  ElevenLabsService._internal();

  /// Generates speech audio MP3 from text using ElevenLabs voice model
  Future<String?> generateSpeech({
    required String text,
    required String voiceId,
    double stability = 0.5,
    double similarityBoost = 0.75,
    String? elevenLabsApiKey,
  }) async {
    try {
      final headers = {
        'Content-Type': 'application/json',
        if (elevenLabsApiKey != null && elevenLabsApiKey.isNotEmpty)
          'xi-api-key': elevenLabsApiKey,
      };

      final body = jsonEncode({
        'text': text,
        'voice_id': voiceId,
        'voice_settings': {
          'stability': stability,
          'similarity_boost': similarityBoost,
        },
      });

      final response = await http
          .post(
            Uri.parse(ApiEndpoints.elevenLabsTts),
            headers: headers,
            body: body,
          )
          .timeout(const Duration(seconds: 20));

      if (response.statusCode == 200) {
        final dir = await getTemporaryDirectory();
        final file = File(
          '${dir.path}/tts_${DateTime.now().millisecondsSinceEpoch}.mp3',
        );
        await file.writeAsBytes(response.bodyBytes);
        return file.path;
      }
    } catch (e) {
      // Return null or handle offline fallback
    }
    return null;
  }

  /// Fetches available ElevenLabs voices
  Future<List<ElevenLabsVoice>> getVoices({String? apiKey}) async {
    try {
      final headers = {
        if (apiKey != null && apiKey.isNotEmpty) 'xi-api-key': apiKey,
      };

      final response = await http
          .get(Uri.parse(ApiEndpoints.elevenLabsVoices), headers: headers)
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List voices = data['voices'] ?? [];
        return voices.map((v) {
          return ElevenLabsVoice(
            voiceId: v['voice_id'] ?? '',
            name: v['name'] ?? 'Voice',
            category: v['category'] ?? 'General',
            description: v['description'] ?? '',
            previewUrl: v['preview_url'] ?? '',
          );
        }).toList();
      }
    } catch (e) {
      // fallback
    }
    return ElevenLabsVoice.defaultVoices;
  }
}
