# Phase 17 Final Release Candidate Artifacts

**Date:** 2026-11-28  
**Version:** 0.2.0  
**Status:** ✅ READY FOR RELEASE

---

## Release Candidate Artifacts

| Artifact | Version | Size | SHA256 |
|----------|---------|------|--------|
| `Gesture Drive 3D Setup 0.2.0.exe` | 0.2.0 | 188,293,862 bytes (179 MB) | `05408ef6bfb424b8f053f04fc53f63d12031ebfb316c5ac776fa44a408608d03` |
| `Gesture Drive 3D Setup 0.2.0.exe.blockmap` | 0.2.0 | 206,588 bytes | (auto-generated) |
| `latest.yml` | 0.2.0 | 361 bytes | (auto-generated) |
| `SHA256SUMS.txt` | 0.2.0 | ~160 bytes | — |

---

## Installer Verification

### SHA256 Checksums
```
SHA256 (Gesture Drive 3D Setup 0.2.0.exe) = 05408ef6bfb424b8f053f04fc53f63d12031ebfb316c5ac776fa44a408608d03
SHA256 (Gesture Drive 3D Setup 0.1.0.exe) = 7f24e047ed4d26f5f7082b564d85939a3450aae47b31a4423f765115ef69e54a
```

### File Locations
- **Source:** `C:\Hand Gesture\release\Gesture Drive 3D Setup 0.2.0.exe`
- **Checksums:** `C:\Hand Gesture\release\SHA256SUMS.txt`
- **GitHub Release:** To be uploaded to https://github.com/yashgautam1205-code/HandGesture/releases

---

## Release Package Contents

### Installed Application Structure
```
Gesture Drive 3D/
├── Gesture Drive 3D.exe          # Electron app (signed: no)
├── resources/
│   ├── app.asar                  # Main application bundle
│   │   ├── dist/                 # Vite build output
│   │   ├── electron/             # Electron main/preload
│   │   ├── node_modules/         # Production deps (excludes electron)
│   │   ├── package.json
│   │   └── public/vehicles/      # 7 vehicle assets (embedded)
│   └── app.asar.unpacked/        # Unpacked native modules
│       └── mediapipe/            # MediaPipe native binaries
├── LICENSE.electron.txt
├── LICENSES.chromium.html
├── swiftshader/                  # ANGLE/SwiftShader fallback
├── v8_context_snapshot.bin
├── icudtl.dat
├── uninstall.exe                 # NSIS uninstaller
└── Gesture Drive 3D.url          # Website shortcut (optional)
```

---

## Build Configuration

### electron-builder Configuration
```json
{
  "appId": "com.gesturedrive3d.app",
  "productName": "Gesture Drive 3D",
  "copyright": "Copyright © 2026",
  "directories": {
    "output": "release",
    "buildResources": "build"
  },
  "files": [
    "dist/**/*",
    "electron/**/*",
    "public/**/*",
    "node_modules/**/*",
    "package.json"
  ],
  "extraResources": [
    {
      "from": "public/vehicles",
      "to": "vehicles",
      "filter": ["**/*"]
    }
  ],
  "win": {
    "target": "nsis",
    "icon": "build/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "perMachine": true,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "license": "build/license.txt"
  },
  "asar": true,
  "compression": "maximum",
  "electronVersion": "43.8.13"
}
```

---

## Verification Checklist

| Check | Status | Details |
|-------|--------|---------|
| Installer builds without errors | ✅ PASS | `npm run package:win` completes in ~45s |
| Installer installs successfully | ✅ PASS | NSIS wizard, per-machine install |
| Application launches | ✅ PASS | Exit code 0, loads main window |
| Vehicle assets load | ✅ PASS | All 7 vehicles via IPC |
| Native dialogs work | ✅ PASS | Save/Open/Screenshot dialogs |
| Vehicle switching works | ✅ PASS | 7→7 cycles tested |
| Uninstaller works | ✅ PASS | Clean removal |
| SHA256 verified | ✅ PASS | `05408ef6bfb424b8f053f04fc53f63d12031ebfb316c5ac776fa44a408608d03` |
| No development files in package | ✅ PASS | Only production files in asar |
| Electron excluded from asar | ✅ PASS | `electron-builder` handles automatically |
| MediaPipe binaries included | ✅ PASS | In `app.asar.unpacked/mediapipe/` |

---

## Release Notes (v0.2.0)

### What's New

#### 🚗 7 Verified Real Vehicle Assets
- **BMW M4 G82** (CC BY 4.0) — 22.7 MB, 2 components
- **Toy Car** (CC0) — 5.4 MB, 1 component
- **Khronos Car Concept** (CC BY 4.0) — 11.8 MB, 23 components
- **Kenney Sedan** (CC0) — 87 KB, 5 components
- **Kenney SUV** (CC0) — 105 KB, 6 components
- **Kenney Sedan Sports** (CC0) — 91 KB, 6 components
- **Kenney Truck** (CC0) — 90 KB, 5 components

#### 🎨 25-Entry Vehicle Catalogue
- 7 available vehicles with full component mappings
- 18 placeholder entries for future acquisition
- Manufacturer/model filtering
- SHA-256 integrity verification for all assets

#### 🤖 AI-Powered Customization
- OpenAI (GPT-4o-mini) + Anthropic (Claude 3.5 Sonnet) integration
- Secure credential isolation (main process only)
- Full vehicle context injection
- 7 offline styling presets (no API key required)
- Preview → Apply → Cancel → Undo workflow

#### 🤲 Advanced Gesture Controls
- Pinch (zoom), Open Palm (orbit), Point (select), Two-Hand (exploded/zoom)
- **Smart Selection:** Pinch → Dwell (800ms) → Confirm → Thumbs-Up
- Tracking loss detection & auto-recovery
- Per-gesture cooldowns & debounce
- MediaPipe Tasks Vision (0.10.21)

#### 💾 Project Persistence (Schema v2)
- Native Windows Save/Open dialogs
- Backward compatible with v1
- Preserves: vehicle, materials, components, gestures, AI settings
- `.gd3d.json` format (UTF-8 JSON)

#### 🔒 Security Hardened
- Context isolation + sandbox + nodeIntegration:false
- Trusted-renderer IPC validation
- Credential isolation (main process only)
- CSP enforcement
- No credentials in renderer bundle

---

## Known Limitations (Documented)

| Limitation | Impact | Workaround |
|------------|--------|------------|
| Unsigned installer | SmartScreen warning | "More info" → "Run anyway" |
| No code signing | Untrusted publisher | Future: obtain EV certificate |
| No auto-updater | Manual reinstall | Download new version |
| x64 only | No ARM64 | Future: add arm64 build |
| Default icon | Generic Electron icon | Future: custom .ico |
| Dev mode broken | Electron 43+ npm package | Use `npm run package:win` |
| No CI artifact upload | Manual release | Future: GitHub Actions release |

---

## GitHub Release Preparation

### Release Tag
```bash
git tag -a v0.2.0 -m "Gesture Drive 3D v0.2.0 - 7 Real Vehicles, AI Styling, Gesture Controls"
git push origin v0.2.0
```

### Release Assets to Upload
1. `Gesture Drive 3D Setup 0.2.0.exe` (179 MB)
2. `SHA256SUMS.txt`

### Release Body Template
```markdown
# Gesture Drive 3D v0.2.0

## 🚗 7 Verified Real Vehicle Assets
- BMW M4 G82 (CC BY 4.0)
- Toy Car (CC0)
- Khronos Car Concept (CC BY 4.0)
- Kenney Sedan/SUV/Sedan Sports/Truck (CC0 ×4)

## 🤖 AI-Powered Styling Assistant
- OpenAI GPT-4o-mini / Anthropic Claude 3.5 Sonnet
- 7 offline presets (no API key needed)
- Secure credential isolation

## 🤲 Smart Gesture Controls
- Pinch→Dwell→Confirm→Thumbs-Up selection flow
- Tracking loss recovery
- Per-gesture cooldowns

## 💾 Project Save/Load (Schema v2)
- Native Windows dialogs
- Full state preservation

## 📥 Installation
1. Download `Gesture Drive 3D Setup 0.2.0.exe`
2. Run installer (SmartScreen: "More info" → "Run anyway")
3. Launch from Start Menu or Desktop

## ✅ Verification
```
SHA256 (Gesture Drive 3D Setup 0.2.0.exe) = 05408ef6bfb424b8f053f04fc53f63d12031ebfb316c5ac776fa44a408608d03
```

## 📄 Full Changelog
See [PHASE_17_RELEASE_AUDIT_REPORT.md](PHASE_17_RELEASE_AUDIT_REPORT.md)
```

---

## Acceptance Criteria Met

| Criterion | Status | Evidence |
|-----------|--------|----------|
| All 107 automated tests pass | ✅ | `npm test` |
| TypeScript compiles without errors | ✅ | `npx tsc --noEmit` |
| Web build succeeds | ✅ | `npm run build:web` |
| Electron build succeeds | ✅ | `npm run build:electron` |
| Windows installer builds | ✅ | `npm run package:win` |
| Installer installs & launches | ✅ | Manual verification |
| All 7 vehicles load | ✅ | IPC verified |
| Native dialogs functional | ✅ | Save/Open/Screenshot |
| Schema v2 persistence | ✅ | Unit tests + manual |
| Security controls intact | ✅ | Phase 17 Security Audit |
| No secrets in repository | ✅ | Phase 17 GitHub Audit |
| Attribution complete | ✅ | ATTRIBUTION.txt |

---

## Next Steps

1. **Push release tag** to trigger GitHub release
2. **Upload artifacts** to GitHub release page
3. **Verify download** from GitHub releases
4. **Update documentation** links if needed
5. **Announce release** (optional)

---

**Release Candidate Status:** ✅ **APPROVED FOR PUBLIC RELEASE**

All Phase 17 tasks complete. The v0.2.0 installer is verified, tested, and ready for distribution.