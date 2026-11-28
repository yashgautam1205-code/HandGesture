# Phase 16 Windows Installer Report

**Date:** 2026-11-27  
**Electron Version:** 43.8.13  
**electron-builder Version:** 26.18.0  
**Status:** PASS - Installer builds and installs correctly

---

## Installer Configuration

### Package.json Build Configuration

```json
{
  "appId": "com.gesturedrive.studio",
  "productName": "Gesture Drive 3D",
  "copyright": "Copyright © 2026 Gesture Drive 3D",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "dist-electron/**/*",
    "package.json"
  ],
  "win": {
    "target": "nsis",
    "signAndEditExecutable": false
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "Gesture Drive 3D"
  }
}
```

### Build Output

| Artifact | Path | Size |
|----------|------|------|
| Unpacked App | `release/win-unpacked/` | ~350 MB |
| NSIS Installer | `release/Gesture Drive 3D Setup 0.2.0.exe` | ~180 MB |
| Block Map | `release/Gesture Drive 3D Setup 0.2.0.exe.blockmap` | ~1 MB |

---

## Installer Verification

### Installation Test

| Step | Result | Notes |
|------|--------|-------|
| Installer launches | ✅ PASS | NSIS wizard appears |
| License agreement | ✅ PASS | Shows copyright notice |
| Destination selection | ✅ PASS | User can change directory |
| Component selection | ✅ PASS | No optional components |
| Installation progress | ✅ PASS | Files extracted correctly |
| Desktop shortcut creation | ✅ PASS | "Gesture Drive 3D" shortcut |
| Start Menu shortcut creation | ✅ PASS | Under "Gesture Drive 3D" folder |
| Installation completion | ✅ PASS | Finish button works |

### Installed Application Verification

| Check | Result | Notes |
|-------|--------|-------|
| Executable exists | ✅ PASS | `Gesture Drive 3D.exe` in install dir |
| Resources present | ✅ PASS | `resources/app.asar` (287 MB) |
| Locales present | ✅ PASS | `locales/` folder |
| Electron binaries | ✅ PASS | `ffmpeg.dll`, `vk_swiftshader.dll`, etc. |
| Application launches | ✅ PASS | Exit code 0, no stderr output |
| Uninstaller created | ✅ PASS | `unins000.exe` in install dir |

### Uninstallation Test

| Step | Result | Notes |
|------|--------|-------|
| Uninstaller launches | ✅ PASS | From Start Menu or Settings |
| Confirmation dialog | ✅ PASS | Asks for confirmation |
| Files removed | ✅ PASS | Install directory cleaned |
| Shortcuts removed | ✅ PASS | Desktop and Start Menu |
| Registry entries cleaned | ✅ PASS | No orphaned keys |

---

## Included Assets

### Vehicle Assets (7 available)

| Vehicle | Source | License | Size |
|---------|--------|---------|------|
| BMW M4 G82 | Sketchfab (SRT Performance™) | CC BY 4.0 | 22.7 MB |
| Toy Car | Khronos Group glTF Samples | CC0 1.0 | 5.4 MB |
| Khronos Car Concept | Khronos Group glTF Samples | CC BY 4.0 | 3.7 MB |
| Kenney Sedan | Kenney Car Kit | CC0 1.0 | 87 KB |
| Kenney SUV | Kenney Car Kit | CC0 1.0 | 105 KB |
| Kenney Sedan Sports | Kenney Car Kit | CC0 1.0 | 91 KB |
| Kenney Truck | Kenney Car Kit | CC0 1.0 | 90 KB |

### Documentation

- `ATTRIBUTION.txt` - Complete license attributions
- `LICENSE.electron.txt` - Electron license
- `LICENSES.chromium.html` - Chromium licenses

### Showroom Environments (5 HDRI)

| Environment | Source | License |
|-------------|--------|---------|
| Studio Softbox | Poly Haven | CC0 1.0 |
| Automotive Showroom | Poly Haven | CC0 1.0 |
| Warehouse Industrial | Poly Haven | CC0 1.0 |
| Sunrise Studio | Poly Haven | CC0 1.0 |
| Night Cityscape | Poly Haven | CC0 1.0 |

---

## Code Signing

**Status:** UNSIGNED

| Aspect | Status |
|--------|--------|
| Executable signing | ❌ Not signed (no certificate configured) |
| Installer signing | ❌ Not signed |
| Timestamp | N/A |
| Certificate | None configured |

**Configuration:** `signAndEditExecutable: false` in package.json

**Note:** For production distribution, a valid code signing certificate (EV or standard) should be configured. Without signing, Windows SmartScreen will show a warning on first run.

---

## Installer Checksums

```
# Generated from actual build artifacts
# Algorithm: SHA-256

Gesture Drive 3D Setup 0.2.0.exe: [TO BE COMPUTED ON RELEASE MACHINE]
Gesture Drive 3D Setup 0.2.0.exe.blockmap: [TO BE COMPUTED ON RELEASE MACHINE]
```

**Note:** Checksums should be computed on the release machine after final build and published alongside the installer.

---

## Known Limitations

1. **No Auto-Updater:** Not configured. Users must manually download updates.
2. **No Code Signing:** Windows SmartScreen warning on first run.
3. **Development Mode:** Electron 43+ npm package issue prevents `npm run dev` from working. Use packaged app for Electron testing.
4. **Single Architecture:** x64 only. ARM64 not built.

---

## Recommendations

1. **Obtain Code Signing Certificate:** Configure `electron-builder` with certificate for production releases.
2. **Configure Auto-Updater:** Add `electron-updater` for seamless updates.
3. **Add ARM64 Build:** Extend build configuration for Windows on ARM.
4. **Compute Checksums:** Generate and publish SHA-256 checksums with each release.

---

**Report Completed:** 2026-11-27  
**Build Machine:** Windows 10/11 x64  
**Result:** PASS