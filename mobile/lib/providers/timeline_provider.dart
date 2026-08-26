import 'dart:io';
import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import 'package:video_player/video_player.dart';
import '../models/track_item.dart';

class TimelineProvider extends ChangeNotifier {
  final List<TrackItem> _tracks = [];
  final List<List<TrackItem>> _history = [];
  int _historyIndex = -1;

  int _currentTimeMs = 0;
  int _totalDurationMs = 15000; // Default 15s project duration
  bool _isPlaying = false;
  TrackItem? _selectedItem;
  double _zoomLevel = 1.0; // 0.5x to 3.0x timeline scale
  bool _isGlobalMuted = false;

  List<TrackItem> get tracks => _tracks;
  int get currentTimeMs => _currentTimeMs;
  int get totalDurationMs => _totalDurationMs;
  bool get isPlaying => _isPlaying;
  TrackItem? get selectedItem => _selectedItem;
  double get zoomLevel => _zoomLevel;
  bool get isGlobalMuted => _isGlobalMuted;

  // Filter tracks by category
  List<TrackItem> get videoTracks =>
      _tracks.where((t) => t.type == TrackType.video).toList();
  List<TrackItem> get audioTracks =>
      _tracks.where((t) => t.type == TrackType.audio).toList();
  List<TrackItem> get textTracks =>
      _tracks.where((t) => t.type == TrackType.text).toList();
  List<TrackItem> get effectTracks =>
      _tracks.where((t) => t.type == TrackType.effect).toList();
  List<TrackItem> get stickerTracks =>
      _tracks.where((t) => t.type == TrackType.sticker).toList();

  TimelineProvider() {
    _initDefaultProject();
  }

  void _initDefaultProject() {
    _tracks.clear();
    _recalcTotalDuration();
    _saveState();
  }

  void loadProjectTracks(List<TrackItem> items) {
    _tracks.clear();
    _tracks.addAll(items);
    _selectedItem = _tracks.firstOrNull;
    _currentTimeMs = 0;
    _recalcTotalDuration();
    _saveState();
    notifyListeners();
  }

  void toggleGlobalMute() {
    _isGlobalMuted = !_isGlobalMuted;
    notifyListeners();
  }

  Future<void> importMediaFile(String filePath, {required TrackType type, String? title}) async {
    int detectedDurationMs = 5000;

    if (type == TrackType.video && File(filePath).existsSync()) {
      try {
        final ctrl = VideoPlayerController.file(File(filePath));
        await ctrl.initialize();
        detectedDurationMs = ctrl.value.duration.inMilliseconds;
        await ctrl.dispose();
      } catch (_) {
        detectedDurationMs = 5000;
      }
    }

    int startOffset = 0;
    final existingOfType = _tracks.where((t) => t.type == type).toList();
    if (existingOfType.isNotEmpty) {
      final lastItem = existingOfType.reduce((a, b) => (a.startTimeMs + a.durationMs) > (b.startTimeMs + b.durationMs) ? a : b);
      startOffset = lastItem.startTimeMs + lastItem.durationMs;
    }

    final newItem = TrackItem(
      id: const Uuid().v4(),
      type: type,
      title: title ?? (filePath.split(Platform.pathSeparator).lastOrNull ?? 'Clip'),
      sourcePath: filePath,
      startTimeMs: startOffset,
      durationMs: detectedDurationMs,
      sourceStartMs: 0,
      sourceEndMs: detectedDurationMs,
    );

    _tracks.add(newItem);
    _selectedItem = newItem;
    _recalcTotalDuration();
    _saveState();
    notifyListeners();
  }

  void seekTo(int timeMs) {
    _currentTimeMs = timeMs.clamp(0, _totalDurationMs);
    notifyListeners();
  }

  void updatePlaybackPosition(int timeMs) {
    _currentTimeMs = timeMs.clamp(0, _totalDurationMs);
    notifyListeners();
  }

  void setPlaying(bool playing) {
    _isPlaying = playing;
    notifyListeners();
  }

  void selectItem(TrackItem? item) {
    _selectedItem = item;
    notifyListeners();
  }

  void setZoomLevel(double zoom) {
    _zoomLevel = zoom.clamp(0.5, 4.0);
    notifyListeners();
  }

  void addTrackItem(TrackItem item) {
    _tracks.add(item);
    _selectedItem = item;
    _recalcTotalDuration();
    _saveState();
    notifyListeners();
  }

  void updateTrackItem(TrackItem item) {
    final index = _tracks.indexWhere((t) => t.id == item.id);
    if (index != -1) {
      _tracks[index] = item;
      if (_selectedItem?.id == item.id) {
        _selectedItem = item;
      }
      _recalcTotalDuration();
      _saveState();
      notifyListeners();
    }
  }

  void removeTrackItem(String id) {
    _tracks.removeWhere((t) => t.id == id);
    if (_selectedItem?.id == id) {
      _selectedItem = null;
    }
    _recalcTotalDuration();
    _saveState();
    notifyListeners();
  }

  /// Split selected clip at current playhead position (CapCut Split feature)
  void splitSelectedItem() {
    if (_selectedItem == null) return;
    final item = _selectedItem!;

    if (_currentTimeMs <= item.startTimeMs ||
        _currentTimeMs >= (item.startTimeMs + item.durationMs)) {
      return;
    }

    final firstPartDuration = _currentTimeMs - item.startTimeMs;
    final secondPartDuration = item.durationMs - firstPartDuration;

    item.durationMs = firstPartDuration;
    item.sourceEndMs = item.sourceStartMs + (firstPartDuration * item.speed).round();

    final secondItem = item.copyWith(
      id: const Uuid().v4(),
      title: '${item.title} (Part 2)',
      startTimeMs: _currentTimeMs,
      durationMs: secondPartDuration,
      sourceStartMs: item.sourceEndMs,
      sourceEndMs: item.sourceEndMs + (secondPartDuration * item.speed).round(),
    );

    _tracks.add(secondItem);
    _selectedItem = secondItem;
    _saveState();
    notifyListeners();
  }

  /// Duplicate selected clip (CapCut Copy feature)
  void duplicateSelectedItem() {
    if (_selectedItem == null) return;
    final item = _selectedItem!;
    final newItem = item.copyWith(
      id: const Uuid().v4(),
      title: '${item.title} (Copy)',
      startTimeMs: item.startTimeMs + item.durationMs,
    );
    _tracks.add(newItem);
    _selectedItem = newItem;
    _recalcTotalDuration();
    _saveState();
    notifyListeners();
  }

  /// Extract Audio from Video (CapCut Extract Audio feature)
  void extractAudioFromSelected() {
    if (_selectedItem == null || _selectedItem!.type != TrackType.video) return;
    final item = _selectedItem!;
    
    // Mute source video clip
    item.volume = 0.0;

    // Create extracted audio track
    final extractedAudio = TrackItem(
      id: const Uuid().v4(),
      type: TrackType.audio,
      title: 'Audio: ${item.title}',
      sourcePath: item.sourcePath,
      startTimeMs: item.startTimeMs,
      durationMs: item.durationMs,
      sourceStartMs: item.sourceStartMs,
      sourceEndMs: item.sourceEndMs,
      volume: 1.0,
    );

    _tracks.add(extractedAudio);
    _saveState();
    notifyListeners();
  }

  /// Freeze Frame at current playhead (CapCut Freeze feature)
  void freezeSelectedAtPlayhead() {
    if (_selectedItem == null) return;
    final item = _selectedItem!;
    
    const freezeDurationMs = 3000;
    final freezeItem = item.copyWith(
      id: const Uuid().v4(),
      title: 'Freeze Frame',
      startTimeMs: _currentTimeMs,
      durationMs: freezeDurationMs,
      isFrozen: true,
      speed: 0.0,
    );

    _tracks.add(freezeItem);
    _recalcTotalDuration();
    _saveState();
    notifyListeners();
  }

  /// Toggle Reverse Playback
  void toggleReverseSelected() {
    if (_selectedItem == null) return;
    _selectedItem!.isReversed = !_selectedItem!.isReversed;
    _saveState();
    notifyListeners();
  }

  /// Replace Selected Media source
  void replaceSelectedMedia(String newPath, String newTitle) {
    if (_selectedItem == null) return;
    _selectedItem!.sourcePath = newPath;
    _selectedItem!.title = newTitle;
    _saveState();
    notifyListeners();
  }

  /// Trim selected clip start/end
  void trimSelectedItem({int? newStartMs, int? newDurationMs}) {
    if (_selectedItem == null) return;
    if (newStartMs != null) _selectedItem!.startTimeMs = newStartMs;
    if (newDurationMs != null && newDurationMs > 300) {
      _selectedItem!.durationMs = newDurationMs;
    }
    _recalcTotalDuration();
    _saveState();
    notifyListeners();
  }

  /// Adjust speed with automatic duration recalculation
  void setItemSpeed(TrackItem item, double newSpeed) {
    if (newSpeed <= 0) return;
    final ratio = item.speed / newSpeed;
    item.speed = newSpeed;
    item.durationMs = (item.durationMs * ratio).round();
    _recalcTotalDuration();
    _saveState();
    notifyListeners();
  }

  void _recalcTotalDuration() {
    int maxEnd = 5000;
    for (final track in _tracks) {
      final end = track.startTimeMs + track.durationMs;
      if (end > maxEnd) maxEnd = end;
    }
    _totalDurationMs = maxEnd + 1000; // Add 1s padding
  }

  // Undo / Redo Management
  void _saveState() {
    if (_historyIndex < _history.length - 1) {
      _history.removeRange(_historyIndex + 1, _history.length);
    }
    _history.add(_tracks.map((t) => t.copyWith()).toList());
    _historyIndex = _history.length - 1;
  }

  bool get canUndo => _historyIndex > 0;
  bool get canRedo => _historyIndex < _history.length - 1;

  void undo() {
    if (!canUndo) return;
    _historyIndex--;
    _tracks.clear();
    _tracks.addAll(_history[_historyIndex].map((t) => t.copyWith()));
    _selectedItem = null;
    _recalcTotalDuration();
    notifyListeners();
  }

  void redo() {
    if (!canRedo) return;
    _historyIndex++;
    _tracks.clear();
    _tracks.addAll(_history[_historyIndex].map((t) => t.copyWith()));
    _selectedItem = null;
    _recalcTotalDuration();
    notifyListeners();
  }
}
