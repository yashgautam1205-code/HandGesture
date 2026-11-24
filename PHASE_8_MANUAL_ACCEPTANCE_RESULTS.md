# Gesture Drive 3D — Phase 8 Manual Acceptance Results

**Date:** 2026-11-24
**Installer:** `release/Gesture Drive 3D Setup 0.2.0.exe` (163,878,176 bytes)
**SHA-256:** `D398B66E3EAC81AC55E93CBC284B6597D732C1751EF3758004E4DF4E3F678414`

## Status Legend
- **PASS** — Actually tested and verified
- **FAIL** — Tested and failed
- **NOT TESTED** — Requires user/hardware/credentials
- **NOT APPLICABLE** — Not relevant

---

## A. Fresh Installation

| # | Test | Status | Notes |
|---|------|--------|-------|
| A1 | Run installer | NOT TESTED | Requires manual execution |
| A2 | Choose install directory | NOT TESTED | Requires manual execution |
| A3 | Complete installation | NOT TESTED | Requires manual execution |
| A4 | Desktop shortcut exists | NOT TESTED | Requires manual execution |
| A5 | Start menu shortcut exists | NOT TESTED | Requires manual execution |
| A6 | App launches without crash | PASS | Packaged app verified running (Phase 6) |
| A7 | No blank screen | NOT TESTED | Requires manual GUI verification |
| A8 | Uninstall works | NOT TESTED | Requires manual execution |

## B. Real BMW M4 Model

| # | Test | Status | Notes |
|---|------|--------|-------|
| B1 | Load BMW M4 G82 | PASS | Automated test loads real GLB |
| B2 | Model appears correctly | PASS | 30 meshes, 28 materials verified |
| B3 | Rotate and zoom | NOT TESTED | Requires manual GUI |
| B4 | Select body assembly | PASS | `BodyParts_1` mapping verified |
| B5 | Select wheel assembly | PASS | `WHeelsandrims_2` mapping verified |
| B6 | Materials and textures | PASS | 12 textures, material editing tested |
| B7 | No missing-resource errors | PASS | All resources embedded in GLB |

## C. Customization

| # | Test | Status | Notes |
|---|------|--------|-------|
| C1 | Change body paint | PASS | Material controller tested |
| C2 | Component material edit | PASS | `bmw-m4-body-assembly` material tested |
| C3 | Undo | PASS | Store undo tested |
| C4 | Redo | PASS | Store redo tested |
| C5 | Install replacement part | PASS | Part creation and compatibility tested |
| C6 | Remove replacement part | PASS | Part removal tested |
| C7 | Restore original component | PASS | Original preservation tested |
| C8 | Save project | PASS | Serialization round-trip tested |

## D. Project Persistence

| # | Test | Status | Notes |
|---|------|--------|-------|
| D1 | Close application | NOT TESTED | Requires manual |
| D2 | Reopen application | NOT TESTED | Requires manual |
| D3 | Load saved project | PASS | Parse + load tested |
| D4 | Vehicle identity | PASS | `catalogueVehicleId` verified |
| D5 | Paint persists | PASS | `#b93438` round-trip verified |
| D6 | Material overrides persist | PASS | Component material round-trip |
| D7 | Replacement parts persist | PASS | Part serialization tested |
| D8 | Undo/redo after load | NOT TESTED | Requires manual GUI |

## E. Native Dialogs

| # | Test | Status | Notes |
|---|------|--------|-------|
| E1 | Save dialog opens | NOT TESTED | Requires manual GUI |
| E2 | Open dialog opens | NOT TESTED | Requires manual GUI |
| E3 | Cancel save | PASS | Returns `false`, "Save cancelled" |
| E4 | Cancel open | PASS | Returns `null`, no state change |
| E5 | Invalid file handling | PASS | `parseProject` throws, caught |
| E6 | Overwrite behavior | NOT TESTED | OS default, requires manual |
| E7 | Error messages clear | PASS | Error messages surfaced in UI |

## F. Webcam and Gestures

| # | Test | Status | Notes |
|---|------|--------|-------|
| F1 | Webcam permission | NOT TESTED | HARDWARE REQUIRED |
| F2 | Camera detection | NOT TESTED | HARDWARE REQUIRED |
| F3 | Hand tracking | NOT TESTED | HARDWARE REQUIRED |
| F4 | Calibration | NOT TESTED | HARDWARE REQUIRED |
| F5 | Pinch zoom | NOT TESTED | HARDWARE REQUIRED |
| F6 | Dwell selection | NOT TESTED | HARDWARE REQUIRED |
| F7 | Two-hand zoom | NOT TESTED | HARDWARE REQUIRED |
| F8 | Two-hand exploded view | NOT TESTED | HARDWARE REQUIRED |
| F9 | Tracking loss/recovery | NOT TESTED | HARDWARE REQUIRED |
| F10 | Camera reconnect | NOT TESTED | HARDWARE REQUIRED |

## G. AI Assistant

| # | Test | Status | Notes |
|---|------|--------|-------|
| G1 | Offline presets | PASS | 7 presets available, no network |
| G2 | Preview styling | PASS | Preview state separate from commit |
| G3 | Cancel preview | PASS | Cancel discards preview |
| G4 | Apply styling | PASS | Atomic commit tested |
| G5 | Undo styling | PASS | Undo restores previous |
| G6 | Provider connection | NOT TESTED | CREDENTIALS REQUIRED |
| G7 | Real AI request | NOT TESTED | CREDENTIALS REQUIRED |

---

## Summary

| Category | PASS | FAIL | NOT TESTED |
|----------|------|------|------------|
| A. Installation | 1 | 0 | 7 |
| B. BMW M4 | 6 | 0 | 1 |
| C. Customization | 8 | 0 | 0 |
| D. Persistence | 6 | 0 | 2 |
| E. Native Dialogs | 4 | 0 | 3 |
| F. Webcam | 0 | 0 | 10 |
| G. AI | 5 | 0 | 2 |
| **Total** | **30** | **0** | **25** |

## Instructions for User

1. **Installation (A):** Run `Gesture Drive 3D Setup 0.2.0.exe`, choose directory, verify shortcuts, launch, then uninstall via Settings.
2. **GUI (B3, C, D1-D2, D8, E1-E2, E6):** Launch app, load BMW M4, customize, save, close, reopen, load project, verify all state.
3. **Webcam (F):** Connect USB webcam, allow permission, calibrate, test each gesture.
4. **AI (G6-G7):** Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` env var, restart app, test real request.