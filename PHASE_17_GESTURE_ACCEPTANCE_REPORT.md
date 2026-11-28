# Phase 17 Gesture Acceptance Report

**Date:** 2026-11-28  
**Test Environment:** Packaged Windows Application (`release/win-unpacked/Gesture Drive 3D.exe`)  
**Hardware Available:** No physical webcam in execution environment  
**Status:** ALL PHYSICAL WEBCAM TESTS NOT TESTED - Unit tests pass (18/18 classifier tests, 25/25 reliability tests)

---

## Implementation Summary

### Gesture System Architecture

| Component | File | Status |
|-----------|------|--------|
| Hand Tracker | `src/gesture/useHandTracker.ts` | ✅ Implemented |
| Gesture Classifier | `src/gesture/classifier.ts` | ✅ Implemented |
| Reliability Engine | `src/gesture/reliability.ts` | ✅ Implemented |
| MediaPipe Integration | `@mediapipe/tasks-vision` v0.10.21 | ✅ Configured |

### Supported Gestures

| Gesture | Action | Implementation |
|---------|--------|----------------|
| **Pinch (one hand)** | Camera zoom (distance delta) | Continuous, threshold calibrated |
| **Open Palm** | Orbit camera (palm center movement) | Landmark smoothing applied |
| **Pointing (index finger)** | Component selection (raycast + dwell) | 700ms default dwell |
| **Two-Hand Spread** | Exploded view (palm separation delta) | Precedence over single-hand |
| **Two-Hand Pinch** | Zoom (palm separation delta) | Configurable enable |
| **Closed Fist** | Pause interaction | Suppresses updates |
| **Thumbs-Up** | Confirm customization | Cooldown-gated (1800ms) |

### Reliability Features (src/gesture/reliability.ts)

| Feature | Configuration | Test Coverage |
|---------|---------------|---------------|
| Tracking Loss Detection | 4000ms timeout | ✅ 25 tests |
| Per-Gesture Cooldowns | Pinch 1200ms, Palm 800ms, Point 1000ms, Two-hand 1500ms, Fist 2000ms, Thumbs-up 1800ms | ✅ |
| Debounce/Throttle | Configurable | ✅ |
| Stable Gesture Detection | Multi-frame confirmation | ✅ |
| Reconnection Logic | 3 attempts (1.2s/2.4s/3.6s backoff) | ✅ |

### Unit Test Results

| Test File | Tests | Passed |
|-----------|-------|--------|
| `classifier.test.ts` | 18 | 18 ✅ |
| `reliability.test.ts` | 25 | 25 ✅ |
| `useHandTracker.test.ts` | 18 | 18 ✅ |
| **Total** | **61** | **61 ✅** |

---

## Physical Webcam Test Plan (NOT TESTED)

The following tests require a physical webcam and human operator:

### 1. Camera Permission & Initialization
- [ ] Windows camera permission prompt appears on first camera button click
- [ ] Permission granted → camera preview appears
- [ ] "CAMERA ACTIVE" status indicator shows
- [ ] Permission denied → graceful error handling
- [ ] Camera resolution: 640×480 @ 30fps (user-facing)

### 2. Hand Detection & Calibration
- [ ] Hand detected within 1-2 seconds of appearing in frame
- [ ] Calibration: steady hand for 2+ seconds → "Calibrated" status
- [ ] Calibration affects pinch threshold (palm scale normalization)
- [ ] Confidence thresholds per hand respected (left/right independent)

### 3. Gesture Recognition
| Gesture | Test Procedure | Expected Result |
|---------|----------------|-----------------|
| **Pinch** | Thumb + index finger pinch | Camera zoom changes smoothly |
| **Open Palm** | 4+ fingers extended, move hand | Camera orbits around vehicle |
| **Pointing** | Index finger only, hold on component | Component highlights after 700ms dwell |
| **Two-Hand Spread** | Both hands open, move apart/together | Exploded view amount changes |
| **Two-Hand Pinch** | Both hands pinch, move apart/together | Camera zoom changes (if enabled) |
| **Closed Fist** | Make fist, hold | Interaction pauses, no selection changes |
| **Thumbs-Up** | Thumbs up gesture, hold 1800ms | Confirms active AI preview/customization |

### 4. Edge Cases & Reliability
- [ ] **Tracking Loss:** Remove hand for 4+ seconds → "Tracking lost" status
- [ ] **Hand Re-entry:** Hand returns → tracking resumes seamlessly
- [ ] **Webcam Disconnect:** Unplug webcam → reconnect attempts (1/3, 2/3, 3/3)
- [ ] **Webcam Reconnect:** Plug back in → camera reinitializes automatically
- [ ] **Lighting Changes:** Dim/bright lighting → detection stability
- [ ] **Background Clutter:** Complex background → false positive rate
- [ ] **Two Hands:** Both hands visible → correct gesture classification priority

### 5. Cooldown & Threshold Behavior
- [ ] **Gesture Cooldowns:** Rapid repeated gestures respect cooldown periods
- [ ] **Confidence Threshold:** Low confidence hands ignored
- [ ] **Smoothing Setting:** Adjust smoothing slider → affects jitter/responsiveness
- [ ] **Dwell Time:** Pointing dwell adjustable, affects selection speed

### 6. Switching Between Input Methods
- [ ] Mouse + Gesture: Both work simultaneously without conflict
- [ ] Gesture → Mouse: Clicking with mouse doesn't break gesture tracking
- [ ] Mouse → Gesture: Gesture resumes control after mouse idle

### 7. Performance Metrics (Where Measurable)
- [ ] **CPU Usage:** < 15% on modern CPU (MediaPipe GPU delegate)
- [ ] **GPU Usage:** MediaPipe uses GPU delegate when available
- [ ] **Frame Latency:** < 100ms hand-to-action latency
- [ ] **Memory:** No memory leaks during extended session (30+ min)

---

## MediaPipe Configuration

```typescript
// From src/gesture/useHandTracker.ts
const vision = await FilesetResolver.forVisionTasks(
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'
);
const handLandmarker = await HandLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
    delegate: 'GPU' // Falls back to CPU
  },
  runningMode: 'VIDEO',
  numHands: 2,
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5
});
```

---

## Electron Permission Handler

```typescript
// electron/main.ts
session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
  const requestingUrl = details.requestingUrl || webContents.getURL();
  callback(permission === "media" && isTrustedRendererURL(requestingUrl));
});
```

- Only `media` (camera) permission granted
- Only to trusted renderer (dev: 127.0.0.1:5173, prod: app://bundle/)
- No microphone, geolocation, or other permissions requested

---

## Known Limitations

1. **No Physical Webcam:** Cannot verify actual hand detection, tracking quality, or lighting sensitivity
2. **GPU Delegate:** MediaPipe GPU delegate may not work on all hardware (falls back to CPU)
3. **Lighting Dependent:** Performance varies significantly with lighting conditions
4. **Background Clutter:** Complex backgrounds may increase false positives
5. **Hand Occlusion:** Self-occlusion (fingers crossing) may affect landmark accuracy

---

## Conclusion

**Physical Webcam Testing:** ❌ NOT TESTED (no hardware available)  
**Unit Tests:** ✅ 61/61 PASS (classifier, reliability, hand tracker)  
**Implementation:** Complete and architecturally sound  

All gesture logic is unit-tested with deterministic test cases covering:
- Gesture classification accuracy
- Cooldown and debounce behavior
- Tracking loss and recovery
- Calibration and confidence thresholds
- Smoothing and dwell timing

A physical webcam test with a human operator is required to validate:
- Actual hand detection rates
- Tracking stability under real conditions
- Lighting/background sensitivity
- End-to-end gesture-to-action latency
- User experience quality

**Manual Test Command:**
```bash
release\win-unpacked\Gesture Drive 3D.exe
# Click camera button, allow permission, test all gestures per checklist above
```