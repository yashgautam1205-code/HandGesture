# Gesture Drive 3D — Phase 9 Manual Test Guide

**Installer:** `release/Gesture Drive 3D Setup 0.2.0.exe`
**SHA-256:** `D398B66E3EAC81AC55E93CBC284B6597D732C1751EF3758004E4DF4E3F678414`

## Result Values
- **PASS** — Tested and works
- **FAIL** — Tested and failed
- **NOT TESTED** — Not yet executed
- **BLOCKED** — Cannot test (missing prerequisite)

---

## A. Installation and Startup

### A1. Run Installer
- **Objective:** Verify installer launches
- **Prerequisites:** `Gesture Drive 3D Setup 0.2.0.exe`
- **Actions:** Double-click the installer
- **Expected:** Installer window appears
- **Failure:** No window, error message
- **Result:** ________
- **Notes:** ________

### A2. Choose Install Directory
- **Objective:** Verify directory selection works
- **Prerequisites:** A1 PASS
- **Actions:** Click "Change" or accept default, click Next
- **Expected:** Directory selection works
- **Failure:** Cannot change directory, error
- **Result:** ________
- **Notes:** ________

### A3. Complete Installation
- **Objective:** Verify installation completes
- **Prerequisites:** A2 PASS
- **Actions:** Click Install, wait for completion
- **Expected:** "Installation complete" message
- **Failure:** Error during install, hang
- **Result:** ________
- **Notes:** ________

### A4. Desktop Shortcut
- **Objective:** Verify desktop shortcut
- **Prerequisites:** A3 PASS
- **Actions:** Check desktop for "Gesture Drive 3D" shortcut
- **Expected:** Shortcut exists
- **Failure:** No shortcut
- **Result:** ________
- **Notes:** ________

### A5. Start Menu Shortcut
- **Objective:** Verify Start menu entry
- **Prerequisites:** A3 PASS
- **Actions:** Open Start menu, search "Gesture Drive"
- **Expected:** Entry appears
- **Failure:** Not found
- **Result:** ________
- **Notes:** ________

### A6. Launch Application
- **Objective:** Verify app launches
- **Prerequisites:** A3 PASS
- **Actions:** Double-click desktop shortcut
- **Expected:** App window opens, no crash
- **Failure:** Crash, error dialog, no window
- **Result:** ________
- **Notes:** ________

### A7. Clean Startup
- **Objective:** Verify no blank screen
- **Prerequisites:** A6 PASS
- **Actions:** Wait 5 seconds after launch
- **Expected:** 3D showroom visible, no blank screen
- **Failure:** Blank/white/black screen
- **Result:** ________
- **Notes:** ________

### A8. Uninstall
- **Objective:** Verify uninstall works
- **Prerequisites:** All above PASS
- **Actions:** Settings → Apps → Gesture Drive 3D → Uninstall
- **Expected:** Uninstaller runs, app removed
- **Failure:** Cannot uninstall, files remain
- **Result:** ________
- **Notes:** ________

---

## B. BMW M4 Model

### B1. Load BMW M4
- **Objective:** Load bundled model
- **Prerequisites:** App running
- **Actions:** Library tab → Select BMW M4 G82 → Click Load
- **Expected:** "Loaded BMW M4 G82" message
- **Failure:** Error, no model
- **Result:** ________
- **Notes:** ________

### B2. Rotate and Zoom
- **Objective:** Verify camera controls
- **Prerequisites:** B1 PASS
- **Actions:** Click+drag to rotate, scroll to zoom
- **Expected:** Model rotates and zooms smoothly
- **Failure:** No response, jerky
- **Result:** ________
- **Notes:** ________

### B3. Select Body Assembly
- **Objective:** Verify component selection
- **Prerequisites:** B1 PASS
- **Actions:** Click on car body
- **Expected:** Body assembly highlighted, details shown
- **Failure:** No selection
- **Result:** ________
- **Notes:** ________

### B4. Select Wheel Assembly
- **Objective:** Verify wheel selection
- **Prerequisites:** B1 PASS
- **Actions:** Click on a wheel
- **Expected:** Wheel assembly highlighted
- **Failure:** No selection
- **Result:** ________
- **Notes:** ________

### B5. Materials and Textures
- **Objective:** Verify rendering quality
- **Prerequisites:** B1 PASS
- **Actions:** Inspect car paint, glass, wheels
- **Expected:** Textures visible, materials look correct
- **Failure:** Missing textures, wrong colors
- **Result:** ________
- **Notes:** ________

---

## C. Customization

### C1. Change Body Paint
- **Objective:** Verify paint change
- **Prerequisites:** B1 PASS
- **Actions:** Exterior → Select color → Apply
- **Expected:** Body color changes
- **Failure:** No change
- **Result:** ________
- **Notes:** ________

### C2. Component Material
- **Objective:** Verify material edit
- **Prerequisites:** B3 PASS
- **Actions:** Select body → Change material properties → Apply
- **Expected:** Material updates
- **Failure:** No change
- **Result:** ________
- **Notes:** ________

### C3. Undo
- **Objective:** Verify undo
- **Prerequisites:** C1 or C2 PASS
- **Actions:** Click Undo or Ctrl+Z
- **Expected:** Change reverted
- **Failure:** No change
- **Result:** ________
- **Notes:** ________

### C4. Redo
- **Objective:** Verify redo
- **Prerequisites:** C3 PASS
- **Actions:** Click Redo or Ctrl+Y
- **Expected:** Change reapplied
- **Failure:** No change
- **Result:** ________
- **Notes:** ________

### C5. Install Replacement Part
- **Objective:** Verify part import
- **Prerequisites:** App running
- **Actions:** Parts tab → Import GLB → Select target → Install
- **Expected:** Part appears, original hidden
- **Failure:** Error, no part
- **Result:** ________
- **Notes:** ________

### C6. Remove Replacement Part
- **Objective:** Verify part removal
- **Prerequisites:** C5 PASS
- **Actions:** Select installed part → Remove
- **Expected:** Part removed, original restored
- **Failure:** Part remains
- **Result:** ________
- **Notes:** ________

---

## D. Project Persistence

### D1. Save Project
- **Objective:** Save via native dialog
- **Prerequisites:** C1-C4 PASS
- **Actions:** Click Save → Choose filename → Save
- **Expected:** "Project saved" message
- **Failure:** Error, no file
- **Result:** ________
- **Notes:** ________

### D2. Close Application
- **Objective:** Verify clean shutdown
- **Prerequisites:** D1 PASS
- **Actions:** Close window
- **Expected:** App exits, no error
- **Failure:** Hang, crash, error
- **Result:** ________
- **Notes:** ________

### D3. Reopen Application
- **Objective:** Verify relaunch
- **Prerequisites:** D2 PASS
- **Actions:** Launch app again
- **Expected:** App opens normally
- **Failure:** Crash, error
- **Result:** ________
- **Notes:** ________

### D4. Load Saved Project
- **Objective:** Load via native dialog
- **Prerequisites:** D3 PASS
- **Actions:** Open saved design → Select file → Open
- **Expected:** "Project loaded" message
- **Failure:** Error, no load
- **Result:** ________
- **Notes:** ________

### D5. Verify Identity
- **Objective:** Vehicle identity persists
- **Prerequisites:** D4 PASS
- **Actions:** Check vehicle name
- **Expected:** "BMW M4 G82"
- **Failure:** Wrong name
- **Result:** ________
- **Notes:** ________

### D6. Verify Paint
- **Objective:** Paint persists
- **Prerequisites:** D4 PASS
- **Actions:** Check body color
- **Expected:** Matches saved color
- **Failure:** Default color
- **Result:** ________
- **Notes:** ________

### D7. Verify Materials
- **Objective:** Material overrides persist
- **Prerequisites:** D4 PASS
- **Actions:** Check component materials
- **Expected:** Match saved values
- **Failure:** Defaults
- **Result:** ________
- **Notes:** ________

### D8. Verify Replacement Parts
- **Objective:** Parts persist
- **Prerequisites:** D4 PASS
- **Actions:** Check parts tab
- **Expected:** Saved parts present
- **Failure:** Missing
- **Result:** ________
- **Notes:** ________

---

## E. Native Dialogs

### E1. Save Dialog
- **Objective:** Save dialog opens
- **Prerequisites:** App running
- **Actions:** Click Save
- **Expected:** Native file dialog
- **Failure:** No dialog
- **Result:** ________
- **Notes:** ________

### E2. Open Dialog
- **Objective:** Open dialog opens
- **Prerequisites:** App running
- **Actions:** Click Open saved design
- **Expected:** Native file dialog
- **Failure:** No dialog
- **Result:** ________
- **Notes:** ________

### E3. Cancel Save
- **Objective:** Cancel works
- **Prerequisites:** E1 PASS
- **Actions:** Click Cancel in dialog
- **Expected:** "Save cancelled"
- **Failure:** Error, crash
- **Result:** ________
- **Notes:** ________

### E4. Cancel Open
- **Objective:** Cancel open works
- **Prerequisites:** E2 PASS
- **Actions:** Click Cancel in dialog
- **Expected:** No change
- **Failure:** Error, state change
- **Result:** ________
- **Notes:** ________

### E5. Invalid File
- **Objective:** Invalid file handled
- **Prerequisites:** E2 PASS
- **Actions:** Select a non-project file
- **Expected:** Error message
- **Failure:** Crash, no error
- **Result:** ________
- **Notes:** ________

### E6. Overwrite
- **Objective:** Overwrite confirmation
- **Prerequisites:** E1 PASS
- **Actions:** Save to existing filename
- **Expected:** Overwrite prompt (OS default)
- **Failure:** No prompt, silent overwrite
- **Result:** ________
- **Notes:** ________

---

## F. Webcam and Gestures

### F1. Permission
- **Objective:** Camera permission
- **Prerequisites:** USB webcam connected
- **Actions:** Click camera icon, allow permission
- **Expected:** "CAMERA ACTIVE"
- **Failure:** Denied, error
- **Result:** ________
- **Notes:** ________

### F2. Camera Detection
- **Objective:** Camera feed visible
- **Prerequisites:** F1 PASS
- **Actions:** Check gesture panel
- **Expected:** Webcam preview
- **Failure:** Black screen
- **Result:** ________
- **Notes:** ________

### F3. Calibration
- **Objective:** Calibrate hand
- **Prerequisites:** F2 PASS
- **Actions:** Hold hand steady, click Calibrate
- **Expected:** "Calibration captured"
- **Failure:** Error
- **Result:** ________
- **Notes:** ________

### F4. Pinch
- **Objective:** Pinch zoom
- **Prerequisites:** F3 PASS
- **Actions:** Pinch thumb+index, move hand
- **Expected:** Zoom changes
- **Failure:** No response
- **Result:** ________
- **Notes:** ________

### F5. Dwell
- **Objective:** Point selection
- **Prerequisites:** F3 PASS
- **Actions:** Point at component, hold 700ms
- **Expected:** Component selected
- **Failure:** No selection
- **Result:** ________
- **Notes:** ________

### F6. Two-Hand Zoom
- **Objective:** Two-hand pinch zoom
- **Prerequisites:** F3 PASS
- **Actions:** Pinch both hands
- **Expected:** Zoom changes
- **Failure:** No response
- **Result:** ________
- **Notes:** ________

### F7. Exploded View
- **Objective:** Two-hand spread
- **Prerequisites:** F3 PASS
- **Actions:** Two hands, spread apart
- **Expected:** Exploded view
- **Failure:** No change
- **Result:** ________
- **Notes:** ________

### F8. Tracking Loss
- **Objective:** Tracking loss warning
- **Prerequisites:** F3 PASS
- **Actions:** Remove hands 4+ seconds
- **Expected:** "Tracking lost" warning
- **Failure:** No warning
- **Result:** ________
- **Notes:** ________

### F9. Reconnect
- **Objective:** Camera reconnect
- **Prerequisites:** F1 PASS
- **Actions:** Unplug/replug webcam
- **Expected:** Reconnect attempts
- **Failure:** No reconnect
- **Result:** ________
- **Notes:** ________

---

## G. AI Assistant

### G1. Offline Presets
- **Objective:** Presets work offline
- **Prerequisites:** App running
- **Actions:** Open AI Assistant, select preset
- **Expected:** Preset applied
- **Failure:** Error
- **Result:** ________
- **Notes:** ________

### G2. Preview
- **Objective:** Preview styling
- **Prerequisites:** G1 PASS
- **Actions:** Type request, preview
- **Expected:** Preview shown
- **Failure:** No preview
- **Result:** ________
- **Notes:** ________

### G3. Cancel Preview
- **Objective:** Cancel works
- **Prerequisites:** G2 PASS
- **Actions:** Click Cancel
- **Expected:** Preview cleared
- **Failure:** Preview remains
- **Result:** ________
- **Notes:** ________

### G4. Apply
- **Objective:** Apply styling
- **Prerequisites:** G2 PASS
- **Actions:** Click Apply
- **Expected:** Change committed
- **Failure:** No change
- **Result:** ________
- **Notes:** ________

### G5. Undo AI
- **Objective:** Undo AI change
- **Prerequisites:** G4 PASS
- **Actions:** Click Undo
- **Expected:** Reverted
- **Failure:** No change
- **Result:** ________
- **Notes:** ________

### G6. Real Provider
- **Objective:** Real API request
- **Prerequisites:** `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` set
- **Actions:** Restart app, type request
- **Expected:** AI response
- **Failure:** Error, offline
- **Result:** ________
- **Notes:** ________

---

## Summary

| Category | Total | PASS | FAIL | NOT TESTED | BLOCKED |
|----------|-------|------|------|------------|---------|
| A. Installation | 8 | | | | |
| B. BMW M4 | 5 | | | | |
| C. Customization | 6 | | | | |
| D. Persistence | 8 | | | | |
| E. Dialogs | 6 | | | | |
| F. Webcam | 9 | | | | |
| G. AI | 6 | | | | |
| **Total** | **48** | | | | |

**Tester:** ________ **Date:** ________