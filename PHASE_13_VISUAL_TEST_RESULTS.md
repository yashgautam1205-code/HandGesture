# Phase 13 Visual Test Results

## Capture Evidence
- **File**: `phase13-screen.png`
- **Dimensions**: 1920 × 1080
- **Size**: 222,165 bytes
- **Distinct sampled colors**: 111
- **Channel ranges**: R 13–255, G 13–212, B 0–237
- **Interpretation**: wide color distribution + 111 sampled colors ⇒ a fully
  rendered, non-blank application surface. Not a crash/white screen.

## Capture Method
`capture.ps1` uses System.Drawing `CopyFromScreen` to grab the live desktop
after the Electron window is up. `analyze.ps1` samples a 40×40 grid and
reports color cardinality + per-channel min/max.

## Visual Content Status
The executing model is **not vision-capable** and did not interpret the
image content. The following remain **NOT TESTED (visual)** and need a human
or vision reviewer:

- BMW M4 body, paint, reflections, mesh fidelity.
- Toy Car (CC0) appearance and scale.
- Five showroom environments (lighting/HDRI look).
- Eight camera view framings (front/rear/side/top/etc.).
- Four presentation modes incl. auto-rotate motion.
- Exploded view, component isolation, material override sliders.

## Automated Coverage That Backs The Visuals
- `src/viewer/cameraSystem.test.ts` (9 tests): framing math, all 8 view
  offsets, fov fit distance, 5 presets, fallback.
- `src/engine/engine.test.ts`: schema v2 round-trip incl. showroomEnvironment.
- Total suite: 82 tests passing.