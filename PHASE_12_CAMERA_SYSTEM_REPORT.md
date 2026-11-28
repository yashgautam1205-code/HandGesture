# Phase 12 Camera System Report

## Module: `src/viewer/cameraSystem.ts`

### Framing
`computeVehicleFraming(bounds)` returns `{ center, size, radius, distance }`:
- center = bounds center.
- radius = max dimension / 2.
- distance = max(3.2, radius * 3.4).
Adapts to any model size (no BMW-only constants).

### Views
8 presets with direction vectors:
- showroom `[0.32,0.34,1]`, front `[0,0.18,1]`, rear `[0,0.18,-1]`, left `[-1,0.16,0]`, right `[1,0.16,0]`, top `[0.001,1,0.001]`, front-¾ `[0.85,0.3,0.85]`, rear-¾ `[-0.85,0.3,-0.85]`.

`cameraPositionForView(framing, view)` = center + normalized(direction) * distance.

### Fit
`fitDistanceForFov(radius, fov, aspect)` computes distance so the bounding sphere fits both vertical and horizontal FOV, clamped to ≥3.2.

### Integration
- Store `cameraView` + `cameraViewNonce`; `requestCameraView` bumps nonce.
- `StudioStage` applies the view when nonce changes, sets controls target, resets zoom.
- Per-frame: recompute framing from `vehicleRoot` bounds, update `maxDistance`, `minDistance`, focus distance.
- Existing gesture zoom (wheel) and orbit (store rotation) preserved.

### Cancellation
View changes snap camera + target immediately and reset zoom; user can then orbit/zoom freely. No queued animation to cancel.