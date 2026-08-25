# Fahi-Videos Mobile Pro (CapCut-Style Editor + Google Veo 3.1 AI Studio)

An all-in-one Flutter Mobile Video Editor and AI Generative Studio for Android and iOS, built to pair directly with the `Fahi-Videos-2.5V` backend.

---

## 🚀 Key Features

1. **CapCut-Grade Pro Video Editor:**
   - **Multi-Track Timeline:** Separate lanes for Video, Audio, Kinetic Text, and Effects.
   - **Precision Editing:** Split clip at playhead, Trim start/end handles, Delete, Duplicate.
   - **Speed Ramping:** 0.1x to 10x smooth speed curves.
   - **Visual Effects & LUTs:** Cyberpunk Neon, Cinematic Film, Noir Noir, Vintage Glow.
   - **Audio & BGM Mixer:** Volume curve sliders and royalty-free audio tracks.
   - **Export Engine:** 720p, 1080p, 2K, 4K render options at 24/30/60 FPS.

2. **Google Flow / Veo 3.1 Generative Video Studio:**
   - Text-to-Video & Image-to-Video generation using Google Veo 3.1 & Gemini.
   - 9:16 Shorts/Reels, 16:9 Cinema, and 1:1 Square aspect ratios.
   - One-tap "Add to Editor Timeline" workflow.

3. **ElevenLabs AI Voice Studio:**
   - Ultra-realistic voice actors (Rachel, Antoni, Bella, Adam).
   - Stability & Clarity controls with instant timeline sync.

4. **Multi-Platform Video Downloader:**
   - Fetch & extract HD video/audio from YouTube, Facebook, TikTok, and Instagram.

---

## 📦 How to Build the Release APK

### Option 1: Automatic Cloud Build (Recommended - Zero Setup)
1. Push this project to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Fahi Videos Mobile Pro"
   git branch -M main
   git remote add origin https://github.com/<your-username>/Fahi-Videos-Mobile.git
   git push -u origin main
   ```
2. Open your GitHub Repository and go to the **Actions** tab.
3. The **Build & Release Fahi-Videos APK** workflow will automatically run and provide the downloadable `app-release.apk` artifact.

### Option 2: Local Build (Requires Flutter SDK on PC)
```bash
flutter pub get
flutter build apk --release
```
The output APK will be generated at `build/app/outputs/flutter-apk/app-release.apk`.
