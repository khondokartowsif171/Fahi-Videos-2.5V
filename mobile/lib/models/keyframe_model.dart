import 'package:flutter/material.dart';

enum KeyframeEasing { linear, easeIn, easeOut, easeInOut, bounce }

class KeyframePoint {
  final String id;
  final int timeOffsetMs; // Offset relative to clip start
  final Offset position;  // Center offset (-1.0 to 1.0)
  final double scale;     // 0.1 to 5.0
  final double rotation;  // in radians
  final double opacity;   // 0.0 to 1.0
  final KeyframeEasing easing;

  const KeyframePoint({
    required this.id,
    required this.timeOffsetMs,
    this.position = Offset.zero,
    this.scale = 1.0,
    this.rotation = 0.0,
    this.opacity = 1.0,
    this.easing = KeyframeEasing.easeInOut,
  });

  KeyframePoint copyWith({
    String? id,
    int? timeOffsetMs,
    Offset? position,
    double? scale,
    double? rotation,
    double? opacity,
    KeyframeEasing? easing,
  }) {
    return KeyframePoint(
      id: id ?? this.id,
      timeOffsetMs: timeOffsetMs ?? this.timeOffsetMs,
      position: position ?? this.position,
      scale: scale ?? this.scale,
      rotation: rotation ?? this.rotation,
      opacity: opacity ?? this.opacity,
      easing: easing ?? this.easing,
    );
  }
}
