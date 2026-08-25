import 'package:flutter/material.dart';

class AppColors {
  // CapCut Pro Dark Palette
  static const Color background = Color(0xFF0D0D11);
  static const Color surface = Color(0xFF16161E);
  static const Color surfaceLight = Color(0xFF22222E);
  static const Color surfaceBorder = Color(0xFF2C2C3C);
  
  // Neon Accents
  static const Color primary = Color(0xFF00E5FF); // Cyber Cyan
  static const Color primaryGradientEnd = Color(0xFF0077FF);
  static const Color secondary = Color(0xFFFF2A85); // Neon Pink
  static const Color accent = Color(0xFFFFB800); // Gold Amber
  static const Color success = Color(0xFF00E676); // Neon Green
  static const Color warning = Color(0xFFFF9100);
  static const Color error = Color(0xFFFF1744);

  // Timeline Layer Colors
  static const Color trackVideo = Color(0xFF0077FF);
  static const Color trackAudio = Color(0xFF00E676);
  static const Color trackText = Color(0xFFFFB800);
  static const Color trackEffect = Color(0xFFFF2A85);
  static const Color trackSticker = Color(0xFFAB47BC);

  // Text Colors
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFA0A0B2);
  static const Color textMuted = Color(0xFF6B6B7F);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, primaryGradientEnd],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient accentGradient = LinearGradient(
    colors: [secondary, Color(0xFFFF7043)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient darkCardGradient = LinearGradient(
    colors: [Color(0xFF1B1B26), Color(0xFF12121A)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}
