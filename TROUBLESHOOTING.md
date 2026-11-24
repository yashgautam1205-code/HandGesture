# Gesture Drive 3D — Troubleshooting

## Application Won't Start

**Symptom:** App crashes on launch or shows a blank window.

**Solutions:**
1. Ensure Windows 10/11 64-bit is installed.
2. Install the latest Windows updates.
3. Run the installer as Administrator.
4. Check Event Viewer for application errors.
5. Reinstall the application.

## 3D Model Won't Load

**Symptom:** "3D MODEL NOT AVAILABLE — ASSET REQUIRED" message.

**Solutions:**
1. Only **BMW M4 G82** is currently available as a verified asset.
2. Other 18 catalogue entries are placeholders — no 3D model exists.
3. Do not attempt to load unavailable models.

**Symptom:** Model loads but appears black or untextured.

**Solutions:**
1. Update your graphics drivers.
2. Try **Low** quality setting.
3. Check the model audit panel for errors.

## Webcam Issues

**Symptom:** "Camera access was denied."

**Solutions:**
1. Go to **Windows Settings → Privacy & Security → Camera**.
2. Enable "Camera access" and "Let apps access your camera".
3. Ensure Gesture Drive 3D is allowed.
4. Restart the application.

**Symptom:** Camera connects but no hand tracking.

**Solutions:**
1. Ensure adequate lighting (not backlit).
2. Keep hands within frame, 1–2 feet from camera.
3. Click **Calibrate Hand** with a clear pose.
4. Check confidence percentage in bottom bar.

**Symptom:** Tracking is laggy or jittery.

**Solutions:**
1. Lower **Smoothing** in Gesture Settings.
2. Increase **Confidence threshold**.
3. Close other GPU-heavy applications.
4. Try a different USB port for the webcam.

## AI Assistant Issues

**Symptom:** "AI provider is not configured."

**Solutions:**
1. Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` environment variable.
2. Restart the application after setting the key.
3. Offline presets are always available without a key.

**Symptom:** AI request fails with network error.

**Solutions:**
1. Check internet connectivity.
2. Verify the API key is valid and has credits.
3. Check firewall/antivirus settings.

## Save/Load Issues

**Symptom:** "Could not save project."

**Solutions:**
1. Ensure you have write permission to the chosen directory.
2. Try saving to a different location (e.g., Desktop).
3. Check available disk space.

**Symptom:** "Invalid project file."

**Solutions:**
1. Ensure the file is a valid Gesture Drive 3D project (`.gd3d.json`).
2. The file may be corrupted — try loading a backup.
3. Projects from version 0.1.0 are compatible.

## Performance Issues

**Symptom:** Low FPS or stuttering.

**Solutions:**
1. Set quality to **Low** or **Medium**.
2. Close other applications.
3. Update graphics drivers.
4. Reduce the number of visible components.

**Symptom:** High memory usage.

**Solutions:**
1. Restart the application periodically.
2. Close unused vehicle models.
3. The BMW M4 GLB is 22.7 MB — this is expected.

## Uninstallation

1. **Settings → Apps → Installed apps → Gesture Drive 3D → Uninstall**.
2. Follow the uninstaller prompts.
3. Optionally delete `%LOCALAPPDATA%\Gesture Drive 3D` for complete removal.

## Getting Help

- Check `GESTURE_DRIVE_3D_FINAL_ACCEPTANCE_REPORT.md` for known limitations.
- Manual test procedures are in `PHASE_6_MANUAL_ACCEPTANCE_CHECKLIST.md`.
- For bugs, include the application version, Windows version, and steps to reproduce.