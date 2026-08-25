class AudioBeatMarker {
  final int timestampMs;
  final double intensity; // 0.0 to 1.0
  final bool isMajorDrop;

  const AudioBeatMarker({
    required this.timestampMs,
    required this.intensity,
    this.isMajorDrop = false,
  });
}
