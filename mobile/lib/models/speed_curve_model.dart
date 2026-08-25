import 'package:flutter/material.dart';

class SpeedCurvePoint {
  final double timePercent; // 0.0 to 1.0
  final double speedFactor; // 0.1x to 10.0x

  const SpeedCurvePoint({
    required this.timePercent,
    required this.speedFactor,
  });
}

class SpeedCurvePreset {
  final String id;
  final String name;
  final String description;
  final IconData icon;
  final List<SpeedCurvePoint> points;

  const SpeedCurvePreset({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.points,
  });

  static const List<SpeedCurvePreset> presets = [
    SpeedCurvePreset(
      id: 'hero',
      name: 'Hero Curve',
      description: 'Slow-motion anticipation then rapid explosive climax',
      icon: Icons.flash_on_rounded,
      points: [
        SpeedCurvePoint(timePercent: 0.0, speedFactor: 1.0),
        SpeedCurvePoint(timePercent: 0.3, speedFactor: 0.3),
        SpeedCurvePoint(timePercent: 0.7, speedFactor: 3.5),
        SpeedCurvePoint(timePercent: 1.0, speedFactor: 1.0),
      ],
    ),
    SpeedCurvePreset(
      id: 'bullet_time',
      name: 'Bullet Time',
      description: 'Ultra-slow matrix freeze at peak action moment',
      icon: Icons.slow_motion_video_rounded,
      points: [
        SpeedCurvePoint(timePercent: 0.0, speedFactor: 2.0),
        SpeedCurvePoint(timePercent: 0.4, speedFactor: 0.1),
        SpeedCurvePoint(timePercent: 0.6, speedFactor: 0.1),
        SpeedCurvePoint(timePercent: 1.0, speedFactor: 2.0),
      ],
    ),
    SpeedCurvePreset(
      id: 'montage',
      name: 'Fast Montage',
      description: 'Rhythmic speed ramp for quick transitions',
      icon: Icons.movie_filter_rounded,
      points: [
        SpeedCurvePoint(timePercent: 0.0, speedFactor: 3.0),
        SpeedCurvePoint(timePercent: 0.5, speedFactor: 0.5),
        SpeedCurvePoint(timePercent: 1.0, speedFactor: 3.0),
      ],
    ),
    SpeedCurvePreset(
      id: 'jump_cut',
      name: 'Jump Cut Accent',
      description: 'Snappy pacing for social media talking head clips',
      icon: Icons.trending_up_rounded,
      points: [
        SpeedCurvePoint(timePercent: 0.0, speedFactor: 1.2),
        SpeedCurvePoint(timePercent: 0.8, speedFactor: 1.2),
        SpeedCurvePoint(timePercent: 1.0, speedFactor: 2.5),
      ],
    ),
  ];
}
