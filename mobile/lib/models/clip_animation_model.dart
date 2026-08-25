import 'package:flutter/material.dart';

enum AnimationType { inAnim, outAnim, combo }

class ClipAnimationPreset {
  final String id;
  final String name;
  final AnimationType type;
  final IconData icon;
  final double defaultDurationSec;

  const ClipAnimationPreset({
    required this.id,
    required this.name,
    required this.type,
    required this.icon,
    this.defaultDurationSec = 0.5,
  });

  static const List<ClipAnimationPreset> inAnimations = [
    ClipAnimationPreset(id: 'in_fade', name: 'Fade In', type: AnimationType.inAnim, icon: Icons.gradient_rounded),
    ClipAnimationPreset(id: 'in_zoom1', name: 'Zoom 1', type: AnimationType.inAnim, icon: Icons.zoom_in_rounded),
    ClipAnimationPreset(id: 'in_zoom2', name: 'Zoom 2 (Impact)', type: AnimationType.inAnim, icon: Icons.center_focus_strong_rounded),
    ClipAnimationPreset(id: 'in_slide_right', name: 'Slide Right', type: AnimationType.inAnim, icon: Icons.arrow_forward_rounded),
    ClipAnimationPreset(id: 'in_bounce', name: 'Bounce Drop', type: AnimationType.inAnim, icon: Icons.sports_basketball_rounded),
    ClipAnimationPreset(id: 'in_swing', name: 'Swing In', type: AnimationType.inAnim, icon: Icons.sync_alt_rounded),
  ];

  static const List<ClipAnimationPreset> outAnimations = [
    ClipAnimationPreset(id: 'out_fade', name: 'Fade Out', type: AnimationType.outAnim, icon: Icons.gradient_rounded),
    ClipAnimationPreset(id: 'out_zoom', name: 'Zoom Out', type: AnimationType.outAnim, icon: Icons.zoom_out_rounded),
    ClipAnimationPreset(id: 'out_slide_left', name: 'Slide Left', type: AnimationType.outAnim, icon: Icons.arrow_back_rounded),
    ClipAnimationPreset(id: 'out_shrink', name: 'Shrink Down', type: AnimationType.outAnim, icon: Icons.close_fullscreen_rounded),
  ];

  static const List<ClipAnimationPreset> comboAnimations = [
    ClipAnimationPreset(id: 'combo_spin_3d', name: '3D Spin Flip', type: AnimationType.combo, icon: Icons.rotate_right_rounded, defaultDurationSec: 1.0),
    ClipAnimationPreset(id: 'combo_pendulum', name: 'Pendulum Sway', type: AnimationType.combo, icon: Icons.swap_calls_rounded, defaultDurationSec: 1.2),
    ClipAnimationPreset(id: 'combo_distort_zoom', name: 'Distort Zoom', type: AnimationType.combo, icon: Icons.blur_on_rounded, defaultDurationSec: 0.8),
    ClipAnimationPreset(id: 'combo_wave', name: 'Wave Warp', type: AnimationType.combo, icon: Icons.waves_rounded, defaultDurationSec: 1.0),
  ];
}
