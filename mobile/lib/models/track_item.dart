import 'package:flutter/material.dart';
import 'clip_animation_model.dart';
import 'color_grading_model.dart';
import 'keyframe_model.dart';
import 'speed_curve_model.dart';
import 'transition_model.dart';
import 'voice_effect_model.dart';

enum TrackType { video, audio, text, sticker, effect, overlay }

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
  Offset position; // Center offset

  // Transitions & In/Out Animations
  TransitionPreset? transition;
  int transitionDurationMs;
  ClipAnimationPreset? inAnimation;
  ClipAnimationPreset? outAnimation;
  ClipAnimationPreset? comboAnimation;

  // Audio / Voice Effects
  VoiceEffectPreset? voiceEffect;
  bool isNoiseReductionActive;

  // Chroma Key (Green Screen)
  Color? chromaKeyColor;
  double chromaIntensity; // 0.0 to 1.0

  // PIP / Overlay Blend Mode
  BlendMode blendMode;

  // Keyframing, Velocity Speed Curves & Cutout
  List<KeyframePoint> keyframes;
  SpeedCurvePreset? speedCurve;
  bool isAutoCutoutActive;

  // Pro Color Grading
  ColorGradingSettings colorGrading;

  // Text / Typography specific
  String? textContent;
  Color? textColor;
  Color? backgroundColor;
  double? fontSize;
  String? fontFamily;
  TextAlign textAlign;

  // Filter Name
  String? filterName;

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
    this.transition,
    this.transitionDurationMs = 500,
    this.inAnimation,
    this.outAnimation,
    this.comboAnimation,
    this.voiceEffect,
    this.isNoiseReductionActive = false,
    this.chromaKeyColor,
    this.chromaIntensity = 0.5,
    this.blendMode = BlendMode.srcOver,
    List<KeyframePoint>? keyframes,
    this.speedCurve,
    this.isAutoCutoutActive = false,
    ColorGradingSettings? colorGrading,
    this.textContent,
    this.textColor = Colors.white,
    this.backgroundColor,
    this.fontSize = 24.0,
    this.fontFamily,
    this.textAlign = TextAlign.center,
    this.filterName,
  })  : sourceEndMs = sourceEndMs ?? durationMs,
        keyframes = keyframes ?? [],
        colorGrading = colorGrading ?? ColorGradingSettings();

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
        'transitionId': transition?.id,
        'transitionDurationMs': transitionDurationMs,
        'inAnimationId': inAnimation?.id,
        'outAnimationId': outAnimation?.id,
        'comboAnimationId': comboAnimation?.id,
        'voiceEffectId': voiceEffect?.id,
        'isNoiseReductionActive': isNoiseReductionActive,
        'chromaKeyColor': chromaKeyColor?.value,
        'chromaIntensity': chromaIntensity,
        'isAutoCutoutActive': isAutoCutoutActive,
        'colorGrading': colorGrading.toJson(),
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
        transition: json['transitionId'] != null ? TransitionPreset.presets.firstWhere((t) => t.id == json['transitionId'], orElse: () => TransitionPreset.presets.first) : null,
        transitionDurationMs: json['transitionDurationMs'] as int? ?? 500,
        isNoiseReductionActive: json['isNoiseReductionActive'] as bool? ?? false,
        chromaKeyColor: json['chromaKeyColor'] != null ? Color(json['chromaKeyColor'] as int) : null,
        chromaIntensity: (json['chromaIntensity'] as num?)?.toDouble() ?? 0.5,
        isAutoCutoutActive: json['isAutoCutoutActive'] as bool? ?? false,
        colorGrading: json['colorGrading'] != null ? ColorGradingSettings.fromJson(json['colorGrading'] as Map<String, dynamic>) : ColorGradingSettings(),
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
    TransitionPreset? transition,
    int? transitionDurationMs,
    ClipAnimationPreset? inAnimation,
    ClipAnimationPreset? outAnimation,
    ClipAnimationPreset? comboAnimation,
    VoiceEffectPreset? voiceEffect,
    bool? isNoiseReductionActive,
    Color? chromaKeyColor,
    double? chromaIntensity,
    BlendMode? blendMode,
    List<KeyframePoint>? keyframes,
    SpeedCurvePreset? speedCurve,
    bool? isAutoCutoutActive,
    ColorGradingSettings? colorGrading,
    String? textContent,
    Color? textColor,
    Color? backgroundColor,
    double? fontSize,
    String? fontFamily,
    TextAlign? textAlign,
    String? filterName,
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
      transition: transition ?? this.transition,
      transitionDurationMs: transitionDurationMs ?? this.transitionDurationMs,
      inAnimation: inAnimation ?? this.inAnimation,
      outAnimation: outAnimation ?? this.outAnimation,
      comboAnimation: comboAnimation ?? this.comboAnimation,
      voiceEffect: voiceEffect ?? this.voiceEffect,
      isNoiseReductionActive: isNoiseReductionActive ?? this.isNoiseReductionActive,
      chromaKeyColor: chromaKeyColor ?? this.chromaKeyColor,
      chromaIntensity: chromaIntensity ?? this.chromaIntensity,
      blendMode: blendMode ?? this.blendMode,
      keyframes: keyframes ?? List.from(this.keyframes),
      speedCurve: speedCurve ?? this.speedCurve,
      isAutoCutoutActive: isAutoCutoutActive ?? this.isAutoCutoutActive,
      colorGrading: colorGrading ?? this.colorGrading.copyWith(),
      textContent: textContent ?? this.textContent,
      textColor: textColor ?? this.textColor,
      backgroundColor: backgroundColor ?? this.backgroundColor,
      fontSize: fontSize ?? this.fontSize,
      fontFamily: fontFamily ?? this.fontFamily,
      textAlign: textAlign ?? this.textAlign,
      filterName: filterName ?? this.filterName,
    );
  }
}
