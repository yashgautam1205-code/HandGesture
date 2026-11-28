# Gesture Drive 3D — GitHub Release 0.2.0

## Release Title

Gesture Drive 3D v0.2.0 — Professional Windows Release

## Version

0.2.0

## Release Summary

Gesture Drive 3D is a premium automotive digital customization studio for Windows. This release includes 7 verified real 3D vehicle assets, gesture-based interaction via MediaPipe, AI-powered styling assistance with offline presets, full project persistence with native Windows dialogs, and a professional NSIS installer.

## New Features and Improvements

### Vehicle Library (Phase 15)
- **7 verified real 3D assets** with legal licenses:
  - BMW M4 G82 (CC BY 4.0, 22.7 MB, 2 components)
  - Toy Car (CC0 1.0, 5.4 MB, 1 component)
  - Khronos Car Concept (CC BY 4.0, 11.8 MB, 23 components)
  - Kenney Sedan (CC0 1.0, 87 KB, 5 components)
  - Kenney SUV (CC0 1.0, 105 KB, 6 components)
  - Kenney Sedan Sports (CC0 1.0, 91 KB, 6 components)
  - Kenney Truck (CC0 1.0, 90 KB, 5 components)
- **25-entry vehicle catalogue** with manufacturer/model filtering
- 18 placeholder entries for future asset acquisition
- SHA-256 integrity verification for all assets
- Component hierarchy mappings (48 total mappings)

### AI-Powered Styling Assistant (Phase 14/17)
- **Dual provider support:** OpenAI (GPT-4o-mini) + Anthropic (Claude 3.5 Sonnet)
- **Secure credential isolation:** API keys only in Electron main process
- **Full vehicle context injection:** Components, materials, capabilities, actions
- **7 offline styling presets** (no API key required):
  - Racing Red, Stealth Black, Luxury Chrome, Cyberpunk Neon
  - Off-Road Olive, Executive Navy, Street Carbon
- **Preview → Apply → Cancel → Undo workflow** with structured proposals

### Advanced Gesture Controls (Phase 14/17)
- **MediaPipe Tasks Vision 0.10.21** integration
- **8 gesture types:** Pinch, Open Palm, Point, Two-Hand Spread, Two-Hand Pinch, Closed Fist, Thumbs-Up
- **Smart selection flow:** Pinch → Dwell (800ms) → Confirm → Thumbs-Up
- **Reliability features:** Tracking loss detection/recovery, per-gesture cooldowns, debounce/throttle, stable detection

### Project Persistence (Phase 13/17)
- **Schema v2** with backward compatibility (v1 auto-migration)
- **Native Windows Save/Open dialogs** via Electron main process
- **Full state preservation:** Vehicle, materials, components, rotations, replacement parts, gesture settings, AI customizations
- **Format:** `.gd3d.json` (UTF-8 JSON)
- **Undo/Redo:** 40 snapshots with full history

### Security Hardening (Phase 16)
- Context isolation + sandbox + nodeIntegration: false
- Trusted-renderer IPC validation
- Credential isolation (main process only)
- Content Security Policy enforcement
- No credentials in renderer bundle
- No external downloads at runtime

### Windows Installer (Phase 16/17)
- Professional NSIS installer with customizable directory
- Desktop and Start Menu shortcuts
- Per-machine installation
- **Unsigned** (SmartScreen warning expected — documented)

## Technical Details

| Property | Value |
|----------|-------|
| Platform | Windows 10/11 (64-bit) |
| Installer size | 188.2 MB |
| Electron | 43.8.13 (CommonJS) |
| Node.js | 24.x |
| Renderer | React 18 + TypeScript + Vite + Three.js + R3F + Drei |
| Gestures | MediaPipe Tasks Vision 0.10.21 |
| State | Zustand 5.0.3 |
| Tests | 107 passing (10 test files) |
| Build warnings | 0 |

## Installation

1. Download `Gesture Drive 3D Setup 0.2.0.exe` from Releases
2. Run the installer
3. Choose installation directory
4. Launch from desktop or Start menu shortcut

**Note:** The installer is not code-signed. Windows SmartScreen will display a warning on first run. Click "More info" → "Run anyway" to proceed.

## SHA-256 Checksum

```
05408ef6bfb424b8f053f04fc53f63d12031ebfb316c5ac776fa44a408608d03
```

Verify with PowerShell:
```powershell
Get-FileHash "Gesture Drive 3D Setup 0.2.0.exe" -Algorithm SHA256
```

## Known Limitations

- **Unsigned installer:** Windows SmartScreen warning (click "More info" → "Run anyway")
- **No code signing certificate:** Future enhancement
- **No auto-updater:** Manual reinstall required for updates
- **x64 only:** No ARM64 build available
- **Default Electron icon:** No custom application icon
- **Development mode:** Electron 43+ npm package is binary downloader; use `npm run package:win` for Electron testing
- **18 of 25 catalogue entries unavailable:** Placeholders for future asset acquisition
- **Physical webcam testing:** Not performed in CI (requires hardware)
- **Real AI provider testing:** Not performed (requires API credentials)
- **Human visual acceptance:** Not performed (requires manual verification)

## Manual Testing Status

All 107 automated tests pass. Hardware-dependent tests (webcam, real AI, visual verification, GPU performance) are documented as NOT TESTED. See Phase 17 reports for details.

## Asset Attribution

### BMW M4 Competition M Package
by SRT Performance™, licensed CC BY 4.0. Original Sketchfab: https://sketchfab.com/3d-models/bmw-m4-competition-m-package-5c0a2dafb1ad408d9fc9eeef9aee531b. Mirror by Cooper Codes. Model geometry and textures unmodified. SHA-256: `913ac951ba2645777c91393b86aed2def2433a807e57e626b203908aa474b8fb`

### Toy Car
by Guido Odendahl and Eric Chadwick, CC0 1.0 Universal. Source: Khronos Group glTF Sample Assets. SHA-256: `01a60862de55cd4b9f3acfab0b0def86451800f9c42467fcd61052c16cb9838c`

### Khronos Car Concept
by Eric Chadwick (Darmstadt Graphics Group GmbH), CC BY 4.0. Source: Khronos Group glTF Sample Assets. SHA-256: `c272098089d78c5cd9fd9f24ff50ee8acf8d932c55f2d55fc10adb6c8998966b`

### Kenney Car Kit Vehicles (Sedan, SUV, Sedan Sports, Truck)
by Kenney (www.kenney.nl), CC0 1.0 Universal. Source: https://kenney.nl/assets/car-kit. SHA-256s in ATTRIBUTION.txt.

### Showroom Environments (HDRI)
All sourced from Poly Haven (https://polyhaven.com) under CC0 1.0 Universal.

### Third-Party Libraries
Electron, React, Vite, TypeScript, Three.js, @react-three/fiber, @react-three/drei, Zustand, MediaPipe Hands, @gltf-transform/cli, Vitest, ESLint, Prettier. All under respective open-source licenses (MIT, Apache-2.0, BSD, etc.).

See [ATTRIBUTION.txt](ATTRIBUTION.txt) for complete licence details and SHA-256 verification hashes.

## Upgrade Notes

Projects saved in 0.1.0 are fully compatible with 0.2.0. Schema v2 auto-migrates v1 projects. No breaking changes.

## Checksums

See `SHA256SUMS.txt` for SHA-256 of both installers (0.1.0 and 0.2.0).