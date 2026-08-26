import 'dart:math';
import '../models/color_grading_model.dart';
import '../models/filter_model.dart';

class ColorMatrixHelper {
  /// Generate a 4x5 ColorFilter matrix combining adjustments and presets
  static List<double> generateCombinedMatrix({
    required ColorGradingSettings adjustments,
    String? filterId,
  }) {
    // Start with identity matrix
    List<double> matrix = [
      1, 0, 0, 0, 0,
      0, 1, 0, 0, 0,
      0, 0, 1, 0, 0,
      0, 0, 0, 1, 0,
    ];

    // 1. Apply Preset Filter Modifiers
    double filterBrightness = 0.0;
    double filterContrast = 1.0;
    double filterSaturation = 1.0;

    if (filterId != null) {
      final preset = VideoFilterPreset.presets.firstWhere(
        (p) => p.id == filterId,
        orElse: () => VideoFilterPreset.presets.first,
      );
      filterBrightness = preset.brightness;
      filterContrast = preset.contrast;
      filterSaturation = preset.saturation;
    }

    final totalBrightness = (adjustments.brightness + adjustments.exposure + filterBrightness).clamp(-1.0, 1.0);
    final totalContrast = (adjustments.contrast * filterContrast).clamp(0.0, 3.0);
    final totalSaturation = (adjustments.saturation * filterSaturation).clamp(0.0, 3.0);
    final temp = adjustments.temperature.clamp(-1.0, 1.0);

    // Brightness offset in 0-255 scale
    final bOffset = totalBrightness * 128.0;

    // Contrast scale & offset
    final cScale = totalContrast;
    final cOffset = 128.0 * (1.0 - cScale);

    // Saturation coefficients (ITU-R BT.709 standard for luma)
    final rw = 0.2126;
    final gw = 0.7152;
    final bw = 0.0722;
    final invSat = 1.0 - totalSaturation;
    final sr = invSat * rw;
    final sg = invSat * gw;
    final sb = invSat * bw;

    // Temperature offset: warm boosts red & lowers blue; cold boosts blue & lowers red
    final tempR = temp > 0 ? (temp * 30.0) : 0.0;
    final tempB = temp < 0 ? (-temp * 30.0) : (temp * -20.0);

    // Calculate final matrix components
    final r0 = (sr + totalSaturation) * cScale;
    final r1 = sg * cScale;
    final r2 = sb * cScale;
    final r4 = bOffset + cOffset + tempR;

    final g0 = sr * cScale;
    final g1 = (sg + totalSaturation) * cScale;
    final g2 = sb * cScale;
    final g4 = bOffset + cOffset;

    final b0 = sr * cScale;
    final b1 = sg * cScale;
    final b2 = (sb + totalSaturation) * cScale;
    final b4 = bOffset + cOffset + tempB;

    return [
      r0, r1, r2, 0, r4,
      g0, g1, g2, 0, g4,
      b0, b1, b2, 0, b4,
      0, 0, 0, 1, 0,
    ];
  }
}
