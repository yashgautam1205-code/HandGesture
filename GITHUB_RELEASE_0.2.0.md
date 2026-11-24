# Gesture Drive 3D — GitHub Release 0.2.0

## Release Title

Gesture Drive 3D v0.2.0 — Professional Windows Release

## Version

0.2.0

## Release Summary

Gesture Drive 3D is a premium automotive digital customization studio for Windows. This release candidate includes a real BMW M4 G82 3D model, gesture-based interaction, AI styling assistance, and full project persistence.

## New Features and Improvements

- Professional Windows installer with customizable installation directory
- Desktop and Start menu shortcuts
- NSIS installer configuration (non-one-click, user-selectable install path)
- Improved branding and application metadata
- Enhanced error messages with dismiss buttons
- Gesture settings tooltips for better usability
- Improved bottom status bar with accurate save state
- Full documentation suite (Installation, User, Gesture, Troubleshooting, Asset Licenses)
- Manual acceptance checklist with 50+ test steps

## Technical Details

- **Platform:** Windows 10/11 (64-bit)
- **Installer size:** 163.9 MB
- **Electron:** 45.3.3
- **Node.js:** 24.x
- **Renderer:** React 18 + TypeScript + Vite + Three.js + React Three Fiber + Drei
- **Gesture:** MediaPipe Tasks Vision
- **State:** Zustand
- **Tests:** 69 passing (8 test files)
- **Build warnings:** 0

## Installation

1. Download `Gesture Drive 3D Setup 0.2.0.exe`
2. Run the installer
3. Choose installation directory
4. Launch from desktop or Start menu shortcut

## SHA-256 Checksum

```
D398B66E3EAC81AC55E93CBC284B6597D732C1751EF3758004E4DF4E3F678414
```

## Known Limitations

- 18 of 19 catalogue entries remain unavailable (no verified 3D assets)
- BMW M4 year/variant/specifications not independently verified
- Native dialog GUI workflow requires manual testing
- Full save-close-reopen GUI workflow requires manual testing
- Physical webcam/MediaPipe testing required
- Real AI provider requests require API credentials
- Installer is unsigned (no code signing certificate)

## Manual Testing Status

All automated tests pass. Manual GUI, webcam, and AI credential tests are pending. See `PHASE_6_MANUAL_ACCEPTANCE_CHECKLIST.md`.

## Asset Attribution

BMW M4 Competition M Package by SRT Performance™. CC BY 4.0. Original Sketchfab listing deleted; mirror by Cooper Codes. Model geometry and textures unmodified.

## Upgrade Notes

Projects saved in 0.1.0 are fully compatible with 0.2.0. No schema changes.

## Checksums

See `RELEASE_CHECKSUMS.txt` for SHA-256 of both installers.