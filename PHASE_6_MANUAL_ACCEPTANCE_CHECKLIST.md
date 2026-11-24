# Gesture Drive 3D — Phase 6 Manual Acceptance Checklist

**Installer:** `release/Gesture Drive 3D Setup 0.2.0.exe`
**Version:** 0.2.0
**Date:** 2026-11-24

---

## A. Fresh Installation

| Step | Action | Expected Result | Status | Notes |
|------|--------|-----------------|--------|-------|
| A1 | Run `Gesture Drive 3D Setup 0.2.0.exe` | Installer launches | ☐ PASS / ☐ FAIL | |
| A2 | Choose installation directory | Directory selection works | ☐ PASS / ☐ FAIL | |
| A3 | Complete installation | "Installation complete" message | ☐ PASS / ☐ FAIL | |
| A4 | Check desktop shortcut exists | "Gesture Drive 3D" shortcut on desktop | ☐ PASS / ☐ FAIL | |
| A5 | Check Start menu shortcut | "Gesture Drive 3D" in Start menu | ☐ PASS / ☐ FAIL | |

## B. First Application Launch

| Step | Action | Expected Result | Status | Notes |
|------|--------|-----------------|--------|-------|
| B1 | Launch from desktop shortcut | App window opens | ☐ PASS / ☐ FAIL | |
| B2 | Check window title | "Gesture Drive 3D — Vehicle Design Studio" | ☐ PASS / ☐ FAIL | |
| B3 | Check 3D viewport visible | Showroom with procedural car visible | ☐ PASS / ☐ FAIL | |
| B4 | Check vehicle name | "PROCEDURAL SPORT COUPE" displayed | ☐ PASS / ☐ FAIL | |
| B5 | Check status bar | "READY" or "STUDIO READY" shown | ☐ PASS / ☐ FAIL | |

## C. BMW M4 Loading

| Step | Action | Expected Result | Status | Notes |
|------|--------|-----------------|--------|-------|
| C1 | Click Library tab | Vehicle list appears | ☐ PASS / ☐ FAIL | |
| C2 | Select BMW M4 G82 | Vehicle details shown | ☐ PASS / ☐ FAIL | |
| C3 | Click Load | Loading progress appears | ☐ PASS / ☐ FAIL | |
| C4 | Wait for load | "Loaded BMW M4 G82" message | ☐ PASS / ☐ FAIL | |
| C5 | Check 3D model | Real BMW M4 visible in showroom | ☐ PASS / ☐ FAIL | |
| C6 | Check model tag | "IMPORTED MODEL" shown | ☐ PASS / ☐ FAIL | |

## D. Native Save/Open Dialogs

| Step | Action | Expected Result | Status | Notes |
|------|--------|-----------------|--------|-------|
| D1 | Click Save icon | "Save vehicle project" dialog opens | ☐ PASS / ☐ FAIL | |
| D2 | Cancel save dialog | "Save cancelled" message | ☐ PASS / ☐ FAIL | |
| D3 | Save with filename | "Project saved" message | ☐ PASS / ☐ FAIL | |
| D4 | Click Open saved design | "Open vehicle project" dialog opens | ☐ PASS / ☐ FAIL | |
| D5 | Cancel open dialog | No change, no error | ☐ PASS / ☐ FAIL | |
| D6 | Open saved file | "Project loaded" message | ☐ PASS / ☐ FAIL | |
| D7 | Save to existing file | Overwrite confirmation (OS default) | ☐ PASS / ☐ FAIL | |

## E. Complete Save-Close-Reopen Workflow

| Step | Action | Expected Result | Status | Notes |
|------|--------|-----------------|--------|-------|
| E1 | Load BMW M4 | Model loaded | ☐ PASS / ☐ FAIL | |
| E2 | Change paint to Heat Red | Body color changes | ☐ PASS / ☐ FAIL | |
| E3 | Select body assembly, change material | Material updates | ☐ PASS / ☐ FAIL | |
| E4 | Import replacement wheel part | Part appears in library | ☐ PASS / ☐ FAIL | |
| E5 | Save project | "Project saved" | ☐ PASS / ☐ FAIL | |
| E6 | Close app completely | App exits (check Task Manager) | ☐ PASS / ☐ FAIL | |
| E7 | Relaunch app | App opens fresh | ☐ PASS / ☐ FAIL | |
| E8 | Open saved project | "Project loaded" | ☐ PASS / ☐ FAIL | |
| E9 | Verify vehicle name | "BMW M4 G82" | ☐ PASS / ☐ FAIL | |
| E10 | Verify paint | Heat Red applied | ☐ PASS / ☐ FAIL | |
| E11 | Verify component material | Body material changed | ☐ PASS / ☐ FAIL | |
| E12 | Verify replacement part | Wheel part present | ☐ PASS / ☐ FAIL | |

## F. Webcam Connection and Calibration

| Step | Action | Expected Result | Status | Notes |
|------|--------|-----------------|--------|-------|
| F1 | Connect USB webcam | Windows detects device | ☐ PASS / ☐ FAIL | |
| F2 | Click camera icon | Permission prompt appears | ☐ PASS / ☐ FAIL | |
| F3 | Allow permission | "CAMERA ACTIVE" status | ☐ PASS / ☐ FAIL | |
| F4 | Check gesture panel | Webcam preview visible | ☐ PASS / ☐ FAIL | |
| F5 | Hold hand steady, click Calibrate | "Gesture calibration captured" | ☐ PASS / ☐ FAIL | |

## G. Gesture Interaction

| Step | Action | Expected Result | Status | Notes |
|------|--------|-----------------|--------|-------|
| G1 | Pinch thumb+index | Zoom changes | ☐ PASS / ☐ FAIL | |
| G2 | Point at component 700ms | Component selected | ☐ PASS / ☐ FAIL | |
| G3 | Two hands spread | Exploded view changes | ☐ PASS / ☐ FAIL | |
| G4 | Thumbs up | Confirmation status | ☐ PASS / ☐ FAIL | |
| G5 | Closed fist | Interaction pauses | ☐ PASS / ☐ FAIL | |
| G6 | Remove hands 4+ seconds | "Tracking lost" warning | ☐ PASS / ☐ FAIL | |
| G7 | Unplug/replug webcam | Reconnect attempts (1/3, 2/3) | ☐ PASS / ☐ FAIL | |

## H. AI Provider Configuration

| Step | Action | Expected Result | Status | Notes |
|------|--------|-----------------|--------|-------|
| H1 | Set `OPENAI_API_KEY` env var | (System config) | ☐ PASS / ☐ FAIL | |
| H2 | Restart app | AI status shows provider | ☐ PASS / ☐ FAIL | |
| H3 | Type "Make it red" | Preview appears | ☐ PASS / ☐ FAIL | |
| H4 | Cancel preview | Preview disappears | ☐ PASS / ☐ FAIL | |
| H5 | Preview again, Apply | Paint changes | ☐ PASS / ☐ FAIL | |
| H6 | Undo | Paint reverts | ☐ PASS / ☐ FAIL | |
| H7 | Disconnect network | Offline presets still work | ☐ PASS / ☐ FAIL | |

## I. Application Shutdown

| Step | Action | Expected Result | Status | Notes |
|------|--------|-----------------|--------|-------|
| I1 | Close app window | App exits cleanly | ☐ PASS / ☐ FAIL | |
| I2 | Check Task Manager | No "Gesture Drive 3D" processes | ☐ PASS / ☐ FAIL | |
| I3 | Relaunch | App opens normally | ☐ PASS / ☐ FAIL | |

## J. Uninstallation

| Step | Action | Expected Result | Status | Notes |
|------|--------|-----------------|--------|-------|
| J1 | Settings → Apps → Gesture Drive 3D → Uninstall | Uninstaller launches | ☐ PASS / ☐ FAIL | |
| J2 | Complete uninstall | "Uninstall complete" | ☐ PASS / ☐ FAIL | |
| J3 | Check desktop shortcut removed | Shortcut gone | ☐ PASS / ☐ FAIL | |
| J4 | Check Start menu shortcut removed | Entry gone | ☐ PASS / ☐ FAIL | |
| J5 | Check install directory | Directory removed or empty | ☐ PASS / ☐ FAIL | |

---

## Result Summary

| Category | Status |
|----------|--------|
| A. Fresh Installation | ☐ PASS / ☐ FAIL / ☐ NOT TESTED |
| B. First Launch | ☐ PASS / ☐ FAIL / ☐ NOT TESTED |
| C. BMW M4 Loading | ☐ PASS / ☐ FAIL / ☐ NOT TESTED |
| D. Native Dialogs | ☐ PASS / ☐ FAIL / ☐ NOT TESTED |
| E. Save-Close-Reopen | ☐ PASS / ☐ FAIL / ☐ NOT TESTED |
| F. Webcam Setup | ☐ PASS / ☐ FAIL / ☐ NOT TESTED |
| G. Gesture Interaction | ☐ PASS / ☐ FAIL / ☐ NOT TESTED |
| H. AI Provider | ☐ PASS / ☐ FAIL / ☐ NOT TESTED |
| I. Shutdown | ☐ PASS / ☐ FAIL / ☐ NOT TESTED |
| J. Uninstallation | ☐ PASS / ☐ FAIL / ☐ NOT TESTED |

**Tester Name:** ___________________
**Date:** ___________________
**Windows Version:** ___________________
**Notes:** ___________________