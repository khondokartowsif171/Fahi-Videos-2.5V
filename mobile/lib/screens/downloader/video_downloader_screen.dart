import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../../config/theme_colors.dart';
import '../../models/track_item.dart';
import '../../providers/timeline_provider.dart';
import '../../services/downloader_service.dart';
import '../editor/editor_screen.dart';

class VideoDownloaderScreen extends StatefulWidget {
  const VideoDownloaderScreen({super.key});

  @override
  State<VideoDownloaderScreen> createState() => _VideoDownloaderScreenState();
}

class _VideoDownloaderScreenState extends State<VideoDownloaderScreen> {
  final TextEditingController _urlController = TextEditingController();
  final DownloaderService _downloaderService = DownloaderService();

  bool _isLoading = false;
  VideoMediaItem? _mediaItem;

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  void _searchMedia() async {
    if (_urlController.text.trim().isEmpty) return;
    setState(() {
      _isLoading = true;
      _mediaItem = null;
    });

    final item = await _downloaderService.fetchVideoInfo(_urlController.text.trim());
    setState(() {
      _isLoading = false;
      _mediaItem = item;
    });
  }

  @override
  Widget build(BuildContext context) {
    final timeline = context.read<TimelineProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Multi-Platform Video Downloader', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Platform Badges
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _platformChip('YouTube', Icons.play_arrow_rounded, Colors.red),
                _platformChip('Facebook', Icons.facebook, Colors.blue),
                _platformChip('TikTok', Icons.music_video_rounded, AppColors.secondary),
                _platformChip('Instagram', Icons.camera_alt_rounded, Colors.purple),
              ],
            ),

            const SizedBox(height: 20),

            // Search / URL Input Box
            Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.surfaceBorder),
              ),
              child: Row(
                children: [
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 12),
                    child: Icon(Icons.link_rounded, color: AppColors.primary),
                  ),
                  Expanded(
                    child: TextField(
                      controller: _urlController,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: const InputDecoration(
                        hintText: 'Paste video link (YouTube, TikTok, FB)...',
                        hintStyle: TextStyle(color: Colors.white30, fontSize: 13),
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(6),
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _searchMedia,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: _isLoading
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                          : const Text('Fetch', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Parsed Video Media Result Card
            if (_mediaItem != null) ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            _mediaItem!.thumbnail,
                            width: 100,
                            height: 70,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(width: 100, height: 70, color: AppColors.surfaceLight),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _mediaItem!.title,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                              const SizedBox(height: 4),
                              Text('${_mediaItem!.author} • ${_mediaItem!.duration}', style: const TextStyle(color: Colors.white38, fontSize: 11)),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),
                    const Text('Available HD Formats', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),

                    // Formats List
                    ..._mediaItem!.formats.map((fmt) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(color: AppColors.surfaceLight, borderRadius: BorderRadius.circular(10)),
                        child: Row(
                          children: [
                            Icon(
                              fmt.format == 'mp3' ? Icons.audiotrack_rounded : Icons.video_file_rounded,
                              color: AppColors.primary,
                              size: 18,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(fmt.quality, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                                  Text(fmt.size, style: const TextStyle(color: Colors.white38, fontSize: 10)),
                                ],
                              ),
                            ),
                            ElevatedButton.icon(
                              onPressed: () {
                                final isAudio = fmt.format == 'mp3';
                                final newClip = TrackItem(
                                  id: const Uuid().v4(),
                                  type: isAudio ? TrackType.audio : TrackType.video,
                                  title: _mediaItem!.title,
                                  sourcePath: fmt.downloadUrl,
                                  startTimeMs: timeline.currentTimeMs,
                                  durationMs: 8000,
                                );
                                timeline.addTrackItem(newClip);
                                Navigator.push(context, MaterialPageRoute(builder: (_) => const EditorScreen()));
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.black,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              icon: const Icon(Icons.add_to_photos_rounded, size: 14),
                              label: const Text('Import to Editor', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _platformChip(String label, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(20), border: Border.all(color: color.withOpacity(0.3))),
      child: Row(
        children: [
          Icon(icon, color: color, size: 14),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
