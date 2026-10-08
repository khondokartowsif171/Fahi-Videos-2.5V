# Mobile web Video Studio

The existing Video Studio has phone tool sheets for Edit, Audio, Text, Effects,
image Overlay, Captions, Crop, Adjust, Filters, Stickers, Ratio and Backdrop.
Clip split, duplicate, delete, reorder and source-bounded trim are included in
document undo/redo. Deleted or split source URLs remain valid for undo until the
editor is unmounted.

Text can be edited with position, color, size, start/end timing and presets.
Image overlays support upload, position, opacity and size. Sound is supplied by
the user or the configured voice service; placeholder stock audio entries were
removed. Playback speed and color effects apply to the complete project.

## Export

`lib/timeline-export.ts` records every trimmed clip in timeline order. It uses a
separate video element and Web Audio mixing, so it does not depend on the
preview element or video.captureStream audio. Recorder pause/resume removes
loading gaps between clips. The timeline clock drives captions and timed text.
Canvas rendering includes ratio, filter, crop, pan, rotation, flips, zoom, text,
stickers, image overlay and backdrop. Export is real-time at 30 fps; keep the
tab visible and screen awake. Export MIME is feature-tested, with an accurately
named WebM fallback if MP4 is unavailable. Remote overlay/audio assets need
appropriate CORS response headers. Unsupported video inputs report an error.

## Validation and limits

- `npm run typecheck`
- `npm run test:editor`: mocked browser tests for sequence/range offsets,
  pause/resume, MIME fallback, hidden-tab failure and resource cleanup.
- `npm run test:aura`: backend regression tests with mocked provider calls.
- Phone viewport tested at 390 x 844: import two clips, split, undo and text
  settings.

This is a mobile web editor, not a native app or complete CapCut implementation.
Curve speed ramps, keyframe animation, transitions, chroma key, subject cutout,
tracking and CapCut's proprietary asset library are not implemented by this
change. Physical iOS/Android recording and downloaded output still require
device validation. Browser download permission was denied during this session,
so the export test did not inspect an actual downloaded recording. Full Next
production build is blocked by this environment's child-process spawn EPERM;
successful type checking is reported separately from full build validation.
