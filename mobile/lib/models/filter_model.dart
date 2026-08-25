class VideoFilterPreset {
  final String id;
  final String name;
  final String category;
  final double brightness;
  final double contrast;
  final double saturation;
  final String ffmpegFilter;

  const VideoFilterPreset({
    required this.id,
    required this.name,
    required this.category,
    this.brightness = 0.0,
    this.contrast = 1.0,
    this.saturation = 1.0,
    required this.ffmpegFilter,
  });

  static const List<VideoFilterPreset> presets = [
    VideoFilterPreset(
      id: 'normal',
      name: 'Original',
      category: 'Basic',
      ffmpegFilter: 'null',
    ),
    VideoFilterPreset(
      id: 'cinematic',
      name: 'Cinematic Blue',
      category: 'Film',
      brightness: 0.05,
      contrast: 1.25,
      saturation: 0.85,
      ffmpegFilter: 'eq=contrast=1.25:brightness=0.05:saturation=0.85',
    ),
    VideoFilterPreset(
      id: 'cyberpunk',
      name: 'Cyber Neon',
      category: 'Trendy',
      brightness: 0.08,
      contrast: 1.4,
      saturation: 1.6,
      ffmpegFilter: 'eq=contrast=1.4:brightness=0.08:saturation=1.6',
    ),
    VideoFilterPreset(
      id: 'warm_vintage',
      name: 'Warm Retro',
      category: 'Vintage',
      brightness: 0.02,
      contrast: 1.1,
      saturation: 1.2,
      ffmpegFilter: 'curves=vintage',
    ),
    VideoFilterPreset(
      id: 'bw_dramatic',
      name: 'Noir Noir',
      category: 'B&W',
      contrast: 1.5,
      saturation: 0.0,
      ffmpegFilter: 'hue=s=0,eq=contrast=1.5',
    ),
    VideoFilterPreset(
      id: 'sunset_glow',
      name: 'Sunset Glow',
      category: 'Color',
      brightness: 0.06,
      contrast: 1.15,
      saturation: 1.35,
      ffmpegFilter: 'eq=contrast=1.15:brightness=0.06:saturation=1.35',
    ),
  ];
}
