# Acceptance receipt — Opal Marketplace and FahiVids exports

Date: 2026-10-23 (Asia/Dhaka)

## FahiVids browser exports

Tested the local production build of `D:\fahi-videos` (Next.js 15.5.19; production build completed successfully) in a real browser. Inputs were the supplied Aura Client Dashboard dark/light 1080p tour videos and full `KothaStudio_Master_Bangla_Voice_Cover.wav`.

- Single clip: expected timeline 6.0667 s; downloaded `C:\Users\Masud\Downloads\1022_1792711757415.mp4`, H.264/AAC MP4, 1280x720, 30 fps, video 6.1000 s, audio 6.1013 s. Duration delta: 33.3 ms (one 30 fps output frame).
- Two clips: expected timeline 6.2667 s (dark then light); downloaded `C:\Users\Masud\Downloads\1022_1792711614879.mp4`, H.264/AAC MP4, 1280x720, 30 fps, video 6.3000 s, audio 6.3147 s. Video duration delta: 33.3 ms (one output frame).
- Both outputs have video and audio starting at 0.000 s. Comparing decoded mono output to the supplied WAV over the export interval gave normalized correlation 0.9988 with a best lag of 0 ms for both exports.
- Start, middle, end, and two-clip boundary frames were extracted and visually inspected. The two-clip boundary changes from the dark dashboard footage to the light dashboard footage in the correct order.
- Frame artifacts: `D:\fahi-videos\artifacts\acceptance\`.

Local development builds (Turbopack and Webpack) both failed when requesting export with a missing Mediabunny `codec-data` chunk. The optimized production build and both actual exports succeeded. This is recorded as a dev-bundler limitation; no export-code workaround was made because the production acceptance path passed.

## Opal Marketplace bridge

- Added Aura Studio · Opal Marketplace card, AI Studio category, Open Studio action and card count update to the Client Dashboard source.
- Launch uses the dashboard's active tenant selection (URL/current workspace helper/verified `__me`, then stored selection) as a tenant slug routing hint. UUIDs and `ALL` are rejected, and the URL is fixed to Opal origin with only the tenant query parameter.
- Opal's existing resolver tests passed: 15 workspace/frontend tests covering login-required, explicit owner workspace choice, canonical server tenant, unauthorized tenant input, tenant isolation, and login return handling.
- Client unit test passed for workspace resolution, empty-selection blocking, canonical-ID rejection and fixed destination. Live post-deploy acceptance: Coolify deployed Client commit `c317b9b` from `main` successfully; the service reported healthy and the rollout completed. The live Marketplace showed the Opal card, `8 Apps`, and AI Studio filter. Search for “Opal” and AI Studio filtering each isolated the card. Clicking Open Studio opened `https://opal.auraajenticai.cloud/?tenant=glamours-touch`; the authenticated Opal UI showed workspace “Glamour’s Touch” without a manually entered Workspace ID. A forged `tenant=unauthorized-check` hint was rejected with the “workspace unavailable or unauthorized” state. After the Opal session expired, its login return link preserved the selected workspace query. The current dashboard account exposed only Glamour’s Touch, so live routing through a second authorized workspace was not observed. A valid 390px mobile viewport could not be established in the connected browser; mobile layout acceptance remains unverified.

No Omni paid generation, quota assignment, GT package, Meta connector, customer data, or YouTube download was changed or repeated.
