import 'package:flutter/material.dart';

enum TransitionCategory { basic, camera, mg, glitch, distortion, slide }

class TransitionPreset {
  final String id;
  final String name;
  final TransitionCategory category;
  final IconData icon;
  final String description;

  const TransitionPreset({
    required this.id,
    required this.name,
    required this.category,
    required this.icon,
    required this.description,
  });

  static const List<TransitionPreset> presets = [
    // Basic
    TransitionPreset(id: 'fade_black', name: 'Black Fade', category: TransitionCategory.basic, icon: Icons.brightness_1_rounded, description: 'Fade through black'),
    TransitionPreset(id: 'fade_white', name: 'White Flash', category: TransitionCategory.basic, icon: Icons.flash_on_rounded, description: 'Bright white flash transition'),
    TransitionPreset(id: 'cross_dissolve', name: 'Dissolve', category: TransitionCategory.basic, icon: Icons.blur_on_rounded, description: 'Smooth cross-fade blend'),

    // Camera
    TransitionPreset(id: 'zoom_in', name: 'Zoom In', category: TransitionCategory.camera, icon: Icons.zoom_in_rounded, description: 'Dynamic camera push-in'),
    TransitionPreset(id: 'zoom_out', name: 'Zoom Out', category: TransitionCategory.camera, icon: Icons.zoom_out_rounded, description: 'Dynamic camera pull-out'),
    TransitionPreset(id: 'camera_shake', name: 'Shake', category: TransitionCategory.camera, icon: Icons.vibration_rounded, description: 'Energetic camera shake impact'),
    TransitionPreset(id: 'whip_right', name: 'Whip Pan', category: TransitionCategory.camera, icon: Icons.swap_horiz_rounded, description: 'Fast motion blur pan'),

    // Glitch & 3D
    TransitionPreset(id: 'rgb_glitch', name: 'RGB Glitch', category: TransitionCategory.glitch, icon: Icons.broken_image_rounded, description: 'Cyberpunk chromatic aberration'),
    TransitionPreset(id: 'cube_3d', name: '3D Cube', category: TransitionCategory.distortion, icon: Icons.view_in_ar_rounded, description: '3D rotating cube flip'),
    TransitionPreset(id: 'warp_zoom', name: 'Warp Zoom', category: TransitionCategory.distortion, icon: Icons.blur_circular_rounded, description: 'Radial optical warp distortion'),

    // Slide
    TransitionPreset(id: 'slide_left', name: 'Slide Left', category: TransitionCategory.slide, icon: Icons.arrow_back_rounded, description: 'Smooth leftward push'),
    TransitionPreset(id: 'slide_up', name: 'Slide Up', category: TransitionCategory.slide, icon: Icons.arrow_upward_rounded, description: 'Upward swipe reveal'),
  ];
}
