class ElevenLabsVoice {
  final String voiceId;
  final String name;
  final String category;
  final String description;
  final String previewUrl;

  const ElevenLabsVoice({
    required this.voiceId,
    required this.name,
    required this.category,
    required this.description,
    this.previewUrl = '',
  });

  static const List<ElevenLabsVoice> defaultVoices = [
    ElevenLabsVoice(
      voiceId: '21m00Tcm4TlvDq8ikWAM',
      name: 'Rachel',
      category: 'Female / Calm',
      description: 'American, calm, conversational narrative voice',
    ),
    ElevenLabsVoice(
      voiceId: 'AZnzlk1XvdvUeBnXmlld',
      name: 'Domi',
      category: 'Female / Energetic',
      description: 'Dynamic, confident storytelling voice',
    ),
    ElevenLabsVoice(
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
      name: 'Bella',
      category: 'Female / Soft',
      description: 'Warm, empathetic, professional audio voice',
    ),
    ElevenLabsVoice(
      voiceId: 'ErXwobaYiN019PkySvjV',
      name: 'Antoni',
      category: 'Male / Deep',
      description: 'Deep, authoritative cinematic trailer voice',
    ),
    ElevenLabsVoice(
      voiceId: 'VR6AewLTigWG4xSOukaG',
      name: 'Arnold',
      category: 'Male / Crispy',
      description: 'Crisp, articulate educational narrator',
    ),
    ElevenLabsVoice(
      voiceId: 'pNInz6obpgDQGcFmaJgB',
      name: 'Adam',
      category: 'Male / Narrator',
      description: 'Standard modern podcast and documentary voice',
    ),
  ];
}
