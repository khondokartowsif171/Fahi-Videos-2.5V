import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
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

  List<TrackItem> get tracks => _tracks;
  int get currentTimeMs => _currentTimeMs;
  int get totalDurationMs => _totalDurationMs;
  bool get isPlaying => _isPlaying;
  TrackItem? get selectedItem => _selectedItem;
  double get zoomLevel => _zoomLevel;

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
    _initSampleProject();
  }

  void _initSampleProject() {
    final sampleVideo = TrackItem(
      id: const Uuid().v4(),
      type: TrackType.video,
      title: 'Main Clip.mp4',
      sourcePath: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      startTimeMs: 0,
      durationMs: 8000,
      sourceStartMs: 0,
      sourceEndMs: 8000,
    );

    final sampleAudio = TrackItem(
      id: const Uuid().v4(),
      type: TrackType.audio,
      title: 'Cinematic BGM.mp3',
      startTimeMs: 0,
      durationMs: 8000,
      volume: 0.8,
    );

    final sampleText = TrackItem(
      id: const Uuid().v4(),
      type: TrackType.text,
      title: 'Title Text',
      textContent: 'FAHI VIDEOS PRO',
      startTimeMs: 1000,
      durationMs: 4000,
      fontSize: 28,
      textColor: Colors.cyanAccent,
    );

    _tracks.addAll([sampleVideo, sampleAudio, sampleText]);
    _recalcTotalDuration();
    _saveState();
  }

  void seekTo(int timeMs) {
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

    // Check if playhead is strictly inside the clip bounds
    if (_currentTimeMs <= item.startTimeMs ||
        _currentTimeMs >= (item.startTimeMs + item.durationMs)) {
      return;
    }

    final firstPartDuration = _currentTimeMs - item.startTimeMs;
    final secondPartDuration = item.durationMs - firstPartDuration;

    // Modify original clip to end at playhead
    item.durationMs = firstPartDuration;
    item.sourceEndMs = item.sourceStartMs + (firstPartDuration * item.speed).round();

    // Create second clip starting from playhead
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

  /// Trim selected clip start/end (CapCut Trim feature)
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
