import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/track_item.dart';

class LocalProject {
  final String id;
  final String title;
  final String? previewVideoPath;
  final int durationMs;
  final String aspectRatio;
  final DateTime updatedAt;
  final List<TrackItem> tracks;

  LocalProject({
    required this.id,
    required this.title,
    this.previewVideoPath,
    required this.durationMs,
    required this.aspectRatio,
    required this.updatedAt,
    required this.tracks,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'previewVideoPath': previewVideoPath,
        'durationMs': durationMs,
        'aspectRatio': aspectRatio,
        'updatedAt': updatedAt.toIso8601String(),
        'tracks': tracks.map((t) => t.toJson()).toList(),
      };

  factory LocalProject.fromJson(Map<String, dynamic> json) => LocalProject(
        id: json['id'] as String,
        title: json['title'] as String,
        previewVideoPath: json['previewVideoPath'] as String?,
        durationMs: json['durationMs'] as int? ?? 10000,
        aspectRatio: json['aspectRatio'] as String? ?? '9:16',
        updatedAt: DateTime.tryParse(json['updatedAt'] ?? '') ?? DateTime.now(),
        tracks: (json['tracks'] as List<dynamic>?)
                ?.map((e) => TrackItem.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
      );
}

class ProjectManagerService {
  static const _storageKey = 'fahi_user_projects_v1';

  static Future<List<LocalProject>> getProjects() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);
    if (raw == null || raw.isEmpty) return [];

    try {
      final List<dynamic> decoded = jsonDecode(raw);
      return decoded.map((e) => LocalProject.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> saveProject(LocalProject project) async {
    final projects = await getProjects();
    final index = projects.indexWhere((p) => p.id == project.id);
    if (index != -1) {
      projects[index] = project;
    } else {
      projects.insert(0, project);
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey, jsonEncode(projects.map((p) => p.toJson()).toList()));
  }

  static Future<void> deleteProject(String id) async {
    final projects = await getProjects();
    projects.removeWhere((p) => p.id == id);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey, jsonEncode(projects.map((p) => p.toJson()).toList()));
  }
}
