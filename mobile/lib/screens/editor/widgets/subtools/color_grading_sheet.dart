import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/theme_colors.dart';
import '../../../../providers/timeline_provider.dart';

class ColorGradingSheet extends StatelessWidget {
  const ColorGradingSheet({super.key});

  @override
  Widget build(BuildContext context) {
    final timeline = context.watch<TimelineProvider>();
    final selectedItem = timeline.selectedItem;
    final cg = selectedItem?.colorGrading;

    return Container(
      height: 420,
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Video Adjustments & Color Grading', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white70),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _buildSliderRow(
                  label: 'Brightness',
                  icon: Icons.brightness_6_rounded,
                  value: cg?.brightness ?? 0.0,
                  min: -1.0,
                  max: 1.0,
                  onChanged: (val) {
                    if (selectedItem != null) {
                      selectedItem.colorGrading.brightness = val;
                      timeline.updateTrackItem(selectedItem);
                    }
                  },
                ),
                _buildSliderRow(
                  label: 'Contrast',
                  icon: Icons.contrast_rounded,
                  value: cg?.contrast ?? 1.0,
                  min: 0.0,
                  max: 2.0,
                  onChanged: (val) {
                    if (selectedItem != null) {
                      selectedItem.colorGrading.contrast = val;
                      timeline.updateTrackItem(selectedItem);
                    }
                  },
                ),
                _buildSliderRow(
                  label: 'Saturation',
                  icon: Icons.palette_rounded,
                  value: cg?.saturation ?? 1.0,
                  min: 0.0,
                  max: 2.0,
                  onChanged: (val) {
                    if (selectedItem != null) {
                      selectedItem.colorGrading.saturation = val;
                      timeline.updateTrackItem(selectedItem);
                    }
                  },
                ),
                _buildSliderRow(
                  label: 'Exposure',
                  icon: Icons.exposure_rounded,
                  value: cg?.exposure ?? 0.0,
                  min: -1.0,
                  max: 1.0,
                  onChanged: (val) {
                    if (selectedItem != null) {
                      selectedItem.colorGrading.exposure = val;
                      timeline.updateTrackItem(selectedItem);
                    }
                  },
                ),
                _buildSliderRow(
                  label: 'Temperature (Warmth)',
                  icon: Icons.thermostat_rounded,
                  value: cg?.temperature ?? 0.0,
                  min: -1.0,
                  max: 1.0,
                  onChanged: (val) {
                    if (selectedItem != null) {
                      selectedItem.colorGrading.temperature = val;
                      timeline.updateTrackItem(selectedItem);
                    }
                  },
                ),
                _buildSliderRow(
                  label: 'Vignette',
                  icon: Icons.vignette_rounded,
                  value: cg?.vignette ?? 0.0,
                  min: 0.0,
                  max: 1.0,
                  onChanged: (val) {
                    if (selectedItem != null) {
                      selectedItem.colorGrading.vignette = val;
                      timeline.updateTrackItem(selectedItem);
                    }
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSliderRow({
    required String label,
    required IconData icon,
    required double value,
    required double min,
    required double max,
    required ValueChanged<double> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.primary),
          const SizedBox(width: 8),
          SizedBox(
            width: 100,
            child: Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
          ),
          Expanded(
            child: Slider(
              value: value.clamp(min, max),
              min: min,
              max: max,
              activeColor: AppColors.primary,
              onChanged: onChanged,
            ),
          ),
          SizedBox(
            width: 38,
            child: Text(
              value.toStringAsFixed(1),
              textAlign: TextAlign.end,
              style: const TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}
