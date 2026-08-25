import 'package:flutter/material.dart';

enum AspectRatioPreset { ratio9_16, ratio16_9, ratio1_1, ratio4_5 }

enum ActiveBottomTool {
  none,
  edit,
  audio,
  text,
  stickers,
  effects,
  filters,
  speed,
  canvas,
  export,
}

class EditorStateProvider extends ChangeNotifier {
  String _projectName = 'Untitled Project';
  AspectRatioPreset _aspectRatio = AspectRatioPreset.ratio9_16;
  Color _canvasBackgroundColor = Colors.black;
  ActiveBottomTool _activeTool = ActiveBottomTool.none;
  
  bool _isExporting = false;
  double _exportProgress = 0.0;
  String _exportResolution = '1080p';
  int _exportFps = 30;

  String get projectName => _projectName;
  AspectRatioPreset get aspectRatio => _aspectRatio;
  Color get canvasBackgroundColor => _canvasBackgroundColor;
  ActiveBottomTool get activeTool => _activeTool;
  bool get isExporting => _isExporting;
  double get exportProgress => _exportProgress;
  String get exportResolution => _exportResolution;
  int get exportFps => _exportFps;

  double get aspectRatioValue {
    switch (_aspectRatio) {
      case AspectRatioPreset.ratio9_16:
        return 9 / 16;
      case AspectRatioPreset.ratio16_9:
        return 16 / 9;
      case AspectRatioPreset.ratio1_1:
        return 1 / 1;
      case AspectRatioPreset.ratio4_5:
        return 4 / 5;
    }
  }

  void setProjectName(String name) {
    _projectName = name;
    notifyListeners();
  }

  void setAspectRatio(AspectRatioPreset ratio) {
    _aspectRatio = ratio;
    notifyListeners();
  }

  void setCanvasBackgroundColor(Color color) {
    _canvasBackgroundColor = color;
    notifyListeners();
  }

  void setActiveTool(ActiveBottomTool tool) {
    _activeTool = _activeTool == tool ? ActiveBottomTool.none : tool;
    notifyListeners();
  }

  void startExport({String resolution = '1080p', int fps = 30}) {
    _isExporting = true;
    _exportResolution = resolution;
    _exportFps = fps;
    _exportProgress = 0.0;
    notifyListeners();
  }

  void updateExportProgress(double progress) {
    _exportProgress = progress.clamp(0.0, 1.0);
    if (_exportProgress >= 1.0) {
      _isExporting = false;
    }
    notifyListeners();
  }

  void cancelExport() {
    _isExporting = false;
    _exportProgress = 0.0;
    notifyListeners();
  }
}
