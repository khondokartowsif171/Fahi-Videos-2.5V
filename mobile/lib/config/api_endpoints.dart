class ApiEndpoints {
  // Live Next.js backend URL or local dev tunnel
  static const String baseUrl = 'https://fahi-videos.vercel.app';
  static const String localUrl = 'http://10.0.2.2:3000'; // Android emulator localhost

  // Google Flow / Veo 3.1 AI Generation
  static const String veoGenerate = '$baseUrl/api/gemini/video/generate';
  static const String veoStatus = '$baseUrl/api/gemini/video/status';
  static const String veoDownload = '$baseUrl/api/gemini/video/download';

  // ElevenLabs Text to Speech
  static const String elevenLabsTts = '$baseUrl/api/elevenlabs/tts';
  static const String elevenLabsVoices = '$baseUrl/api/elevenlabs/voices';

  // Multi-Platform Video Downloader
  static const String videoInfo = '$baseUrl/api/video/info';
  static const String videoDownload = '$baseUrl/api/video/download';

  // Direct Fallback Video Samples (when offline or testing)
  static const List<String> cinematicFallbacks = [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  ];
}
