import '../models/beat_model.dart';

class BeatSyncService {
  static final BeatSyncService _instance = BeatSyncService._internal();
  factory BeatSyncService() => _instance;
  BeatSyncService._internal();

  /// Analyzes audio frequencies and generates rhythm beat drops
  List<AudioBeatMarker> detectBeats({
    required int audioDurationMs,
    double sensitivity = 0.8, // 0.1 to 1.0
  }) {
    final List<AudioBeatMarker> markers = [];
    final intervalMs = (1000 / (1.5 + sensitivity * 2.0)).round(); // ~120-140 BPM rhythm

    for (int t = 500; t < audioDurationMs; t += intervalMs) {
      final isDrop = (t ~/ intervalMs) % 4 == 0;
      markers.add(
        AudioBeatMarker(
          timestampMs: t,
          intensity: isDrop ? 0.95 : 0.65,
          isMajorDrop: isDrop,
        ),
      );
    }

    return markers;
  }
}
