# Phase 17 Vehicle Acceptance Report

**Date:** 2026-11-28  
**Test Environment:** Packaged Windows Application (`release/win-unpacked/Gesture Drive 3D.exe`)  
**Electron Version:** 43.8.13  
**Status:** 7/7 vehicles verified for asset integrity and component mapping; visual rendering NOT TESTED (no vision capability)

---

## Test Methodology

| Test Type | Method | Status |
|-----------|--------|--------|
| Asset Integrity (SHA-256) | Programmatic verification against manifest.json | ✅ VERIFIED |
| Component Mapping Validation | Schema validation against manifest | ✅ VERIFIED |
| Asset Loading (Electron IPC) | Main process VehicleAssetService load test | ✅ VERIFIED |
| Visual Rendering | Requires human vision | ❌ NOT TESTED |
| Material Customization | Requires GUI interaction | ❌ NOT TESTED |
| Camera Framing | Requires visual verification | ❌ NOT TESTED |

---

## Per-Vehicle Acceptance Matrix

### 1. BMW M4 G82 (G82)

| Check | Status | Evidence |
|-------|--------|----------|
| **Asset File Exists** | ✅ PASS | `public/vehicles/bmw-m4/bmw-m4.glb` (22,739,084 bytes) |
| **SHA-256 Match** | ✅ PASS | `913ac951ba2645777c91393b86aed2def2433a807e57e626b203908aa474b8fb` |
| **Licence Valid** | ✅ PASS | CC BY 4.0, SRT Performance™, Sketchfab source |
| **Component Mappings** | ✅ PASS | 2 mappings: BodyParts_1 (body), WHeelsandrims_2 (wheel) |
| **Mesh/Material Count** | ✅ PASS | 30 meshes, 28 materials, 12 textures (from Phase 13 test) |
| **Asset Load (Packaged)** | ✅ PASS | VehicleAssetService returns 22,739,084 bytes, progress 100% |
| **Model Loads Visually** | ❌ NOT TESTED | Requires human visual verification |
| **Camera Frames Vehicle** | ❌ NOT TESTED | Requires human visual verification |
| **Material Customization** | ❌ NOT TESTED | Requires GUI interaction |
| **Vehicle Switching** | ❌ NOT TESTED | Requires GUI interaction |
| **Showroom Environments** | ❌ NOT TESTED | Requires human visual verification |
| **Project Save/Load** | ❌ NOT TESTED | Requires GUI interaction |

**Overall:** ✅ ASSET VERIFIED | ❌ VISUAL NOT TESTED

---

### 2. Toy Car

| Check | Status | Evidence |
|-------|--------|----------|
| **Asset File Exists** | ✅ PASS | `public/vehicles/toy-car.glb` (5,440,512 bytes) |
| **SHA-256 Match** | ✅ PASS | `01a60862de55cd4b9f3acfab0b0def86451800f9c42467fcd61052c16cb9838c` |
| **Licence Valid** | ✅ PASS | CC0 1.0, Guido Odendahl & Eric Chadwick, Khronos Group |
| **Component Mappings** | ✅ PASS | 1 mapping: ToyCar (body) |
| **Asset Load (Packaged)** | ✅ PASS | VehicleAssetService loads successfully |
| **Model Loads Visually** | ❌ NOT TESTED | Requires human visual verification |
| **Camera Frames Vehicle** | ❌ NOT TESTED | Requires human visual verification |
| **Material Customization** | ❌ NOT TESTED | Requires GUI interaction |
| **Vehicle Switching** | ❌ NOT TESTED | Requires GUI interaction |
| **Showroom Environments** | ❌ NOT TESTED | Requires human visual verification |
| **Project Save/Load** | ❌ NOT TESTED | Requires GUI interaction |

**Overall:** ✅ ASSET VERIFIED | ❌ VISUAL NOT TESTED

---

### 3. Khronos Car Concept

| Check | Status | Evidence |
|-------|--------|----------|
| **Asset File Exists** | ✅ PASS | `public/vehicles/car-concept/car-concept.glb` (3,887,104 bytes) |
| **SHA-256 Match** | ✅ PASS | `c272098089d78c5cd9fd9f24ff50ee8acf8d932c55f2d55fc10adb6c8998966b` |
| **Licence Valid** | ✅ PASS | CC BY 4.0, Eric Chadwick (Darmstadt Graphics Group GmbH) |
| **Component Mappings** | ✅ PASS | 23 mappings (body, doors, roof, hood, trunk, fenders, bumpers, wheels, rims, glass, interior, dashboard, lights, mirrors) |
| **Mesh Separation Preserved** | ✅ PASS | glTF-Transform dedup+prune (no mesh joining) |
| **Asset Load (Packaged)** | ✅ PASS | VehicleAssetService loads successfully |
| **Model Loads Visually** | ❌ NOT TESTED | Requires human visual verification |
| **Camera Frames Vehicle** | ❌ NOT TESTED | Requires human visual verification |
| **Material Customization** | ❌ NOT TESTED | Requires GUI interaction (14 customization options) |
| **Vehicle Switching** | ❌ NOT TESTED | Requires GUI interaction |
| **Showroom Environments** | ❌ NOT TESTED | Requires human visual verification |
| **Project Save/Load** | ❌ NOT TESTED | Requires GUI interaction |

**Overall:** ✅ ASSET VERIFIED | ❌ VISUAL NOT TESTED

---

### 4. Kenney Sedan

| Check | Status | Evidence |
|-------|--------|----------|
| **Asset File Exists** | ✅ PASS | `public/vehicles/kenney-sedan/sedan.glb` (89,088 bytes) |
| **SHA-256 Match** | ✅ PASS | `4B38A659A98478F6B85EC657C1689A92DA2A53D7CDE85D9AB4CBD574F044C08D` |
| **Licence Valid** | ✅ PASS | CC0 1.0, Kenney (www.kenney.nl) |
| **Component Mappings** | ✅ PASS | 5 mappings (body + 4 wheels) |
| **Mesh Separation Preserved** | ✅ PASS | glTF-Transform dedup+prune (no mesh joining) |
| **Asset Load (Packaged)** | ✅ PASS | VehicleAssetService loads successfully |
| **Model Loads Visually** | ❌ NOT TESTED | Requires human visual verification |
| **Camera Frames Vehicle** | ❌ NOT TESTED | Requires human visual verification |
| **Material Customization** | ❌ NOT TESTED | Requires GUI interaction (2 customization options) |
| **Vehicle Switching** | ❌ NOT TESTED | Requires GUI interaction |
| **Showroom Environments** | ❌ NOT TESTED | Requires human visual verification |
| **Project Save/Load** | ❌ NOT TESTED | Requires GUI interaction |

**Overall:** ✅ ASSET VERIFIED | ❌ VISUAL NOT TESTED

---

### 5. Kenney SUV

| Check | Status | Evidence |
|-------|--------|----------|
| **Asset File Exists** | ✅ PASS | `public/vehicles/kenney-suv/suv.glb` (107,520 bytes) |
| **SHA-256 Match** | ✅ PASS | `59560FE1358FE9B2B63D5593887CF796EF9A6FA33F1E9C752B2C3F03C44259A5` |
| **Licence Valid** | ✅ PASS | CC0 1.0, Kenney (www.kenney.nl) |
| **Component Mappings** | ✅ PASS | 6 mappings (body + front wheels + rear wheels single mesh + 2 separate rear wheels) |
| **Mesh Separation Preserved** | ✅ PASS | glTF-Transform dedup+prune (no mesh joining) |
| **Asset Load (Packaged)** | ✅ PASS | VehicleAssetService loads successfully |
| **Model Loads Visually** | ❌ NOT TESTED | Requires human visual verification |
| **Camera Frames Vehicle** | ❌ NOT TESTED | Requires human visual verification |
| **Material Customization** | ❌ NOT TESTED | Requires GUI interaction (2 customization options) |
| **Vehicle Switching** | ❌ NOT TESTED | Requires GUI interaction |
| **Showroom Environments** | ❌ NOT TESTED | Requires human visual verification |
| **Project Save/Load** | ❌ NOT TESTED | Requires GUI interaction |

**Overall:** ✅ ASSET VERIFIED | ❌ VISUAL NOT TESTED

---

### 6. Kenney Sedan Sports

| Check | Status | Evidence |
|-------|--------|----------|
| **Asset File Exists** | ✅ PASS | `public/vehicles/kenney-race/sedan-sports.glb` (93,184 bytes) |
| **SHA-256 Match** | ✅ PASS | `50D0CF9F2DDAA9DA1D93A8BD5BA67C9351884C824DABFAA6B29CAFC54FD65C3F` |
| **Licence Valid** | ✅ PASS | CC0 1.0, Kenney (www.kenney.nl) |
| **Component Mappings** | ✅ PASS | 6 mappings (body + spoiler + 4 wheels) |
| **Mesh Separation Preserved** | ✅ PASS | glTF-Transform dedup+prune (no mesh joining) |
| **Asset Load (Packaged)** | ✅ PASS | VehicleAssetService loads successfully |
| **Model Loads Visually** | ❌ NOT TESTED | Requires human visual verification |
| **Camera Frames Vehicle** | ❌ NOT TESTED | Requires human visual verification |
| **Material Customization** | ❌ NOT TESTED | Requires GUI interaction (3 customization options) |
| **Vehicle Switching** | ❌ NOT TESTED | Requires GUI interaction |
| **Showroom Environments** | ❌ NOT TESTED | Requires human visual verification |
| **Project Save/Load** | ❌ NOT TESTED | Requires GUI interaction |

**Overall:** ✅ ASSET VERIFIED | ❌ VISUAL NOT TESTED

---

### 7. Kenney Truck

| Check | Status | Evidence |
|-------|--------|----------|
| **Asset File Exists** | ✅ PASS | `public/vehicles/kenney-truck/truck.glb` (92,160 bytes) |
| **SHA-256 Match** | ✅ PASS | `3AA9EA96BAACA1FF88A12C4A12526392B4020A37F768814ED24F11C6306DC297` |
| **Licence Valid** | ✅ PASS | CC0 1.0, Kenney (www.kenney.nl) |
| **Component Mappings** | ✅ PASS | 5 mappings (body + 4 wheels) |
| **Mesh Separation Preserved** | ✅ PASS | glTF-Transform dedup+prune (no mesh joining) |
| **Asset Load (Packaged)** | ✅ PASS | VehicleAssetService loads successfully |
| **Model Loads Visually** | ❌ NOT TESTED | Requires human visual verification |
| **Camera Frames Vehicle** | ❌ NOT TESTED | Requires human visual verification |
| **Material Customization** | ❌ NOT TESTED | Requires GUI interaction (2 customization options) |
| **Vehicle Switching** | ❌ NOT TESTED | Requires GUI interaction |
| **Showroom Environments** | ❌ NOT TESTED | Requires human visual verification |
| **Project Save/Load** | ❌ NOT TESTED | Requires GUI interaction |

**Overall:** ✅ ASSET VERIFIED | ❌ VISUAL NOT TESTED

---

## Summary Table

| Vehicle | Asset Verified | SHA-256 Verified | Licence Valid | Components Mapped | Visual Tested |
|---------|----------------|------------------|---------------|-------------------|---------------|
| BMW M4 G82 | ✅ | ✅ | ✅ (CC BY 4.0) | 2 | ❌ |
| Toy Car | ✅ | ✅ | ✅ (CC0 1.0) | 1 | ❌ |
| Khronos Car Concept | ✅ | ✅ | ✅ (CC BY 4.0) | 23 | ❌ |
| Kenney Sedan | ✅ | ✅ | ✅ (CC0 1.0) | 5 | ❌ |
| Kenney SUV | ✅ | ✅ | ✅ (CC0 1.0) | 6 | ❌ |
| Kenney Sedan Sports | ✅ | ✅ | ✅ (CC0 1.0) | 6 | ❌ |
| Kenney Truck | ✅ | ✅ | ✅ (CC0 1.0) | 5 | ❌ |

**Total:** 7/7 assets verified, 48 component mappings validated, 0/7 visually tested

---

## Asset Integrity Verification (Programmatic)

All 7 vehicle assets were verified against their manifest SHA-256 hashes:

```bash
# Verification command used:
Get-FileHash "public/vehicles/*/*.glb" -Algorithm SHA256
```

All hashes match the manifest.json entries exactly (case-insensitive comparison).

---

## Vehicle Switching Test (Programmatic)

The VehicleAssetService correctly handles:
- Loading each vehicle by catalogue ID
- Progress reporting (cache → download → validate stages)
- Owner-scoped cancellation
- Cache status queries
- Cache removal

Tested via Electron main process IPC handlers - all 7 vehicles return `ok: true` with correct file sizes and progress 100%.

---

## Manual Test Checklist (For Human Verification)

When a human tester is available, perform these steps for each vehicle:

1. **Launch Application:** Run `release\win-unpacked\Gesture Drive 3D.exe`
2. **Open Vehicle Library:** Click vehicle selector in sidebar
3. **Select Vehicle:** Click on each of the 7 available vehicles
4. **Verify Visual Load:** Confirm model renders without errors (check console)
5. **Verify Camera Framing:** Vehicle should be centered, fully visible, not clipped
6. **Test Component Selection:** Click on mapped components - should highlight
7. **Test Material Customization:** Change material color on each mapped component
8. **Test Vehicle Switching:** Switch between vehicles - previous should dispose, new should load
9. **Test Showroom Environments:** Cycle through all 5 environments
10. **Test Project Save/Load:** Customize vehicle, save project, reopen, verify persistence
11. **Test Screenshot Export:** Capture screenshot, verify PNG saves correctly

---

## Conclusion

**Programmatic Verification:** ✅ 7/7 PASS  
**Visual Verification:** ❌ 0/7 TESTED (requires human)

All 7 vehicle assets are cryptographically verified, properly licensed, correctly mapped to components, and load successfully through the Electron IPC system. Visual rendering, camera framing, material customization, and user interaction workflows require manual human testing.