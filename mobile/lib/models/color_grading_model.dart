class ColorGradingSettings {
  double brightness; // -1.0 to 1.0 (default 0.0)
  double contrast;   // 0.0 to 2.0 (default 1.0)
  double saturation; // 0.0 to 2.0 (default 1.0)
  double exposure;   // -1.0 to 1.0 (default 0.0)
  double temperature;// -1.0 (cold/blue) to 1.0 (warm/orange) (default 0.0)
  double vignette;   // 0.0 to 1.0 (default 0.0)
  double sharpen;    // 0.0 to 1.0 (default 0.0)

  ColorGradingSettings({
    this.brightness = 0.0,
    this.contrast = 1.0,
    this.saturation = 1.0,
    this.exposure = 0.0,
    this.temperature = 0.0,
    this.vignette = 0.0,
    this.sharpen = 0.0,
  });

  Map<String, dynamic> toJson() => {
        'brightness': brightness,
        'contrast': contrast,
        'saturation': saturation,
        'exposure': exposure,
        'temperature': temperature,
        'vignette': vignette,
        'sharpen': sharpen,
      };

  factory ColorGradingSettings.fromJson(Map<String, dynamic> json) => ColorGradingSettings(
        brightness: (json['brightness'] as num?)?.toDouble() ?? 0.0,
        contrast: (json['contrast'] as num?)?.toDouble() ?? 1.0,
        saturation: (json['saturation'] as num?)?.toDouble() ?? 1.0,
        exposure: (json['exposure'] as num?)?.toDouble() ?? 0.0,
        temperature: (json['temperature'] as num?)?.toDouble() ?? 0.0,
        vignette: (json['vignette'] as num?)?.toDouble() ?? 0.0,
        sharpen: (json['sharpen'] as num?)?.toDouble() ?? 0.0,
      );

  ColorGradingSettings copyWith({
    double? brightness,
    double? contrast,
    double? saturation,
    double? exposure,
    double? temperature,
    double? vignette,
    double? sharpen,
  }) {
    return ColorGradingSettings(
      brightness: brightness ?? this.brightness,
      contrast: contrast ?? this.contrast,
      saturation: saturation ?? this.saturation,
      exposure: exposure ?? this.exposure,
      temperature: temperature ?? this.temperature,
      vignette: vignette ?? this.vignette,
      sharpen: sharpen ?? this.sharpen,
    );
  }
}
