import 'package:flutter/material.dart';
import '../models/caption_model.dart';
import '../services/caption_service.dart';

class CaptionProvider extends ChangeNotifier {
  final CaptionService _service = CaptionService();
  final List<CaptionSegment> _segments = [];
  bool _isGenerating = false;
  CaptionStylePreset _currentStyle = CaptionStylePreset.hormoziYellow;

  List<CaptionSegment> get segments => _segments;
  bool get isGenerating => _isGenerating;
  CaptionStylePreset get currentStyle => _currentStyle;

  void setStyle(CaptionStylePreset style) {
    _currentStyle = style;
    for (final seg in _segments) {
      seg.style = style;
    }
    notifyListeners();
  }

  Future<void> generateCaptions(String mediaPath) async {
    _isGenerating = true;
    notifyListeners();

    final results = await _service.generateAutoCaptions(
      mediaPath: mediaPath,
      style: _currentStyle,
    );

    _segments.clear();
    _segments.addAll(results);
    _isGenerating = false;
    notifyListeners();
  }

  void clearCaptions() {
    _segments.clear();
    notifyListeners();
  }
}
