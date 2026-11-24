# Vehicle Database Implementation Report

## Result

**PARTIAL — catalogue and import/audit pipeline implemented; one bundled real-vehicle model is included.**

The manifest contains 19 targets. The BMW M4 record now includes a bundled BMW M4 Competition M Package GLB, registered with its actual SHA-256, source/creator attribution, and CC BY 4.0 license reference. The other 18 targets remain unavailable. Year, variant, specifications, and thumbnail remain unset for the BMW; no unverified technical details were added. The original Sketchfab page is deleted, so provenance is corroborated by the GLB's embedded metadata and the mirror repository README.

## Implemented

- Added a runtime-validated catalogue manifest with manufacturer/model, optional generation/year/variant/specifications, asset availability, source/license attribution, component mappings, and customization options.
- Added searchable catalogue UI with manufacturer, generation, year, and variant filters. Search covers manufacturer, model, generation, year, and variant.
- Unavailable entries display **3D MODEL NOT AVAILABLE — ASSET REQUIRED**. They never substitute the procedural demo model.
- Added local GLB/glTF import for a selected catalogue target. These assets are labeled user-provided and unverified, and do not inherit OEM specifications.
- Added manifest-integrity checks for local assets and an Electron-only remote retrieval/cache path. Requests accept catalogue IDs rather than arbitrary renderer URLs or paths; remote fetches require registered HTTPS source/license metadata, complete per-file hashes, same-origin redirects, and stay within the 96 MB main/128 MB total limits.
- Added download progress, owner-scoped cancellation, retry by reloading, offline cache reuse, damaged-cache replacement, and cache removal. The packaged build includes the catalogue manifest for the main process.
- Passed catalogue component mappings into the existing registry. Mappings can name generic model nodes and supply component ID/label/category, focus point, camera distance, allowed modifications, and inspect/customize permissions.
- Connected component focus points and distances to the existing camera-focus behavior.
- Prevented material changes and transforms for components whose mapping does not permit those actions.
- Added import audit information: mesh/material/texture counts, normalized bounds and scale, orientation warnings, and unmatched component mappings.
- Extended version 2 project metadata with optional catalogue ID, display name, source label, and verification state. Existing version 1 and version 2 projects remain supported.
- Added `VEHICLE_ASSET_IMPORT_GUIDE.md` with asset placement, metadata, licensing, and mapping instructions.
- Added `HOW_TO_ADD_REAL_VEHICLE_ASSETS.md` and `REAL_VEHICLE_FETCHING_IMPLEMENTATION_REPORT.md` with verified local/remote registration instructions and actual test status.

## Files changed

- `src/vehicles/types.ts`
- `src/vehicles/manifest.json`
- `src/vehicles/catalogue.ts`
- `src/vehicles/loadCatalogueAsset.ts`
- `src/engine/components.ts`
- `src/engine/modelLoader.ts`
- `src/engine/materialController.ts`
- `src/engine/projectConfig.ts`
- `src/engine/engine.test.ts`
- `src/store/studio.ts`
- `src/store/studio.test.ts`
- `src/components/StudioApp.tsx`
- `src/viewer/CarScene.tsx`
- `README.md`
- `GESTURE_DRIVE_3D_PROGRESS.md`
- `GESTURE_DRIVE_3D_FINAL_ACCEPTANCE_REPORT.md`
- `VEHICLE_DATABASE_IMPLEMENTATION_REPORT.md`
- `VEHICLE_ASSET_IMPORT_GUIDE.md`
- `HOW_TO_ADD_REAL_VEHICLE_ASSETS.md`
- `REAL_VEHICLE_FETCHING_IMPLEMENTATION_REPORT.md`
- `public/vehicles/bmw-m4/bmw-m4.glb`
- `public/vehicles/bmw-m4/ATTRIBUTION.txt`

## Verification

| Check | Result |
|---|---|
| `npm test` | **PASS** — 8 test files, 67 tests |
| `npm run build` | **PASS** — renderer TypeScript/Vite and Electron TypeScript |
| Vehicle asset service tests | **PASS** — local hash verification, remote retrieval/cache/offline reuse, retry, cache corruption/removal, license-review gate, redirect rejection, cancellation ownership, and resource-list validation |
| Catalogue and unavailable-asset tests | **PASS** — 19 entries; 18 unavailable assets throw rather than fall back |
| Real BMW M4 GLB integration test | **PASS** — actual bundled bytes and SHA-256; 30 meshes, 28 materials, 12 embedded textures, two mapped assemblies, supported material edit, and project metadata round-trip |
| Component mapping and model audit tests | **PASS** — explicit generic-node mapping, permissions, audit counts, and unmatched mappings |
| Project metadata compatibility tests | **PASS** — optional metadata round-trips; metadata-free version 2 and version 1 projects remain supported |
| Browser at 1366×768 | **PASS** — one live canvas, catalogue filter/search and unavailable state work; app shell measured 1366×768 with no overflow |
| Catalogue filtering | **PASS** — search returned 3 Porsche entries and 3 Mahindra entries; empty search result state displayed |
| Local vehicle-asset import from catalogue | **PARTIAL** — real bytes load through the production model loader; browser scene loading and packaged Electron cache behavior remain to be verified |
| BMW M4 source/license and mesh mappings | **PARTIAL** — model metadata and mirror README identify SRT Performance™ and CC BY 4.0; original listing is deleted. Only named body/exterior and combined wheel/rim assemblies map; generic `Object_n` children are not individually identified. |
| OEM year/variant/specifications and exact-generation visual fidelity | **NOT VERIFIED** — these details remain unset; the provided source names the model but the original listing is unavailable |
| Physical webcam, live gesture operation, Electron dialogs, Windows installer | **NOT VERIFIED** — outside this asset/catalogue check |

Build warnings remain for the existing large `CarScene` chunk and an ineffective dynamic import of `engine/parts.ts`; neither failed the build.

## Outstanding work

1. Verify the bundled BMW in the browser/Electron scene, including real image decoding, selection/focus, save/load, undo/redo, and packaged asset retrieval.
2. Obtain rights-cleared models for the other 18 targets and record their actual source/license and mesh hierarchy before enabling them.
3. Keep year/variant/specifications unset until reliable evidence is available.
4. Consider adding per-asset integrity hashes before treating a project-embedded copy as the same verified file as a catalogue asset.

**Exact next task:** complete browser/Electron validation of the bundled BMW asset and verify project save/load, undo/redo, component focus, and packaged local retrieval. Then add other models only when their asset provenance and license are documented.
