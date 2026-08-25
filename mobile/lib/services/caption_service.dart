import 'package:uuid/uuid.dart';
import '../models/caption_model.dart';

class CaptionService {
  static final CaptionService _instance = CaptionService._internal();
  factory CaptionService() => _instance;
  CaptionService._internal();

  /// Generates word-by-word karaoke auto-captions from audio/video
  Future<List<CaptionSegment>> generateAutoCaptions({
    required String mediaPath,
    String language = 'en',
    CaptionStylePreset style = CaptionStylePreset.hormoziYellow,
  }) async {
    // Simulate AI speech-to-text with precision timestamping
    await Future.delayed(const Duration(seconds: 2));

    return [
      CaptionSegment(
        id: const Uuid().v4(),
        startMs: 500,
        endMs: 3500,
        fullText: 'THIS IS HOW YOU CREATE VIRAL VIDEOS',
        style: style,
        words: const [
          WordTiming(word: 'THIS', startMs: 500, endMs: 800),
          WordTiming(word: 'IS', startMs: 850, endMs: 1100),
          WordTiming(word: 'HOW', startMs: 1150, endMs: 1500),
          WordTiming(word: 'YOU', startMs: 1550, endMs: 1900),
          WordTiming(word: 'CREATE', startMs: 1950, endMs: 2500),
          WordTiming(word: 'VIRAL', startMs: 2550, endMs: 3000),
          WordTiming(word: 'VIDEOS', startMs: 3050, endMs: 3500),
        ],
      ),
      CaptionSegment(
        id: const Uuid().v4(),
        startMs: 3800,
        endMs: 7000,
        fullText: 'USING POWERFUL GOOGLE AI GENERATION',
        style: style,
        words: const [
          WordTiming(word: 'USING', startMs: 3800, endMs: 4200),
          WordTiming(word: 'POWERFUL', startMs: 4250, endMs: 4800),
          WordTiming(word: 'GOOGLE', startMs: 4850, endMs: 5400),
          WordTiming(word: 'AI', startMs: 5450, endMs: 6000),
          WordTiming(word: 'GENERATION', startMs: 6050, endMs: 7000),
        ],
      ),
    ];
  }
}
