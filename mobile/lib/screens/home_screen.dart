import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../config/theme_colors.dart';
import '../models/track_item.dart';
import '../providers/editor_state_provider.dart';
import '../providers/timeline_provider.dart';
import '../services/project_manager_service.dart';
import 'ai_studio/script_generator_screen.dart';
import 'ai_studio/tts_generator_screen.dart';
import 'ai_studio/veo_generator_screen.dart';
import 'downloader/video_downloader_screen.dart';
import 'editor/editor_screen.dart';
import 'templates/template_hub_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<LocalProject> _projects = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProjects();
  }

  Future<void> _loadProjects() async {
    final list = await ProjectManagerService.getProjects();
    if (mounted) {
      setState(() {
        _projects = list;
        _isLoading = false;
      });
    }
  }

  Future<void> _handleNewProjectChoice(BuildContext context, {required bool fromGallery}) async {
    final timeline = context.read<TimelineProvider>();
    final editorState = context.read<EditorStateProvider>();

    if (fromGallery) {
      final picker = ImagePicker();
      final picked = await picker.pickVideo(source: ImageSource.gallery);
      if (picked != null && mounted) {
        final title = picked.name.split('.').first;
        editorState.setProjectName(title);
        timeline.loadProjectTracks([]);
        await timeline.importMediaFile(picked.path, type: TrackType.video, title: picked.name);

        final newProj = LocalProject(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          title: title,
          previewVideoPath: picked.path,
          durationMs: timeline.totalDurationMs,
          aspectRatio: '9:16',
          updatedAt: DateTime.now(),
          tracks: timeline.tracks,
        );
        await ProjectManagerService.saveProject(newProj);
        _loadProjects();

        if (mounted) {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const EditorScreen()));
        }
      }
    } else {
      editorState.setProjectName('Project ${DateTime.now().minute}:${DateTime.now().second}');
      timeline.loadProjectTracks([]);
      Navigator.push(context, MaterialPageRoute(builder: (_) => const EditorScreen()));
    }
  }

  void _showNewProjectModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Create New Video Project', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.15), shape: BoxShape.circle),
                  child: const Icon(Icons.video_library_rounded, color: AppColors.primary, size: 22),
                ),
                title: const Text('Import Video from Gallery', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text('Select a video from your phone storage', style: TextStyle(color: Colors.white38, fontSize: 11)),
                onTap: () {
                  Navigator.pop(ctx);
                  _handleNewProjectChoice(context, fromGallery: true);
                },
              ),
              const Divider(color: Colors.white10),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: AppColors.secondary.withOpacity(0.15), shape: BoxShape.circle),
                  child: const Icon(Icons.auto_awesome_rounded, color: AppColors.secondary, size: 22),
                ),
                title: const Text('Generate with Google Flow / Veo AI', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text('Create video from text/image prompt', style: TextStyle(color: Colors.white38, fontSize: 11)),
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const VeoGeneratorScreen()));
                },
              ),
              const Divider(color: Colors.white10),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: Colors.white10, shape: BoxShape.circle),
                  child: const Icon(Icons.edit_note_rounded, color: Colors.white70, size: 22),
                ),
                title: const Text('Start Blank Project', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text('Open empty multi-track canvas', style: TextStyle(color: Colors.white38, fontSize: 11)),
                onTap: () {
                  Navigator.pop(ctx);
                  _handleNewProjectChoice(context, fromGallery: false);
                },
              ),
            ],
          ),
        );
      },
    );
  }

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
                        Text('FAHI VIDS', style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w900, letterSpacing: 0.8)),
                        Text('CapCut Pro 1:1 Video Editor', style: TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.dashboard_customize_outlined, color: AppColors.primary),
                      tooltip: 'Template Marketplace',
                      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TemplateHubScreen())),
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
                  onTap: () => _showNewProjectModal(context),
                  child: Container(
                    height: 110,
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
                            Text('Import Video from Gallery or AI', style: TextStyle(color: Colors.black87, fontSize: 12, fontWeight: FontWeight.w600)),
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
                    const Text('World-Class AI Studio Suite', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
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
                            title: 'AI Script & Hook',
                            subtitle: 'Viral 30s Shorts',
                            icon: Icons.psychology_rounded,
                            gradient: const LinearGradient(colors: [Color(0xFFFF0055), Color(0xFF7928CA)]),
                            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ScriptGeneratorScreen())),
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
                            title: 'ElevenLabs Voice',
                            subtitle: 'AI Voiceover Studio',
                            icon: Icons.record_voice_over_rounded,
                            gradient: const LinearGradient(colors: [AppColors.success, Color(0xFF00B0FF)]),
                            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TtsGeneratorScreen())),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildToolCard(
                            context: context,
                            title: 'Trending Templates',
                            subtitle: 'CapCut Marketplace',
                            icon: Icons.grid_view_rounded,
                            gradient: const LinearGradient(colors: [Color(0xFFFF9100), Color(0xFFFF5252)]),
                            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TemplateHubScreen())),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 28)),

            // Recent Projects Header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Recent Projects', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                    InkWell(
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VideoDownloaderScreen())),
                      child: const Text('+ Download Video', style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 12)),

            // Real Projects List
            if (_projects.isEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Column(
                      children: const [
                        Icon(Icons.video_library_outlined, size: 40, color: Colors.white24),
                        SizedBox(height: 8),
                        Text('No projects yet', style: TextStyle(color: Colors.white54, fontSize: 13)),
                        SizedBox(height: 4),
                        Text('Tap "+ New Project" to import and edit your video', style: TextStyle(color: Colors.white24, fontSize: 11)),
                      ],
                    ),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) {
                      final p = _projects[i];
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
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.movie_outlined, color: AppColors.primary, size: 22),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(p.title, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 4),
                                  Text('${(p.durationMs / 1000).toStringAsFixed(1)}s • ${p.aspectRatio}', style: const TextStyle(color: Colors.white38, fontSize: 11)),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.edit_rounded, color: AppColors.primary, size: 20),
                              onPressed: () {
                                context.read<EditorStateProvider>().setProjectName(p.title);
                                context.read<TimelineProvider>().loadProjectTracks(p.tracks);
                                Navigator.push(context, MaterialPageRoute(builder: (_) => const EditorScreen()));
                              },
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline_rounded, color: Colors.white30, size: 18),
                              onPressed: () async {
                                await ProjectManagerService.deleteProject(p.id);
                                _loadProjects();
                              },
                            ),
                          ],
                        ),
                      );
                    },
                    childCount: _projects.length,
                  ),
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
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: gradient,
              ),
              child: Icon(icon, color: Colors.white, size: 18),
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
}
