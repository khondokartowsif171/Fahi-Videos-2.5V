import 'package:flutter/material.dart';

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
  }) : sourceEndMs = sourceEndMs ?? durationMs;

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
