import 'package:flutter/material.dart';

enum CaptionStylePreset { hormoziYellow, neonCyberpunk, boldBoxed, minimalWhite, gradientPop }

class WordTiming {
  final String word;
  final int startMs;
  final int endMs;

  const WordTiming({
    required this.word,
    required this.startMs,
    required this.endMs,
  });
}

class CaptionSegment {
  final String id;
  final int startMs;
  final int endMs;
  final String fullText;
  final List<WordTiming> words;
  CaptionStylePreset style;

  CaptionSegment({
    required this.id,
    required this.startMs,
    required this.endMs,
    required this.fullText,
    required this.words,
    this.style = CaptionStylePreset.hormoziYellow,
  });
}
