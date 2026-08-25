import 'package:flutter/material.dart';

enum VoiceEffectType { pitch, filter, character }

class VoiceEffectPreset {
  final String id;
  final String name;
  final VoiceEffectType type;
  final IconData icon;
  final double pitchShift; // -12 to +12 semitones
  final String description;

  const VoiceEffectPreset({
    required this.id,
    required this.name,
    required this.type,
    required this.icon,
    required this.pitchShift,
    required this.description,
  });

  static const List<VoiceEffectPreset> presets = [
    VoiceEffectPreset(id: 'none', name: 'Normal', type: VoiceEffectType.pitch, icon: Icons.mic_none_rounded, pitchShift: 0.0, description: 'Original voice pitch'),
    VoiceEffectPreset(id: 'chipmunk', name: 'Chipmunk (High)', type: VoiceEffectType.character, icon: Icons.pets_rounded, pitchShift: 8.0, description: 'Funny high-pitched cute voice'),
    VoiceEffectPreset(id: 'deep_voice', name: 'Deep Bass (Low)', type: VoiceEffectType.character, icon: Icons.speaker_phone_rounded, pitchShift: -6.0, description: 'Deep bass cinematic voice'),
    VoiceEffectPreset(id: 'robot', name: 'Cyber Robot', type: VoiceEffectType.filter, icon: Icons.smart_toy_rounded, pitchShift: -2.0, description: 'Metallic synthesized robotic timbre'),
    VoiceEffectPreset(id: 'megaphone', name: 'Megaphone', type: VoiceEffectType.filter, icon: Icons.campaign_rounded, pitchShift: 2.0, description: 'Vintage megaphone speaker output'),
    VoiceEffectPreset(id: 'echo', name: 'Studio Echo / Reverb', type: VoiceEffectType.filter, icon: Icons.surround_sound_rounded, pitchShift: 0.0, description: 'Spacious stadium reverb acoustic'),
    VoiceEffectPreset(id: 'monster', name: 'Monster / Demon', type: VoiceEffectType.character, icon: Icons.theater_comedy_rounded, pitchShift: -10.0, description: 'Dark menacing monster vocal'),
    VoiceEffectPreset(id: 'helium', name: 'Helium Gas', type: VoiceEffectType.character, icon: Icons.air_rounded, pitchShift: 10.0, description: 'Ultra high pitch helium effect'),
  ];
}
