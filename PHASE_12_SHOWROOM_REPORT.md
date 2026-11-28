# Phase 12 Showroom Report

## Overview
Phase 12 transformed the viewport into a premium automotive showroom with configurable environments, a bounding-box-driven camera system, presentation modes, and screenshot capture — while preserving all existing functionality.

## Task A — Audit (Completed)
- Camera: fixed `position [0,2.25,7.4]`, fov 36, OrbitControls target `[0,0.72,0]`, distance 4.5–11.
- Lighting: ambient + hemisphere + 2 spot + 2 point; Environment generated locally (no external HDR).
- Shadows: single spot `castShadow` + ContactShadows.
- Framing: hardcoded for procedural; imported used model bounds center only.
- UI: three-column workspace; viewport central.
- Gestures: wheel zoom, raycast select, orbit via store rotation.

## Task B — Showroom Environments (Completed)
`src/viewer/showroomEnvironments.ts` defines 5 presets: Studio Dark, Luxury Showroom, Cyber Night, Outdoor Daylight, Minimal White. Each controls background, fog, ambient/hemisphere/key/rim, floor, grid, reflection, exposure. Switching does not touch geometry or paint.

## Task C — Camera System (Completed)
`src/viewer/cameraSystem.ts`: `computeVehicleFraming(bounds)` (center/size/radius/distance), `cameraPositionForView`, `fitDistanceForFov`. 8 views: showroom, front, rear, left, right, top, front-¾, rear-¾. `requestCameraView` triggers smooth transition; framing adapts to any model size.

## Task D — Presentation Modes (Completed)
Store `presentationMode`: showroom / inspection / customization / presentation. Presentation adds optional auto-rotate. CSS dims sidebars in presentation/showroom to keep viewport dominant. No duplicate state.

## Task E — Lighting/Shadows (Completed)
Presets tune key/rim/ambient; ACES tone mapping; exposure per preset; quality presets (low→ultra) scale DPR/shadow/env resolution. No post-processing added.

## Task F — Floor/Background (Completed)
Cylindrical showroom plinth + grid + contact shadows; floor color/metalness/roughness per environment. Vehicle grounded via normalization in modelLoader.

## Task G — Screenshot (Completed)
`view:screenshot` IPC (trusted renderer only) saves PNG via native dialog. Renderer uses `canvas.toDataURL` with `preserveDrawingBuffer: true`. Browser fallback downloads PNG. Topbar camera button.

## Task H — UI (Completed)
Added Showroom, Camera, Mode selectors in right panel; screenshot button in topbar; presentation-mode CSS. Viewport remains largest area.

## Task I — Vehicle Validation
Framing is bounds-driven (no BMW hardcode). BMW M4 and Toy Car both use `computeVehicleFraming`. Physical visual check NOT TESTED (headless).

## Task J — Performance
No per-frame allocations added beyond existing; framing recomputed from bounds each frame (cheap Box3). Environment keyed by preset id (no reload unless changed). Quality presets retained.

## Task K — Persistence
`showroomEnvironment` optional string persisted in schema v2; round-trip test added. No camera animation state serialized.

## Known Limitations
- Visual appearance not verified on physical GPU.
- Screenshot resolution = canvas size.
- Auto-rotate only in presentation mode.
- No HDRI assets (procedural environment only).