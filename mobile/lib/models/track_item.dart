import 'package:flutter/material.dart';
import 'keyframe_model.dart';
import 'speed_curve_model.dart';

enum TrackType { video, audio, text, sticker, effect }

class TrackItem {
  final String id;
  final TrackType type;
  String title;
  String? sourcePath; // local file or remote URL
  
  // Timing in Milliseconds
  int startTimeMs;
  int durationMs;
  int sourceStartMs;
  int sourceEndMs;

  // Video & Visual Attributes
  double speed; // 0.1 to 10.0
  double volume; // 0.0 to 2.0
  double opacity;
  double rotation;
  double scale;
  Offset position; // Center offset in normalized (-1 to 1) or pixel coordinates

  // Keyframing & Speed Curves
  List<KeyframePoint> keyframes;
  SpeedCurvePreset? speedCurve;
  bool isAutoCutoutActive;

  // Text / Typography specific
  String? textContent;
  Color? textColor;
  Color? backgroundColor;
  double? fontSize;
  String? fontFamily;
  TextAlign textAlign;

  // Filter & Color Grading
  String? filterName;
  double brightness; // -1.0 to 1.0
  double contrast;   // 0.0 to 2.0
  double saturation; // 0.0 to 2.0

  TrackItem({
    required this.id,
    required this.type,
    required this.title,
    this.sourcePath,
    required this.startTimeMs,
    required this.durationMs,
    this.sourceStartMs = 0,
    int? sourceEndMs,
    this.speed = 1.0,
    this.volume = 1.0,
    this.opacity = 1.0,
    this.rotation = 0.0,
    this.scale = 1.0,
    this.position = Offset.zero,
    List<KeyframePoint>? keyframes,
    this.speedCurve,
    this.isAutoCutoutActive = false,
    this.textContent,
    this.textColor = Colors.white,
    this.backgroundColor,
    this.fontSize = 24.0,
    this.fontFamily,
    this.textAlign = TextAlign.center,
    this.filterName,
    this.brightness = 0.0,
    this.contrast = 1.0,
    this.saturation = 1.0,
  })  : sourceEndMs = sourceEndMs ?? durationMs,
        keyframes = keyframes ?? [];

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        'title': title,
        'sourcePath': sourcePath,
        'startTimeMs': startTimeMs,
        'durationMs': durationMs,
        'sourceStartMs': sourceStartMs,
        'sourceEndMs': sourceEndMs,
        'speed': speed,
        'volume': volume,
        'opacity': opacity,
        'rotation': rotation,
        'scale': scale,
        'isAutoCutoutActive': isAutoCutoutActive,
        'textContent': textContent,
        'textColor': textColor?.value,
        'backgroundColor': backgroundColor?.value,
        'fontSize': fontSize,
        'filterName': filterName,
      };

  factory TrackItem.fromJson(Map<String, dynamic> json) => TrackItem(
        id: json['id'] as String,
        type: TrackType.values.firstWhere((e) => e.name == json['type'], orElse: () => TrackType.video),
        title: json['title'] as String? ?? 'Clip',
        sourcePath: json['sourcePath'] as String?,
        startTimeMs: json['startTimeMs'] as int? ?? 0,
        durationMs: json['durationMs'] as int? ?? 5000,
        sourceStartMs: json['sourceStartMs'] as int? ?? 0,
        sourceEndMs: json['sourceEndMs'] as int? ?? 5000,
        speed: (json['speed'] as num?)?.toDouble() ?? 1.0,
        volume: (json['volume'] as num?)?.toDouble() ?? 1.0,
        opacity: (json['opacity'] as num?)?.toDouble() ?? 1.0,
        rotation: (json['rotation'] as num?)?.toDouble() ?? 0.0,
        scale: (json['scale'] as num?)?.toDouble() ?? 1.0,
        isAutoCutoutActive: json['isAutoCutoutActive'] as bool? ?? false,
        textContent: json['textContent'] as String?,
        textColor: json['textColor'] != null ? Color(json['textColor'] as int) : Colors.white,
        backgroundColor: json['backgroundColor'] != null ? Color(json['backgroundColor'] as int) : null,
        fontSize: (json['fontSize'] as num?)?.toDouble() ?? 24.0,
        filterName: json['filterName'] as String?,
      );

  TrackItem copyWith({
    String? id,
    TrackType? type,
    String? title,
    String? sourcePath,
    int? startTimeMs,
    int? durationMs,
    int? sourceStartMs,
    int? sourceEndMs,
    double? speed,
    double? volume,
    double? opacity,
    double? rotation,
    double? scale,
    Offset? position,
    List<KeyframePoint>? keyframes,
    SpeedCurvePreset? speedCurve,
    bool? isAutoCutoutActive,
    String? textContent,
    Color? textColor,
    Color? backgroundColor,
    double? fontSize,
    String? fontFamily,
    TextAlign? textAlign,
    String? filterName,
    double? brightness,
    double? contrast,
    double? saturation,
  }) {
    return TrackItem(
      id: id ?? this.id,
      type: type ?? this.type,
      title: title ?? this.title,
      sourcePath: sourcePath ?? this.sourcePath,
      startTimeMs: startTimeMs ?? this.startTimeMs,
      durationMs: durationMs ?? this.durationMs,
      sourceStartMs: sourceStartMs ?? this.sourceStartMs,
      sourceEndMs: sourceEndMs ?? this.sourceEndMs,
      speed: speed ?? this.speed,
      volume: volume ?? this.volume,
      opacity: opacity ?? this.opacity,
      rotation: rotation ?? this.rotation,
      scale: scale ?? this.scale,
      position: position ?? this.position,
      keyframes: keyframes ?? List.from(this.keyframes),
      speedCurve: speedCurve ?? this.speedCurve,
      isAutoCutoutActive: isAutoCutoutActive ?? this.isAutoCutoutActive,
      textContent: textContent ?? this.textContent,
      textColor: textColor ?? this.textColor,
      backgroundColor: backgroundColor ?? this.backgroundColor,
      fontSize: fontSize ?? this.fontSize,
      fontFamily: fontFamily ?? this.fontFamily,
      textAlign: textAlign ?? this.textAlign,
      filterName: filterName ?? this.filterName,
      brightness: brightness ?? this.brightness,
      contrast: contrast ?? this.contrast,
      saturation: saturation ?? this.saturation,
    );
  }
}
