# Gesture Drive 3D — Gesture Control Guide

## Setup

1. Connect a USB webcam.
2. Launch Gesture Drive 3D.
3. Click the camera icon in the top bar.
4. Allow camera permission when prompted.
5. Position yourself so your hands are visible.
6. Click **Calibrate Hand** in Gesture Settings.

## Gestures

### Pinch (One Hand)
- **How:** Touch thumb tip to index fingertip.
- **Action:** Zoom in/out. Move hand toward/away from camera.
- **Tip:** Keep other fingers extended for stability.

### Open Palm
- **How:** Hold all five fingers extended, palm facing camera.
- **Action:** Rotate the vehicle. Move hand left/right/up/down.
- **Tip:** Smooth movements work best.

### Pointing
- **How:** Extend index finger only, others curled.
- **Action:** Hover over a component for 700ms to select it.
- **Tip:** Hold steady — the dwell timer resets if you move.

### Two-Hand Spread
- **How:** Hold both hands up, palms facing each other.
- **Action:** Spread hands apart to explode the view; bring together to restore.

### Two-Hand Pinch
- **How:** Pinch both hands simultaneously.
- **Action:** Zoom (if enabled in settings).

### Thumbs Up
- **How:** Closed fist with thumb pointing up.
- **Action:** Confirm current customization.
- **Cooldown:** 2 seconds between confirmations.

### Closed Fist
- **How:** Close all fingers into a fist.
- **Action:** Pause gesture interaction temporarily.

## Settings

| Setting | Range | Default | Description |
|---------|-------|---------|-------------|
| Confidence threshold | 30–95% | 60% | Minimum hand detection confidence |
| Action cooldown | 300–5000ms | 2000ms | Time between gesture actions |
| Smoothing | 0.1–0.9 | 0.4 | Landmark smoothing (higher = smoother, more lag) |
| Pinch threshold | 0.2–0.9 | 0.5 | Pinch distance sensitivity |
| Two-hand zoom | On/Off | Off | Enable two-hand pinch zoom |

## Troubleshooting

### Camera not detected
- Check Windows privacy settings: **Settings → Privacy → Camera**.
- Ensure no other app is using the webcam.
- Try a different USB port.

### Tracking lost
- Ensure adequate lighting.
- Keep hands within the camera frame.
- Move closer to the camera.
- Recalibrate after changing position.

### Lag or jitter
- Lower the **smoothing** value.
- Increase **confidence threshold**.
- Close other GPU-intensive applications.

### Gesture not recognized
- Check the confidence percentage in the bottom bar.
- Recalibrate with a clear hand pose.
- Ensure fingers are clearly separated from the palm.