import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme_colors.dart';
import '../../providers/timeline_provider.dart';
import '../../services/script_generator_service.dart';

class ScriptGeneratorScreen extends StatefulWidget {
  const ScriptGeneratorScreen({super.key});

  @override
  State<ScriptGeneratorScreen> createState() => _ScriptGeneratorScreenState();
}

class _ScriptGeneratorScreenState extends State<ScriptGeneratorScreen> {
  final TextEditingController _topicController = TextEditingController();
  final ScriptGeneratorService _service = ScriptGeneratorService();

  bool _isGenerating = false;
  ViralScriptResult? _result;

  @override
  void dispose() {
    _topicController.dispose();
    super.dispose();
  }

  void _generateScript() async {
    if (_topicController.text.trim().isEmpty) return;
    setState(() {
      _isGenerating = true;
      _result = null;
    });

    final res = await _service.generateViralScript(topic: _topicController.text.trim());
    setState(() {
      _isGenerating = false;
      _result = res;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('AI Viral Script & Hook Studio', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('What is your video about?', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.surfaceBorder),
              ),
              child: TextField(
                controller: _topicController,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                decoration: const InputDecoration(
                  hintText: 'e.g. 3 secret AI tools that make \$10,000/month...',
                  hintStyle: TextStyle(color: Colors.white30, fontSize: 13),
                  contentPadding: EdgeInsets.all(14),
                  border: InputBorder.none,
                ),
              ),
            ),

            const SizedBox(height: 16),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isGenerating ? null : _generateScript,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.secondary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: _isGenerating
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.auto_awesome_rounded),
                label: Text(
                  _isGenerating ? 'Synthesizing Viral Hook...' : 'Generate 30s Viral Script',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),

            if (_result != null) ...[
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.secondary.withOpacity(0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: AppColors.secondary, borderRadius: BorderRadius.circular(6)),
                          child: const Text('VIRAL HOOK (0-3s)', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _result!.viralHook,
                      style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                    ),

                    const Divider(color: Colors.white12, height: 24),

                    const Text('Scene Breakdown & B-Roll Cues:', style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),

                    ..._result!.scenes.map((s) => Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Text('• $s', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                        )),

                    const Divider(color: Colors.white12, height: 24),

                    const Text('Call to Action (CTA):', style: TextStyle(color: AppColors.success, fontSize: 12, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(_result!.callToAction, style: const TextStyle(color: Colors.white, fontSize: 12, fontStyle: FontStyle.italic)),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
