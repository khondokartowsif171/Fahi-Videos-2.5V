import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme_colors.dart';
import '../providers/editor_state_provider.dart';
import 'ai_studio/tts_generator_screen.dart';
import 'ai_studio/veo_generator_screen.dart';
import 'downloader/video_downloader_screen.dart';
import 'editor/editor_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // Top App Bar
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: AppColors.primaryGradient,
                      ),
                      child: const Icon(Icons.movie_filter_rounded, color: Colors.black, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text('FAHI VIDEOS PRO', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                        Text('CapCut Pro + Google Veo 3.1 Studio', style: TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.settings_outlined, color: Colors.white70),
                      onPressed: () {},
                    ),
                  ],
                ),
              ),
            ),

            // CapCut Giant "New Project" Card
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: GestureDetector(
                  onTap: () {
                    context.read<EditorStateProvider>().setProjectName('Project ${DateTime.now().minute}:${DateTime.now().second}');
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const EditorScreen()));
                  },
                  child: Container(
                    height: 120,
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 16, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.black),
                          child: const Icon(Icons.add_rounded, color: AppColors.primary, size: 30),
                        ),
                        const SizedBox(width: 14),
                        Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text('New Project', style: TextStyle(color: Colors.black, fontSize: 20, fontWeight: FontWeight.w900)),
                            Text('Start CapCut Multi-Track Editing', style: TextStyle(color: Colors.black87, fontSize: 12, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 24)),

            // AI Power Tools Grid Hub
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('AI & Premium Tool Suite', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _buildToolCard(
                            context: context,
                            title: 'Google Flow / Veo',
                            subtitle: 'AI Video Gen 3.1',
                            icon: Icons.auto_awesome_rounded,
                            gradient: AppColors.accentGradient,
                            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VeoGeneratorScreen())),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildToolCard(
                            context: context,
                            title: 'ElevenLabs Voice',
                            subtitle: 'AI Voiceover Studio',
                            icon: Icons.record_voice_over_rounded,
                            gradient: const LinearGradient(colors: [AppColors.success, Color(0xFF00B0FF)]),
                            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TtsGeneratorScreen())),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _buildToolCard(
                            context: context,
                            title: 'Media Downloader',
                            subtitle: 'YouTube, FB, TikTok',
                            icon: Icons.download_for_offline_rounded,
                            gradient: const LinearGradient(colors: [Color(0xFFFF9100), Color(0xFFFF5252)]),
                            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VideoDownloaderScreen())),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildToolCard(
                            context: context,
                            title: 'Speed Ramping',
                            subtitle: 'Smooth Curves 10x',
                            icon: Icons.speed_rounded,
                            gradient: const LinearGradient(colors: [Color(0xFF7C4DFF), Color(0xFF536DFE)]),
                            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const EditorScreen())),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 28)),

            // Recent Projects List
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: const [
                    Text('Recent Projects', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                    Text('See All', style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 12)),

            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  _buildProjectTile(context, 'Cyberpunk Reels Edit', '0:15', '9:16', '2 hours ago'),
                  _buildProjectTile(context, 'Nordic Mountain Drone AI', '0:08', '16:9', 'Yesterday'),
                  _buildProjectTile(context, 'YouTube Podcast Trailer', '0:45', '16:9', '3 days ago'),
                ]),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 30)),
          ],
        ),
      ),
    );
  }

  Widget _buildToolCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
    required Gradient gradient,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.surfaceBorder),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: gradient,
              ),
              child: Icon(icon, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                  Text(subtitle, style: const TextStyle(color: Colors.white38, fontSize: 10)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProjectTile(BuildContext context, String title, String duration, String ratio, String time) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.surfaceBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.movie_outlined, color: AppColors.primary, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text('$duration • $ratio • $time', style: const TextStyle(color: Colors.white38, fontSize: 11)),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.edit_rounded, color: AppColors.primary, size: 20),
            onPressed: () {
              context.read<EditorStateProvider>().setProjectName(title);
              Navigator.push(context, MaterialPageRoute(builder: (_) => const EditorScreen()));
            },
          ),
        ],
      ),
    );
  }
}
