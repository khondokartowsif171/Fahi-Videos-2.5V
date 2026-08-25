import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../models/keyframe_model.dart';
import '../models/track_item.dart';

class KeyframeProvider extends ChangeNotifier {
  /// Adds or updates a keyframe at the current playhead position for the given track item
  void toggleKeyframeAt({
    required TrackItem item,
    required int currentPlayheadMs,
    Offset? position,
    double? scale,
    double? rotation,
    double? opacity,
  }) {
    final offsetMs = currentPlayheadMs - item.startTimeMs;
    if (offsetMs < 0 || offsetMs > item.durationMs) return;

    final existingIndex = item.keyframes.indexWhere((k) => (k.timeOffsetMs - offsetMs).abs() < 100);

    if (existingIndex != -1) {
      // Remove existing keyframe if tapped again on the exact same point
      item.keyframes.removeAt(existingIndex);
    } else {
      // Add new keyframe point
      final newKf = KeyframePoint(
        id: const Uuid().v4(),
        timeOffsetMs: offsetMs,
        position: position ?? item.position,
        scale: scale ?? item.scale,
        rotation: rotation ?? item.rotation,
        opacity: opacity ?? item.opacity,
      );
      item.keyframes.add(newKf);
      item.keyframes.sort((a, b) => a.timeOffsetMs.compareTo(b.timeOffsetMs));
    }

    notifyListeners();
  }

  /// Calculates interpolated values (Position, Scale, Rotation, Opacity) at exact playhead time
  Map<String, dynamic> interpolateClipProperties(TrackItem item, int currentPlayheadMs) {
    if (item.keyframes.isEmpty) {
      return {
        'position': item.position,
        'scale': item.scale,
        'rotation': item.rotation,
        'opacity': item.opacity,
      };
    }

    final offsetMs = currentPlayheadMs - item.startTimeMs;

    // Before first keyframe
    if (offsetMs <= item.keyframes.first.timeOffsetMs) {
      final kf = item.keyframes.first;
      return {'position': kf.position, 'scale': kf.scale, 'rotation': kf.rotation, 'opacity': kf.opacity};
    }

    // After last keyframe
    if (offsetMs >= item.keyframes.last.timeOffsetMs) {
      final kf = item.keyframes.last;
      return {'position': kf.position, 'scale': kf.scale, 'rotation': kf.rotation, 'opacity': kf.opacity};
    }

    // Find bounding keyframes
    for (int i = 0; i < item.keyframes.length - 1; i++) {
      final kf1 = item.keyframes[i];
      final kf2 = item.keyframes[i + 1];

      if (offsetMs >= kf1.timeOffsetMs && offsetMs <= kf2.timeOffsetMs) {
        final span = kf2.timeOffsetMs - kf1.timeOffsetMs;
        final t = (span == 0) ? 0.0 : ((offsetMs - kf1.timeOffsetMs) / span).clamp(0.0, 1.0);

        return {
          'position': Offset.lerp(kf1.position, kf2.position, t) ?? kf1.position,
          'scale': kf1.scale + (kf2.scale - kf1.scale) * t,
          'rotation': kf1.rotation + (kf2.rotation - kf1.rotation) * t,
          'opacity': kf1.opacity + (kf2.opacity - kf1.opacity) * t,
        };
      }
    }

    return {'position': item.position, 'scale': item.scale, 'rotation': item.rotation, 'opacity': item.opacity};
  }
}
