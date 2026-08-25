enum GenerationStatus { idle, submitting, queued, processing, completed, failed }

class AiGenerationTask {
  final String id;
  final String prompt;
  final String? imageBase64;
  final String aspectRatio; // "16:9", "9:16", "1:1"
  final String resolution; // "720p", "1080p"
  final String? motionStyle; // "Cinematic", "Drone Fly", "Cyberpunk", "Time-lapse"
  
  GenerationStatus status;
  String? operationName;
  String? resultVideoUrl;
  String? errorMessage;
  double progress; // 0.0 to 1.0
  DateTime createdAt;

  AiGenerationTask({
    required this.id,
    required this.prompt,
    this.imageBase64,
    this.aspectRatio = "16:9",
    this.resolution = "720p",
    this.motionStyle = "Cinematic",
    this.status = GenerationStatus.idle,
    this.operationName,
    this.resultVideoUrl,
    this.errorMessage,
    this.progress = 0.0,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();
}
