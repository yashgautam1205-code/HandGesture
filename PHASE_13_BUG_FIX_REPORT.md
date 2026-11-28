# Phase 13 Bug Fix Report

## Bug: Stale camera framing after vehicle switch during transition

### Symptom
When the user switched vehicles (e.g. BMW M4 → Toy Car) while a camera view
transition was in progress, or requested a camera view before the new
vehicle's bounds were computed, the camera could remain framed for the
**previous** vehicle. The requested view silently did nothing because
`framingRef.current` was stale/null at the moment the view effect ran.

### Root Cause
`src/viewer/CarScene.tsx` applied a requested camera view only inside a
`useEffect` keyed on `cameraViewNonce`. That effect early-returned when
`framingRef.current` was null, and nothing re-applied the view once fresh
framing became available in the `useFrame` loop. Switching vehicles changes
the bounding box → framing, but the camera was not re-fitted.

### Fix
In the `useFrame` loop, after computing `framing`:
- Track the previous framing in `lastFramingRef`.
- Detect a real framing change (radius delta > 0.01 or center moved).
- If the framing changed **and** no newer view request is pending
  (`appliedViewNonce === state.cameraViewNonce`), re-apply the active view
  (validated against `CAMERA_VIEWS`, default `showroom`) and update the
  orbit target.

This makes the camera re-fit correctly when the vehicle (and thus its
bounds) changes, without fighting a user's explicit newer view request.

### Files Changed
- `src/viewer/CarScene.tsx`
  - Added `lastFramingRef`.
  - Re-fit logic in `useFrame` framing block.

### Verification
- `npm run build`: ✅ clean (renderer + electron tsc).
- `npm test`: ✅ 9 files / 82 tests pass (no regression).
- App relaunched: ✅ no startup/runtime errors; non-blank render confirmed.

### Risk
Low. Pure additive re-fit guarded by change detection and nonce equality;
existing view-request path unchanged.