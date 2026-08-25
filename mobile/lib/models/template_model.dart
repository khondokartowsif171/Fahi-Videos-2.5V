class VideoTemplateItem {
  final String id;
  final String title;
  final String author;
  final String usesCount;
  final String duration;
  final String previewVideoUrl;
  final String thumbnailUrl;
  final String soundTitle;
  final List<String> tags;

  const VideoTemplateItem({
    required this.id,
    required this.title,
    required this.author,
    required this.usesCount,
    required this.duration,
    required this.previewVideoUrl,
    required this.thumbnailUrl,
    required this.soundTitle,
    required this.tags,
  });

  static const List<VideoTemplateItem> trendingTemplates = [
    VideoTemplateItem(
      id: 'temp-1',
      title: 'Neon Cyberpunk 3D Velocity Beat',
      author: '@fahi_fx',
      usesCount: '1.2M',
      duration: '0:12',
      previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
      soundTitle: 'Synthwave Night Driver (Slowed + Reverb)',
      tags: ['Cyberpunk', 'Velocity', 'Beat Sync', 'Reels'],
    ),
    VideoTemplateItem(
      id: 'temp-2',
      title: 'Nordic Drone Slow-Mo Travel Reel',
      author: '@wanderlust_ai',
      usesCount: '850K',
      duration: '0:15',
      previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
      soundTitle: 'Acoustic Atmospheric Echoes',
      tags: ['Cinematic', 'Travel', 'Drone', '4K'],
    ),
    VideoTemplateItem(
      id: 'temp-3',
      title: 'Opus Viral Talking Head Captions',
      author: '@creator_lab',
      usesCount: '2.4M',
      duration: '0:20',
      previewVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      soundTitle: 'Lofi Podcast Background Ambience',
      tags: ['Auto Captions', 'Hormozi', 'Shorts', 'Educational'],
    ),
  ];
}
