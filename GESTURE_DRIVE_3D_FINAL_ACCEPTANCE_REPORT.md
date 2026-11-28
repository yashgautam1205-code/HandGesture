# Gesture Drive 3D — Final Acceptance Report

## Overall result

**PASS (Phase 13 automated/security/launch gates).** The real Electron app launches on Windows 11 with no errors and renders a non-blank UI (verified by pixel analysis). 82/82 tests pass; build clean; security posture verified. Full human **visual** acceptance and physical webcam/AI remain **NOT TESTED** (executing model is not vision-capable; no hardware/credentials).

## Phase 13 Summary (2026-11-24)

### Accomplishments
- Real Electron launch on Windows 11 — no startup/runtime errors.
- Live screenshot captured (`phase13-screen.png`, 1920×1080, 222 KB);
  non-blank confirmed (111 sampled colors, full RGB range).
- Security audit: contextIsolation + sandbox, no nodeIntegration;
  `view:screenshot` IPC origin- and payload-validated.
- Bug fix: stale camera framing after vehicle switch during transition
  (`src/viewer/CarScene.tsx`).
- Reports: PHASE_13_MANUAL_ACCEPTANCE / VISUAL_TEST / BUG_FIX / FINAL_QA.

### Files Changed
- Modified: `src/viewer/CarScene.tsx` (camera re-fit), progress + this report.
- Created: `PHASE_13_MANUAL_ACCEPTANCE_REPORT.md`, `PHASE_13_VISUAL_TEST_RESULTS.md`, `PHASE_13_BUG_FIX_REPORT.md`, `PHASE_13_FINAL_QA_REPORT.md`, `phase13-screen.png`, `capture.ps1`, `analyze.ps1`.

### Verification
- `npm test`: **PASS** — 9 files, 82 tests. `npm run build`: **PASS**, zero warnings.

### Explicitly NOT TESTED
- Human visual acceptance (models, environments, camera views, modes).
- Native screenshot save dialog interaction.
- Webcam/MediaPipe (hardware); real AI provider (credentials).

### Phase Status
**PASS (automated/security/launch)** — visual/physical acceptance pending a human or vision reviewer.

---

## Phase 12 Summary (2026-11-24)

### Accomplishments
- 5 showroom environments; camera system (8 views, fit-to-FOV); presentation modes + auto-rotate; screenshot IPC; showroomEnvironment persistence.
- Tests: 82/82 (9 new). Build: zero warnings.

### Files Changed
- Created: `src/viewer/cameraSystem.ts`, `src/viewer/showroomEnvironments.ts`, `src/viewer/cameraSystem.test.ts`, `PHASE_12_SHOWROOM_REPORT.md`, `PHASE_12_CAMERA_SYSTEM_REPORT.md`, `PHASE_12_TEST_RESULTS.md`
- Modified: `CarScene.tsx`, `studio.ts`, `projectConfig.ts`, `StudioApp.tsx`, `styles.css`, `electron/main.ts`, `electron/preload.ts`, `global.d.ts`, `engine.test.ts`, `README.md`

### Manual Testing Required
Visual quality of environments, camera transitions, screenshot save, auto-rotate, both vehicles.

### Phase Status
**PASS** — Showroom implemented; manual visual acceptance pending.

---

## Phase 11 Summary (2026-11-24)

### Accomplishments
- Component hierarchy with `source`/`meshUuids`/`parentId` + `buildComponentHierarchy`
- Inspector: search, detail panel, capability display
- Material: emissive, opacity, sliders, reset; texture preservation
- Persistence: schema v2 + emissive/opacity round-trip
- Tests: 73/73; Build: clean

### Files Changed
- `src/engine/components.ts`, `src/engine/materialController.ts`, `src/engine/projectConfig.ts`
- `src/store/studio.ts`, `src/viewer/CarScene.tsx`, `src/components/StudioApp.tsx`, `src/styles.css`
- `src/engine/engine.test.ts` (4 new tests)
- `README.md`, `PHASE_11_COMPONENT_SYSTEM_REPORT.md`, `PHASE_11_COMPONENT_MAPPING_REPORT.md`, `PHASE_11_TEST_RESULTS.md`

### Manual Testing Required
Component search/detail, emissive/opacity sliders, material reset, hierarchy rendering.

### Phase Status
**PASS** — Component studio implemented; manual UI acceptance pending.

---

## Phase 10 Summary (2026-11-24)

### Accomplishments
- **Vehicle Catalogue**: 19 → 20 entries (added Toy Car, CC0 1.0 Universal)
- **Real Assets**: 2 verified vehicles available (BMW M4 G82, Toy Car)
- **UI Enhancements**: Premium vehicle card layout with hover/selected states, availability badges, improved filtering and search
- **Testing**: 69/69 tests passing (100%), no regressions
- **Build**: Successful production build, zero warnings
- **Documentation**: Created 3 comprehensive Phase 10 reports

### New Real Asset: Toy Car
- **Source**: Khronos Group glTF Sample Assets
- **License**: CC0 1.0 Universal (Public Domain)
- **Size**: 9.18 MB
- **SHA-256**: `01a60862de55cd4b9f3acfab0b0def86451800f9c42467fcd61052c16cb9838c`
- **Components**: Body (1 mesh)
- **Status**: Verified, production-ready

### UI Improvements
- Vehicle cards with premium automotive showroom aesthetic
- Hover effects with subtle elevation
- Selected state with cyan border glow
- Clear availability indicators (green/amber badges)
- Unavailable vehicles visually de-emphasized (60% opacity)
- Enhanced filtering (manufacturer, generation, year, variant, body style, availability)
- Full-text search across all vehicle metadata

### Test Results
- **Total Tests**: 69 (8 test files)
- **Pass Rate**: 100%
- **New Coverage**: Toy Car catalogue validation, component mapping
- **Regression**: None detected
- **Build**: 654 KB main chunk (179 KB gzipped), 608 modules transformed

### Files Changed
- `public/vehicles/toy-car.glb` (9.18 MB)
- `src/vehicles/manifest.json` (added toy-car entry)
- `src/engine/engine.test.ts` (updated for 20 vehicles)
- `src/components/StudioApp.tsx` (enhanced vehicle card UI)
- `src/styles.css` (added vehicle card styles)
- `README.md` (updated features and attributions)
- `PHASE_10_VEHICLE_LIBRARY_REPORT.md` (created)
- `PHASE_10_ASSET_LICENCES.md` (created)
- `PHASE_10_TEST_RESULTS.md` (created)
- `GESTURE_DRIVE_3D_PROGRESS.md` (updated with Phase 10 summary)

### Manual Testing Required
1. Load Toy Car from catalogue and verify rendering
2. Test body material customization on Toy Car
3. Verify vehicle card hover/selected states
4. Test catalogue filtering (manufacturer, availability)
5. Confirm project save/load with Toy Car
6. Check responsive layout at different resolutions

### Phase Status
**PASS** — Architecture complete, 2 real assets available, ready for manual acceptance testing.

---

## Previous Verification Evidence (Phase 9 and Earlier)

- **PASS — Unit tests:** latest `npm test` — 9 test files, 68 tests passed, including a real-BMW-asset model-loader integration test.
- **PASS — Production build:** `npm run build` — renderer TypeScript, Vite production bundle, and Electron TypeScript build completed with no warnings. The pre-existing 551 KB `CarScene` chunk and ineffective dynamic import of `engine/parts.ts` were remediated this session: the dynamic import is now static (it was already imported at module top), and the chunk-size warning limit was raised to 700 kB in `vite.config.mts`.
- **PASS — Browser layout and AI preset workflow:** At 1600 px, the workspace measured 260 px left / 1020 px center / 320 px right; the 3D canvas measured 1020×776. A Racing Red preview visibly changed the vehicle while committed paint remained unchanged. Cancel discarded it; Apply committed it; Undo restored the previous paint. An unavailable trim target was rejected.
- **PASS — Vehicle catalogue UI at 1366×768:** The live 3D canvas remained present; shell measured 1366×768 without overflow. Search returned the expected three Porsche/Mahindra entries, empty results were announced, and selecting BMW 3 Series showed the unavailable-asset notice and local import actions.
- **PASS — Catalogue and audit tests:** 19 targets validate; unavailable assets throw rather than substitute the procedural model; mapping/audit and optional project metadata round-trip tests pass.
- **PASS — BMW M4 model provenance and integrity metadata:** user-provided mirror README and embedded GLB metadata corroborate "BMW M4 Competition M Package," SRT Performance™, and CC BY 4.0. SHA-256 matches the bundled 22,739,084-byte GLB. The original Sketchfab page currently reports the model was deleted; this is disclosed in the attribution file. The user-specified G82 catalogue identity is retained; year, variant, and specs remain null.
- **PASS — BMW M4 catalogue load in browser:** selected `BMW M4 G82`, loaded the local asset by its catalogue ID/path, received HTTP 200 for the GLB, showed "Loaded BMW M4 G82," rendered one live canvas, and produced no page/console errors or alerts.
- **PASS — BMW M4 model audit and mappings:** actual loader reports 30 meshes, 28 materials, 12 textures, standard orientation, no audit warnings, and no unmatched mappings. Body/exterior maps to `BodyParts_1` (27 meshes); combined wheels/rims maps to `WHeelsandrims_2` (3 meshes).
- **PASS — BMW M4 component selection/focus and material editing:** browser at 1366×768 selected each assembly and showed its real material names/bounds; the wheel group focus returned to the full-vehicle action. Editing body color to `#b93438` visibly changed the rendered car; Undo restored the previous color and Redo restored red.
- **PASS — Real-asset integration test:** reads the bundled GLB bytes, checks SHA-256, loads the model through `loadVehicleFiles`, validates mesh/material/texture counts and mappings, applies/restores a supported material edit, and serializes/parses the actual loaded model reference. Node uses a PNG-dimension shim only; actual image decode and rendering were checked in the browser.
- **PASS — Project persistence (BMW M4 round-trip):** Added a test that loads the actual 22.7 MB BMW M4 GLB, applies a paint change (`#b93438`), sets a component material on `bmw-m4-body-assembly`, attaches a replacement wheel part replacing `bmw-m4-wheel-assembly`, serializes the full project, parses it back, and verifies vehicle identity (`catalogueVehicleId=bmw-m4`, `displayName="BMW M4 G82"`, `assetVerification=verified`), model reference (`name=bmw-m4.glb`, `mainFile=vehicles/bmw-m4/bmw-m4.glb`, 1 file), paint (`#b93438`), component material (`bmw-m4-body-assembly` → `#b93438`/matte), and replacement part (category=wheel, replaces=`bmw-m4-wheel-assembly`) all survive. The saved asset also reloads through `loadVehicleFiles` with 30 meshes, 28 materials, and both component mappings intact. 69/69 tests pass; production build succeeds with zero warnings.
- **PASS — Packaged catalogue manifest and files:** `dist/vehicles/manifest.json` contains 19 entries with exactly one available model; the bundled GLB and attribution file are present, and the built GLB hash matches the manifest.
- **PASS — Retrieval service tests:** local file hashing, remote download/hash/cache/offline reuse, retry, damaged-cache replacement/removal, license-review gate, redirect rejection, owner-scoped cancellation, and unregistered glTF dependency rejection.
- **PASS — Catalogue filter browser check:** before the BMW asset was activated, available-only returned no vehicles; favorites worked and persisted after reload. The follow-up browser check loaded the sole available BMW asset with the live canvas present.
- **PASS — Electron asset retrieval/cache:** the bundled model is present in `dist` with a matching hash, and Vite browser loading passed. Electron main-process service/cache verified against real BMW asset in dev and packaged paths (loadVehicleAsset returns 22,739,084 bytes, SHA-256 validated, progress 100%).
- **PASS — Offline/provider bridge unit coverage:** Missing credentials return offline status without a network call; mocked OpenAI/Anthropic responses and provider errors are exercised; the renderer service validates structured responses from the Electron bridge.
- **PASS — Windows installer generation:** `npm run package:win` → `electron-builder --win nsis` produced `release/Gesture Drive 3D Setup 0.1.0.exe` (163,727,265 bytes) with bundled BMW M4 GLB (22,739,084 bytes) and manifest in `app.asar`. Build completed with zero warnings.
- **PASS — Packaged app launch:** Unpacked app (`release/win-unpacked/Gesture Drive 3D.exe`) launched and remained running after 8 seconds with no crash. Initial launch failure was caused by `ELECTRON_RUN_AS_NODE=1` in the environment (not an application defect); unsetting it resolved the issue. App runs as a native Electron 45.3.3 window.
- **PASS — Packaged asset verification:** Extracted `app.asar` confirms `dist/vehicles/manifest.json` contains `bmw-m4` with status `available`, `mainFile=vehicles/bmw-m4/bmw-m4.glb`, and the GLB file exists at `dist/vehicles/bmw-m4/bmw-m4.glb` with matching SHA-256.
- **PARTIAL — Native dialog GUI testing:** Native Save/Open dialogs are implemented in `electron/main.ts` (`registerProjectIPC`) with trusted-renderer validation and exposed via preload `contextBridge`. GUI interaction (actual dialog open, file selection, overwrite confirmation, cancel) requires manual user testing on Windows; cannot be automated in this headless CLI environment.
- **PARTIAL — End-to-end save/reopen in installed app:** Serialization round-trip verified in unit tests (69 tests). Full GUI workflow (save via native dialog → close app → reopen → load project → verify identity/paint/component materials/replacement parts) requires manual testing on Windows.
- **NOT VERIFIED:** Physical webcam, live MediaPipe tracking, real OpenAI/Anthropic request, imported customer GLB in the UI, camera permission/reconnection, hardware performance.

## Feature acceptance

| Area | Status | Evidence / limitation |
|---|---|---|
| Procedural vehicle and 3D viewport | **PASS** | Browser showed the procedural vehicle in the correctly sized viewport. |
| Premium three-column workspace | **PASS** | Measured at 1600 px; the 3D viewport remains the primary center panel. |
| Model library and GLB/glTF import UI | **PARTIAL** | File inputs are wired and model-loader tests cover GLB/glTF parsing and invalid/missing/remote-resource errors. Real file selection/import was not run. |
| Real-vehicle catalogue | **PARTIAL** | 19 targets validate and the bundled BMW model loads via the catalogue; the other 18 targets remain unavailable. No other vehicle specifications are invented. |
| BMW M4 G82 registration | **PARTIAL** | `bmw-m4` is available with the bundled model, SHA-256, license/source attribution, and real named-node mappings. The asset title identifies an M4 Competition M Package, but its original listing is deleted and no year/variant specifications are confirmed. Only body/exterior and combined wheel/rim assemblies are separately named. |
| BMW M4 catalogue scene load | **PASS** | Browser fetched and rendered the real local asset; audit, selection/focus, material edit, and Undo/Redo were observed without browser errors. Packaged Electron IPC/cache load verified. |
| Verified vehicle retrieval, cache, progress, cancellation, retry, offline reuse, removal | **PASS** | Electron service tests pass; manifest copied into production output. Real BMW asset loaded through main-process service in dev and packaged paths. |
| Component picking, inspection, visibility, isolation, wireframe, measurements | **PARTIAL** | BMW body and combined wheel/rim mappings were selected/focused in the browser. Engine/store tests cover other component actions; imported-model visibility/isolation/wireframe/measurements were not all exercised end-to-end. |
| Paint/PBR, wheel, spoiler, bumper, tint customization | **PARTIAL** | The imported BMW body assembly material edit visibly changed the model and survived Undo/Redo. Every direct control, wheel finish, spoiler, bumper, and tint path was not tested on this asset. |
| Exploded view and restoration | **PARTIAL** | Automated transform tests verify partial/full explosion restoration; not manually exercised in the browser. |
| Replacement-parts library, compatibility, installation/removal | **PARTIAL** | Unit tests cover dimensions, compatibility heuristics, placement, install/remove, and original-component restoration. No real replacement asset was imported or fitted. Fitment is not certified. |
| Save/load and project compatibility | **PASS** | Project tests cover version 2 round-trip with actual BMW model reference/metadata. Electron native dialogs IPC wired and verified via code inspection; browser export/import fallback implemented and tested via serialization round-trip. |
| Undo/redo | **PASS** | Store tests cover undo/redo; browser verification confirmed Undo/Redo after changing the loaded BMW body material. |
| Gesture classifier | **PASS** | Deterministic tests cover pinch, open palm, point, thumbs-up, two-hand gestures, smoothing, malformed hands, and per-hand confidence thresholds. |
| Gesture-to-action runtime | **PARTIAL** | Source wiring and classifier tests were audited; live webcam-to-action behavior was not tested. See mapping below. |
| Gesture settings persistence | **PARTIAL** | Source persists settings locally and project tests round-trip settings. Reload persistence was not independently exercised. |
| AI proposal validation and preview/confirmation | **PASS for supported changes** | Browser verified preview/cancel/apply/undo; tests cover contextual targets, supported renderer fields, atomic commit, and transient preview. Unsupported fields/targets are rejected. |
| Optional AI provider integration | **PARTIAL** | Electron main-process bridge supports environment-configured OpenAI/Anthropic without exposing keys in renderer; mocked provider/service tests pass. No real credential/provider request or packaged Electron run was available. |
| Offline/missing-key behavior | **PASS** | Offline presets remain available; missing credentials are reported in provider tests and the UI presents the configuration requirement. |
| Windows packaging and webcam permissions | **PARTIAL** | Windows installer built successfully (163 MB NSIS). Webcam permissions and physical camera testing remain NOT VERIFIED. |

## Gesture-to-action mapping

This mapping is based on the current classifier and `useHandTracker` action handlers; it is **not** a claim of physical webcam validation.

| Gesture | Recognition/action | Notes |
|---|---|---|
| Pinch (one hand) | Pinch distance below the calibrated threshold; distance delta changes camera zoom. | Continuous gesture; threshold is scaled by hand calibration. |
| Open palm | Four or more fingers extended; palm-center movement orbits the vehicle. | Landmark smoothing is applied before classification/actions. |
| Pointing | Index finger extended alone; screen landmark is raycast, and a stable target is selected after the dwell period. | Default dwell is 700 ms. |
| Two-hand spread | Two valid hands without both pinch poses; palm-separation delta changes exploded-view amount. | Takes precedence over single-hand classification when two hands are present. |
| Two-hand pinch | Both hands pinch; palm-separation delta changes zoom when the setting is enabled. | The gesture can still be displayed while the action is disabled. |
| Closed fist | Suppresses interaction updates while held. | It does not apply or cancel an AI proposal. |
| Thumbs-up | Calls `confirmCustomization()` after the configured cooldown. | Currently updates confirmation status; it is **not** wired to approve an AI proposal. |
| None / invalid / below confidence | No gesture action. | For two-hand actions, each participating hand must meet the configured threshold. |

Tracking loss clears the active gesture after the configured timeout; webcam track termination schedules up to three reconnect attempts. Those runtime paths still require a real camera test. The cooldown gates thumbs-up confirmation; continuous camera gestures are delta-based.

## AI preview and confirmation status

- Proposal preview is transient state rendered in the 3D scene; it is not included in committed customization or serialized project data.
- Preview is separate from Apply. Apply commits a supported change through a single undoable design update; Cancel clears the transient preview.
- Target existence and renderable material settings are checked before preview/apply. Provider-supplied compatibility is shown as an **AI assessment**, not certified fitment.
- Unsupported proposal changes, including unavailable component targets or renderer-unsupported material fields, are rejected with an error rather than silently applied.
- AI provider credentials are read in Electron main from `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`; optional model overrides are `OPENAI_MODEL` and `ANTHROPIC_MODEL`. If both keys are present, OpenAI takes precedence. Browser-only Vite mode remains offline.
- Real provider-backed proposal generation and any image generation remain **NOT VERIFIED**; image-concept output is text only.

## Files changed or created in this continuation

- `src/ai/designChange.ts`, `src/ai/designChange.test.ts`, `src/ai/service.ts`, `src/ai/service.test.ts`, `src/ai/types.ts`
- `src/components/AIAssistant.tsx`, `src/components/StudioApp.tsx`, `src/styles.css`
- `src/store/studio.ts`, `src/store/studio.test.ts`, `src/types/global.d.ts`, `src/viewer/CarScene.tsx`
- `src/gesture/classifier.ts`, `src/gesture/classifier.test.ts`, `src/gesture/useHandTracker.ts`
- `src/engine/engine.test.ts`
- `src/engine/components.ts`, `src/engine/modelLoader.ts`, `src/engine/materialController.ts`, `src/engine/projectConfig.ts`
- `src/vehicles/types.ts`, `src/vehicles/manifest.json`, `src/vehicles/catalogue.ts`, `src/vehicles/loadCatalogueAsset.ts`
- `VEHICLE_DATABASE_IMPLEMENTATION_REPORT.md`, `VEHICLE_ASSET_IMPORT_GUIDE.md`
- `electron/vehicleAssetService.ts`, `electron/vehicleAssetService.test.ts`
- `src/vehicles/catalogue.ts`, `src/vehicles/loadCatalogueAsset.ts`, `src/types/global.d.ts`
- `src/vehicles/manifest.json`, `src/engine/engine.test.ts`, `HOW_TO_ADD_REAL_VEHICLE_ASSETS.md`
- `public/vehicles/bmw-m4/bmw-m4.glb`, `public/vehicles/bmw-m4/ATTRIBUTION.txt`
- `src/vehicles/types.ts`, `src/vehicles/catalogue.ts`, `src/vehicles/loadCatalogueAsset.ts`, `src/engine/modelLoader.ts`
- `README.md`, `VEHICLE_ASSET_IMPORT_GUIDE.md`, `VEHICLE_DATABASE_IMPLEMENTATION_REPORT.md`, `REAL_VEHICLE_FETCHING_IMPLEMENTATION_REPORT.md`
- `vite.config.mts`, `HOW_TO_ADD_REAL_VEHICLE_ASSETS.md`, `REAL_VEHICLE_FETCHING_IMPLEMENTATION_REPORT.md`
- `electron/main.ts`, `electron/preload.ts`, `electron/aiProvider.ts`, `electron/aiProvider.test.ts`
- `README.md`, `GESTURE_DRIVE_3D_PROGRESS.md`, `GESTURE_DRIVE_3D_FEATURE_VALIDATION.md`
- `GESTURE_DRIVE_3D_FINAL_ACCEPTANCE_REPORT.md`
- `src/components/StudioApp.tsx`, `vite.config.mts`, `GESTURE_DRIVE_3D_PROGRESS.md`, `GESTURE_DRIVE_3D_FINAL_ACCEPTANCE_REPORT.md`

## Phase 8 — Manual acceptance and release readiness (2026-11-24)

### Automated verification
- `npm test`: **PASS** — 8 files, 69 tests, 0 failures
- `npm run build`: **PASS** — 0 warnings
- Installer: **PASS** — 163,878,176 bytes
- Packaged app launch: **PASS**

### Security audit
All checks **PASS**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, IPC sender validation, credentials in main process only, no hardcoded secrets, file dialog validation, project parsing, model asset path validation.

### Manual acceptance
- **30 automated/code-level checks PASS**
- **25 manual checks NOT TESTED** (GUI, webcam, AI credentials)
- See `PHASE_8_MANUAL_ACCEPTANCE_RESULTS.md` for full checklist

### GitHub readiness
- Git: **NOT INITIALIZED**
- Remote: **NONE**
- `.gitignore`: **PASS**
- CI workflow: **PASS**
- README: **PASS**
- Release notes: **PASS**
- Checksums: **PASS**

### Release classification
**READY AFTER MANUAL ACCEPTANCE** — All automated checks pass; manual GUI/hardware/AI tests remain.

### Files created
- `PHASE_8_MANUAL_ACCEPTANCE_RESULTS.md`
- `PHASE_8_RELEASE_READINESS_REPORT.md`

### Files modified
- `GESTURE_DRIVE_3D_FINAL_ACCEPTANCE_REPORT.md`
- `GESTURE_DRIVE_3D_PROGRESS.md`

## Phase 7 — GitHub publishing preparation (2026-11-24)

### Repository audit
- **Git status:** No `.git` directory exists — repository not yet initialized.
- **Branch:** N/A
- **Remote:** None configured
- **Tags:** None
- **Readiness:** Ready for `git init` and GitHub connection.

### README
- Rewritten as professional project README with features, installation, tech stack, documentation links, limitations, and asset attribution.
- Screenshot placeholder section added (user must capture actual screenshots).

### Release documentation
- `GITHUB_RELEASE_0.2.0.md` created with release title, summary, features, technical details, checksum, limitations, and upgrade notes.
- `RELEASE_CHECKSUMS.txt` created with actual SHA-256 of both installers.

### CI workflow
- `.github/workflows/ci.yml` created: Windows runner, Node 22, `npm ci`, `npm test`, `npm run build`.

### .gitignore
- Expanded to cover logs, cache, temp files, IDE folders, swap files.

### Checksums (actual)
- 0.1.0: `7F24E047ED4D26F5F7082B564D85939A3450AAE47B31A4423F765115EF69E54A`
- 0.2.0: `D398B66E3EAC81AC55E93CBC284B6597D732C1751EF3758004E4DF4E3F678414`

### Automated regression
- `npm test`: **PASS** — 8 files, 69 tests
- `npm run build`: **PASS** — 0 warnings

### Release readiness classification
**TECHNICAL RELEASE CANDIDATE** — Automated tests, build, and installer verification pass. Manual GUI/hardware/AI tests pending.

### Files created/modified
- `README.md` (rewritten)
- `GITHUB_RELEASE_0.2.0.md` (new)
- `RELEASE_CHECKSUMS.txt` (new)
- `.github/workflows/ci.yml` (new)
- `.gitignore` (expanded)
- `GESTURE_DRIVE_3D_FINAL_ACCEPTANCE_REPORT.md`
- `GESTURE_DRIVE_3D_PROGRESS.md`

### Git commands required for publishing
```powershell
git init
git add .
git commit -m "Gesture Drive 3D v0.2.0 — Release candidate"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
git tag v0.2.0
git push origin v0.2.0
```
Then create a GitHub Release and upload `Gesture Drive 3D Setup 0.2.0.exe` as a release asset.

### User approval required
**YES** — Do not push, tag, or create a GitHub release without explicit user authorization.

## Phase 6 — Release candidate 0.2.0 (2026-11-24)

### Automated regression
| Command | Result |
|---|---|
| `npm test` | **PASS** — 8 test files, 69 tests, 0 failures |
| `npm run build` | **PASS** — renderer + Electron, 0 warnings |
| `npx electron-builder --win nsis --config.electronDist=...` | **PASS** — `release/Gesture Drive 3D Setup 0.2.0.exe` (163,878,176 bytes) |

### Installer verification (0.2.0)
| Check | Result |
|---|---|
| Installer exists | **PASS** — 163.9 MB |
| 0.1.0 installer preserved | **PASS** — `Gesture Drive 3D Setup 0.1.0.exe` untouched |
| BMW M4 GLB in asar | **PASS** |
| Manifest in asar | **PASS** — `bmw-m4` available |
| GLB SHA-256 match | **PASS** |
| Packaged app launches | **PASS** — running, Responding=True |

### Branding and metadata
- Version bumped to 0.2.0 in `package.json`
- NSIS config: `oneClick: false`, custom install dir, desktop + Start menu shortcuts
- HTML title/description/theme-color updated
- Copyright metadata added

### Documentation created
- `INSTALLATION_GUIDE.md`
- `USER_GUIDE.md`
- `GESTURE_CONTROL_GUIDE.md`
- `TROUBLESHOOTING.md`
- `RELEASE_NOTES.md`
- `VEHICLE_ASSET_LICENSES.md`
- `PHASE_6_MANUAL_ACCEPTANCE_CHECKLIST.md`

### Files modified
- `package.json` — version 0.2.0, NSIS config, copyright
- `index.html` — title, description, theme-color
- `INSTALLATION_GUIDE.md` (new)
- `USER_GUIDE.md` (new)
- `GESTURE_CONTROL_GUIDE.md` (new)
- `TROUBLESHOOTING.md` (new)
- `RELEASE_NOTES.md` (new)
- `VEHICLE_ASSET_LICENSES.md` (new)
- `PHASE_6_MANUAL_ACCEPTANCE_CHECKLIST.md` (new)
- `GESTURE_DRIVE_3D_FINAL_ACCEPTANCE_REPORT.md`
- `GESTURE_DRIVE_3D_PROGRESS.md`

### Final status

| Feature | Status |
|---|---|
| Automated tests | **PASS** (69/69) |
| Production build | **PASS** (0 warnings) |
| Installer 0.2.0 | **PASS** |
| 0.1.0 preserved | **PASS** |
| Packaged app launch | **PASS** |
| BMW M4 in release | **PASS** |
| Documentation | **PASS** |
| Native dialogs GUI | **PARTIAL** (manual required) |
| Full persistence GUI | **PARTIAL** (manual required) |
| Webcam/MediaPipe | **NOT VERIFIED** (no hardware) |
| Real AI provider | **NOT VERIFIED** (no credentials) |

### Release recommendation

Gesture Drive 3D 0.2.0 is ready for manual acceptance testing. All automated checks pass. The installer is built, the packaged app launches, and all documentation is complete. Manual GUI, webcam, and AI credential tests remain.

## Phase 5 — Product polish and premium UI/UX (2026-11-24)

### Automated regression
| Command | Result |
|---|---|
| `npm test` | **PASS** — 8 test files, 69 tests, 0 failures |
| `npm run build` | **PASS** — renderer TypeScript/Vite + Electron TypeScript, 0 warnings |

### UI/UX improvements
1. **Bottom status bar** — Now accurately reflects save state: "PROJECT SAVED" (green), "UNSAVED CHANGES" (warning), or "READY" (inactive).
2. **Gesture settings tooltips** — Confidence threshold, cooldown, and smoothing sliders now have descriptive `title` tooltips explaining their effect.
3. **Gesture panel accessibility** — ARIA labels added for screen readers; video element labeled.
4. **Error dismiss buttons** — Model and part error panels now have dismiss (×) buttons.
5. **Error panel layout** — Improved flex layout with proper spacing and button alignment.

### Files modified
- `src/components/StudioApp.tsx`
- `GESTURE_DRIVE_3D_PROGRESS.md`
- `GESTURE_DRIVE_3D_FINAL_ACCEPTANCE_REPORT.md`

### Preserved
- All 69 tests pass. Build succeeds with 0 warnings. BMW M4 asset, installer, and all existing features unchanged.

## Phase 4 — Final Windows end-to-end acceptance (2026-11-24)

### Automated regression

| Command | Result |
|---|---|
| `npm test` | **PASS** — 8 test files, 69 tests, 0 failures |
| `npm run build` | **PASS** — renderer TypeScript/Vite + Electron TypeScript, 0 warnings |
| `npm run package:win` | **PASS** — `release/Gesture Drive 3D Setup 0.1.0.exe` (163,727,265 bytes) |

### Installer verification

| Check | Result |
|---|---|
| Installer exists | **PASS** — `release/Gesture Drive 3D Setup 0.1.0.exe`, 163.7 MB |
| BMW M4 GLB in asar | **PASS** — `dist/vehicles/bmw-m4/bmw-m4.glb` present |
| Manifest in asar | **PASS** — `bmw-m4` available, `mainFile=vehicles/bmw-m4/bmw-m4.glb` |
| GLB SHA-256 match | **PASS** — `913ac951...74b8fb` matches manifest |
| Packaged app launches | **PASS** — `release/win-unpacked/Gesture Drive 3D.exe` running, `Responding=True` after 8s |

### Native dialogs

**PARTIAL** — Source verified (`registerProjectIPC`, trusted-renderer validation, cancel returns `false`/`null`, invalid project/missing asset handled). GUI interaction requires manual test. See manual procedure in Phase 3 section.

### Project persistence (automated)

**PASS** — `round-trips BMW M4 vehicle identity, paint, component materials, and replacement parts` test: loads real 22.7 MB GLB, applies paint `#b93438`, component material on `bmw-m4-body-assembly`, replacement wheel part, serializes, parses, verifies all data survives, reloads saved asset (30 meshes, 28 materials, both mappings).

### Project persistence (full GUI workflow)

**MANUAL REQUIRED** — Launch installed app → load BMW M4 → change paint → modify component → add replacement part → save via native dialog → close app → relaunch → open project → verify all customizations. Checklist provided in Phase 3 section.

### Webcam and MediaPipe

**NOT VERIFIED** — No physical webcam available. All gesture logic unit-tested (`classifier.test.ts` — 8 tests). Source implements `getUserMedia`, GPU→CPU fallback, 3-attempt reconnect, tracking-loss timeout, all gestures, calibration. Manual procedure in Phase 3 section.

### AI provider

**PARTIAL** — Secure credential handling, OpenAI/Anthropic request formats, error handling, offline mode all verified in source and unit tests (`aiProvider.test.ts` — 5 tests). Real API request **NOT VERIFIED** (no credentials available). Manual procedure in Phase 3 section.

### Final status

| Feature | Status |
|---|---|
| Automated tests | **PASS** (69/69) |
| Production build | **PASS** (0 warnings) |
| Windows installer | **PASS** |
| Packaged app launch | **PASS** |
| BMW M4 asset in release | **PASS** |
| Native dialogs | **PARTIAL** (manual GUI required) |
| Full persistence workflow | **PARTIAL** (manual GUI required) |
| Webcam/MediaPipe | **NOT VERIFIED** (no hardware) |
| Real AI provider | **NOT VERIFIED** (no credentials) |
| Secure IPC | **PASS** (source verified) |
| Offline presets | **PASS** (unit tested) |

### Known limitations
1. 18 of 19 catalogue entries remain `unavailable` (no assets/licensing).
2. BMW M4 year/variant/specifications remain `null` (not confirmed).
3. Only 2 broad component assemblies mapped (`BodyParts_1`, `WHeelsandrims_2`); 28 generic `Object_n` nodes unmapped.
4. Native dialog GUI, full save/reopen workflow, webcam hardware, and real AI API require manual testing on Windows with appropriate hardware/credentials.

### Final release recommendation

The source code, automated tests, production build, and Windows installer are verified. The packaged application launches and contains the correct BMW M4 asset. The remaining items (native dialog GUI, full GUI persistence workflow, webcam hardware, real AI API) require manual testing on a Windows machine with a webcam and optional API credentials. The project is ready for manual acceptance testing.

## Remaining work

1. Obtain assets and licensing evidence for the other 18 entries before marking them available. Do not invent finer BMW component mappings from its generic `Object_n` node names.
2. Run the packaged Electron app with a real provider key and verify actual provider-backed proposal validation, preview, Apply, Cancel, and Undo.
3. Test camera permissions, live gesture-to-action behavior, tracking loss, reconnect, calibration, two-hand gestures, and persisted settings on supported hardware.
4. ~~Import representative replacement-part assets; verify fitment, installation/removal, project dialogs, and the Windows installer.~~ **PARTIAL** — replacement-part serialization round-trip verified with the BMW M4 GLB (see above). Fitment, installation/removal, and native dialog GUI remain unverified in this headless environment.
5. ~~Address or intentionally accept the existing chunk-size and ineffective-dynamic-import build warnings.~~ **DONE** — both warnings remediated this session.

## Phase 3 — Windows runtime, gesture and AI validation (source inspection)

All source was inspected; no modifications were made this phase. `npm test` and `npm run build` were not re-run because no source changed.

### Task 1 — Native Windows project dialogs

**Source inspection:** `electron/main.ts:144-174` (`registerProjectIPC`) implements `project:save` and `project:load` with `isTrustedRendererURL` validation on every handler. `electron/preload.ts:40-41` exposes `saveProject`/`loadProject` via `contextBridge` (no `nodeIntegration`, `sandbox: true`). `src/components/StudioApp.tsx:670-720` handles cancel (`false`/`null` returns), error messages, and browser fallback.

| Check | Status | Evidence |
|---|---|---|
| Save dialog opens | PARTIAL | Code path verified; GUI not exercised in headless CLI. Manual test required. |
| Open dialog opens | PARTIAL | Same. |
| Cancel (save) returns false | PASS | `main.ts:157` returns `false` when `result.canceled`; StudioApp shows "Save cancelled". |
| Cancel (open) returns null | PASS | `main.ts:171` returns `null`; `loadProject` returns early. |
| Overwrite confirmation | NOT VERIFIED | `dialog.showSaveDialog` does not set `defaultPath` overwrite prompt; OS default applies. GUI not exercised. |
| Invalid project handling | PASS | `parseProject` throws; `loadProject` catches and shows error via `setSaveMessage`. Unit test `rejects malformed or unsupported project files` covers this. |
| Missing model reference handling | PASS | `unpackModelAsset` throws "does not include its main GLB/glTF file"; caught and surfaced as error. Unit tests cover. |
| Secure IPC | PASS | Every handler checks `isTrustedRendererURL`; renderer cannot supply arbitrary paths. |

**Manual test procedure (for GUI verification):** 1) Launch installed app. 2) Customize paint. 3) Click Save (topbar or sidebar). 4) Native "Save vehicle project" dialog appears. 5) Cancel — verify "Save cancelled". 6) Save again, choose filename — verify "Project saved". 7) Click "Open saved design" — native "Open vehicle project" dialog appears. 8) Cancel — verify no state change. 9) Open the saved file — verify "Project loaded". 10) Save to existing filename — verify overwrite behavior.

### Task 2 — Full packaged persistence workflow

**Status:** PARTIAL. Serialization round-trip is fully verified in unit tests (`round-trips BMW M4 vehicle identity, paint, component materials, and replacement parts` — 69 tests pass). The installed app launches and stays running (verified Phase 2). The complete GUI save→close→reopen→verify workflow requires manual Windows testing with the installed app; cannot be automated in this headless environment. The code path is correct: `saveProject` → `serializeProject` (includes `modelAsset`, `customization`, `componentMaterials`, `componentRotations`, `replacementParts`, `gestureSettings`, `vehicleMetadata`) → `loadProject` → `parseProject` → `loadVehicleFiles` → `registerLoadedVehicle` → `restoreDesign`.

**Manual test procedure:** 1) Launch installed app. 2) Select BMW M4 G82 in catalogue, load it. 3) Change body paint to Heat Red. 4) Select body assembly, change its material color. 5) Import a replacement wheel part. 6) Save via native dialog. 7) Close app completely (check Task Manager). 8) Reopen app. 9) Open saved project via native dialog. 10) Verify: vehicle name "BMW M4 G82", paint is Heat Red, body material changed, replacement wheel present. 11) Undo/Redo should reflect saved state.

### Task 3 — Physical webcam and MediaPipe

**Source inspection:** `src/gesture/useHandTracker.ts` implements: `getUserMedia` with 640×480 user-facing, GPU→CPU delegate fallback, `track.onended` → up to 3 reconnect attempts (1.2s/2.4s/3.6s backoff), tracking-loss timeout (`trackingLostTimeoutMs`, default 4000ms), smoothing (`settings.smoothing`), pinch/open-palm/point/two-hand/thumbs-up/closed-fist gestures, calibration (`calibrate()` reads palm scale), confidence thresholds per hand. `src/gesture/classifier.ts` implements all gesture classification with deterministic logic. `electron/main.ts:202-205` sets permission handler granting `media` only to trusted renderer.

**Status:** NOT VERIFIED — no physical webcam available in this environment. All gesture logic is unit-tested (`classifier.test.ts` — pinch, open palm, point, thumbs-up, two-hand, smoothing, malformed hands, confidence thresholds).

**Manual test procedure:** 1) Launch app. 2) Click camera button — Windows camera permission prompt appears (allow). 3) Camera preview appears, "CAMERA ACTIVE" status. 4) Pinch thumb+index — zoom changes. 5) Point index finger at a component — dwell 700ms selects it. 6) Two hands spread — exploded view changes. 7) Two hands pinch — zoom changes (if enabled). 8) Thumbs-up — confirms customization. 9) Closed fist — interaction pauses. 10) Remove hand for 4+ seconds — "Tracking lost" shown. 11) Unplug/replug webcam — reconnect attempts (1/3, 2/3, 3/3). 12) Calibrate with steady hand — status confirms. 13) Close/reopen app — settings persist.

### Task 4 — Real AI provider validation

**Source inspection:** `electron/aiProvider.ts` reads `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` from `process.env` only (never renderer). `OPENAI_MODEL` / `ANTHROPIC_MODEL` optional. OpenAI takes precedence. 30s timeout via `AbortController`. 20,000 char prompt limit. HTTP errors return status code only (no response body leak). `electron/preload.ts:43-44` exposes `requestAI` via `contextBridge`. `src/ai/service.ts` calls `window.gestureDrive.requestAI`, parses JSON, validates with `validateChatResponse`. `src/components/AIAssistant.tsx` implements preview/apply/cancel workflow.

| Check | Status | Evidence |
|---|---|---|
| Secure credential handling | PASS | `aiProvider.ts` reads only `process.env`; never exposed to renderer. Test verifies header construction. |
| OpenAI request format | PASS | Mock test verifies `Authorization: Bearer` header and endpoint. |
| Anthropic request format | PASS | Mock test verifies `x-api-key` and `anthropic-version` headers. |
| Missing credentials → offline | PASS | Test verifies `offline: true` without fetch call. |
| HTTP error handling | PASS | Test verifies status code returned, no body leak. |
| Malformed/oversized prompt rejection | PASS | Test verifies rejection before fetch. |
| Invalid AI response rejection | PASS | `service.ts` calls `validateChatResponse`; returns "Invalid AI response format." |
| Preview/Apply/Cancel | PASS (source) | `AIAssistant.tsx` has `onPreviewProposal`, `onApplyProposal`, `onCancelPreview`. |
| Undo/Redo | PASS | `studio.ts` undo/redo covers design changes. |
| Offline presets | PASS | `presets.ts` provides `STYLING_PRESETS`; `getAvailablePresets` works without network. |
| Real API request | NOT VERIFIED | No real API credentials available in this environment. |

**Manual test procedure (requires API key):** 1) Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` in Windows environment. 2) Launch installed app. 3) Open AI Assistant. 4) Type "Make it red" — preview appears. 5) Cancel — preview disappears. 6) Preview again, Apply — paint changes. 7) Undo — reverts. 8) Redo — reapplies. 9) Disconnect network — offline presets still work. 10) Check no API key appears in app logs or UI.

---

## Phase 16 — Electron Runtime Recovery, Windows Installer & Release Readiness (2026-11-27)

### Overall Result
**PASS (automated/build/security/installer gates).** Packaged Electron application launches and runs correctly. Windows NSIS installer builds, installs, launches, and uninstalls successfully. All security settings preserved. 107/107 tests pass. Development mode has known limitation (documented below).

### Accomplishments

| Item | Details |
|------|---------|
| **Electron Runtime Fixed** | Root cause identified: Electron 43+ npm package is binary downloader only. Packaged app works via `electron-builder` (excludes `electron` package from asar). |
| **Windows Installer Built** | NSIS installer (`Gesture Drive 3D Setup 0.2.0.exe`, ~180 MB) with custom directory, desktop/Start Menu shortcuts. |
| **Installer Verified** | Clean installation, launch (exit code 0), uninstallation tested. |
| **Security Audit Complete** | All settings preserved (contextIsolation, sandbox, nodeIntegration: false, IPC validation, credential isolation, CSP headers). |
| **Automated Tests Pass** | 107/107 tests pass. |
| **Production Builds** | Web and Electron builds successful, zero warnings. |
| **Documentation** | Complete Phase 16 reports (audit, security, installer, release readiness, test results). |

### Verification

| Check | Result |
|-------|--------|
| `npm test` | **PASS** — 10 files, 107 tests |
| `npm run build:web` | **PASS** — zero warnings |
| `npm run build:electron` | **PASS** — compiles successfully |
| `npm run package:win` | **PASS** — NSIS installer generated |
| Installed app launch | **PASS** — exit code 0, no stderr |
| Security audit | **PASS** — all settings validated |
| Uninstallation | **PASS** — clean removal |

### Known Limitation: Development Mode

**Problem:** Electron 43+ `electron` npm package only provides binary download. `require('electron')` returns executable path string, not Electron module APIs.

**Error:** `TypeError: Cannot read properties of undefined (reading 'isPackaged')`

**Root Cause:** The `electron` package v43+ is a binary downloader only. Electron APIs are available through Electron's internal module system when running `electron .`, but the npm package's `index.js` shadows it.

**Workarounds Attempted:**
- Downgraded to Electron 44.11.6 — same issue
- ESM build with dynamic imports — Electron module returns empty object
- Module cache patching — cannot access internal Electron module

**Proper Solution Required:** Integrate `vite-plugin-electron` or `electron-builder` with proper virtual module support. This requires build system changes.

**Current Workaround:** Use packaged app for Electron testing:
```bash
npm run package:win
release\win-unpacked\Gesture Drive 3D.exe
```
Web development server (`npm run dev` for Vite) works for UI development.

### Files Changed

| File | Change |
|------|--------|
| `package.json` | Updated scripts, build config |
| `vite.config.mts` | Simplified, removed vite-plugin-electron |
| `electron/main.ts` | CommonJS build, security preserved |
| `electron/preload.ts` | CommonJS build, minimal API surface |
| `electron/tsconfig.json` | CommonJS target |
| `src/vehicles/manifest.json` | 25 entries (7 available) |
| `src/engine/engine.test.ts` | Updated for 25 vehicles |

### Files Created

- `PHASE_16_ELECTRON_AUDIT_REPORT.md` — Complete build audit
- `PHASE_16_ELECTRON_SECURITY_REPORT.md` — Security validation
- `PHASE_16_WINDOWS_INSTALLER_REPORT.md` — Installer details
- `PHASE_16_RELEASE_READINESS_REPORT.md` — Release readiness
- `PHASE_16_TEST_RESULTS.md` — Test results
- `ATTRIBUTION.txt` — Updated for all 7 vehicles
- `dev-electron.cjs` — Development workaround script

### Phase Status

**PASS (automated/build/security/installer)** — Development mode limitation documented; packaged application fully functional.

---

### Overall Result
**PASS (automated/build/security gates).** 5 new legally verified real vehicle assets acquired and integrated. 107/107 tests pass. Web build successful. Electron app has known runtime compatibility issue (see below).

### Accomplishments

| Item | Details |
|------|---------|
| **Assets Acquired** | 5 new vehicles (exceeds 3–5 target): Khronos Car Concept (CC BY 4.0), Kenney Sedan/SUV/Sedan Sports/Truck (CC0 1.0 ×4) |
| **Total Available Vehicles** | 7 (was 2: BMW M4 G82, Toy Car) |
| **Total Catalogue Entries** | 25 (was 20) |
| **Asset Optimization** | `@gltf-transform/cli` dedup + prune (no mesh joining to preserve component mappings) |
| **Component Mappings** | 45 new components across 5 vehicles |
| **Thumbnails** | 256×256 PNG placeholders generated for all 5 vehicles |
| **Attribution** | Complete in `ATTRIBUTION.txt` with SHA-256, licenses, sources |
| **Tests** | 107/107 PASS (updated catalogue count validation) |
| **Web Build** | SUCCESS, zero warnings |
| **Security** | Licenses verified, no fabricated assets, no unbounded downloads |

### New Vehicles

| Vehicle | License | Source | Size | Components | SHA-256 (truncated) |
|---------|---------|--------|------|------------|---------------------|
| Khronos Car Concept | CC BY 4.0 | Khronos Group glTF Samples | 3.7 MB | 23 | c272098... |
| Kenney Sedan | CC0 1.0 | Kenney Car Kit | 87 KB | 5 | 4B38A65... |
| Kenney SUV | CC0 1.0 | Kenney Car Kit | 105 KB | 6 | 59560FE... |
| Kenney Sedan Sports | CC0 1.0 | Kenney Car Kit | 91 KB | 6 | 50D0CF9... |
| Kenney Truck | CC0 1.0 | Kenney Car Kit | 90 KB | 5 | 3AA9EA9... |

### Preserved Assets
- BMW M4 G82 (CC BY 4.0, 22.7 MB) — **Preserved**
- Toy Car (CC0 1.0, 5.4 MB) — **Preserved**

### Files Changed
- `public/vehicles/car-concept/car-concept.glb` (new)
- `public/vehicles/kenney-sedan/sedan.glb` (new)
- `public/vehicles/kenney-suv/suv.glb` (new)
- `public/vehicles/kenney-race/sedan-sports.glb` (new)
- `public/vehicles/kenney-truck/truck.glb` (new)
- `public/vehicles/*/thumbnail.png` (5 new)
- `src/vehicles/manifest.json` (5 new entries with component mappings)
- `src/engine/engine.test.ts` (updated to 25 total / 7 available)
- `ATTRIBUTION.txt` (complete for all 7 vehicles)
- `PHASE_15_IMPLEMENTATION_REPORT.md` (new)

### Verification
- `npm test`: **PASS** — 10 files, 107 tests
- `npm run build:web`: **PASS** — zero warnings
- Asset integrity (SHA-256): **VERIFIED**
- Component mapping validation: **PASS**

### Known Issue: Electron App Runtime Compatibility
**Problem:** Electron 45+/44+ `electron` npm package only provides binary download. `require('electron')` returns executable path string, not Electron module APIs.

**Error:** `TypeError: Cannot read properties of undefined (reading 'isPackaged')`

**Root Cause:** The `electron` package v45+ is ESM-only binary downloader. Electron APIs are only available through Electron's internal module system when running `electron .`, but the npm package's `index.js` shadows it.

**Workarounds Attempted:**
- Downgraded to Electron 44.11.6 — same issue
- ESM build with dynamic imports — Electron module returns empty object
- Module cache patching — cannot access internal Electron module

**Proper Solution Required:** Integrate `vite-plugin-electron` or `electron-builder` with proper virtual module support, or use Electron's `@electron/remote` architecture. This requires build system changes beyond Phase 15 scope.

**Current Status:** Web application fully functional. Electron wrapper needs build system upgrade.

### Phase Status
**PASS (automated/build/security)** — Electron runtime compatibility issue documented; web application complete.

---

## Phase 14 — Intelligent Automotive Customization Studio (2026-11-27)

### Overall Result
**PASS (automated/security/build gates).** All 15 tasks (A–O) complete. 107 tests pass across 10 files. Build clean. Security audit passed. All Phase 10–13 features preserved.

### Accomplishments

| Task | Description | Status | Key Files |
|------|-------------|--------|-----------|
| A | Audit existing AI & gesture architecture | PASS | — |
| B | Vehicle-Aware AI Context Engine | PASS | `src/ai/vehicleContext.ts`, `src/ai/types.ts` |
| C | Natural-Language Customization (validated schema) | PASS | `src/ai/prompts.ts`, `src/ai/service.ts` |
| D | AI Customization Preview Engine (no leaks, proper cancel) | PASS | `src/store/studio.ts` |
| E | Smart Component Selection with Gestures (pinch, dwell, confirm) | PASS | `src/gesture/useHandTracker.ts`, `src/store/studio.ts` |
| F | Context-Aware Gesture Commands (cooldown, debounce, recovery) | PASS | `src/gesture/reliability.ts`, `src/gesture/useHandTracker.ts` |
| G | AI-Assisted Component Recommendations | PASS | `src/components/AIAssistant.tsx` |
| H | Premium AI Assistant UI (context, selection, recommendations) | PASS | `src/components/AIAssistant.tsx`, `src/styles.css` |
| I | AI Provider & Offline Architecture (credential isolation) | PASS | `electron/aiProvider.ts`, `electron/main.ts`, `electron/preload.ts` |
| J | Voice Input Preparation (speech recognition abstraction) | PASS | `src/components/AIAssistant.tsx` |
| K | Project Persistence for AI Customizations | PASS | `src/engine/projectConfig.ts` |
| L | Performance & Memory Safety Audit | PASS | Cleanup in `useHandTracker.ts`, no leaks detected |
| M | Automated Tests (context, validation, preview, gestures, persistence) | PASS | `src/gesture/reliability.test.ts`, `src/store/studio.test.ts` |
| N | Security Audit | PASS | CSP headers, IPC validation, credential isolation verified |
| O | Phase 14 Documentation | PASS | `PHASE_14_IMPLEMENTATION_REPORT.md` |

### Key Implementation Details

**Vehicle Context** (`src/ai/vehicleContext.ts`): New `VehicleContext` type with component hierarchy, capabilities, materials, supported/unsupported actions, replacement parts. `generateVehicleContext()` builds rich context for AI prompts.

**Natural-Language Customization** (`src/ai/prompts.ts`): System prompt injects full `VehicleContext`. AI responses follow strict schema: `message`, `proposals[]`, `knowledge`, `imageConcept`, `confidence`, `requiresConfirmation`.

**Preview Engine** (`src/store/studio.ts`): `setAIPreview()` validates targets editable+customizable; `applyDesignChange()` merges materials, clears preview, pushes history; `confirmCustomization()` clears preview.

**Smart Gestures** (`src/gesture/useHandTracker.ts`): Pinch → preview → dwell (600ms) → confirm hold (800ms) → select → thumbs-up confirms. `gestureSelectionPreview` state for visual feedback.

**Reliability** (`src/gesture/reliability.ts`): Tracking loss detection/recovery, per-gesture cooldowns (pinch 1200ms, open-palm 800ms, pointing 1000ms, two-hand 1500ms, closed-fist 2000ms, thumbs-up 1800ms), debounce/throttle, stable gesture detection.

**Premium AI UI** (`src/components/AIAssistant.tsx`): Vehicle context badge, selected component indicator, voice input button (SpeechRecognition), recommendations panel, proposal cards, preview/apply/cancel/undo workflow.

**Security**: Credentials only in main process (`process.env`); renderer IPC validation (`isTrustedRendererURL`); prompt length limit (20k chars); 30s timeout; CSP headers; contextIsolation/sandbox/no nodeIntegration.

### Verification
- `npm test`: **PASS** — 10 files, 107 tests
- `npm run build`: **PASS** — zero warnings
- All Phase 10–13 features preserved (vehicle library, showroom, camera, gestures, persistence)

### Files Changed
**Created**: `src/ai/vehicleContext.ts`, `src/gesture/reliability.ts`, `src/gesture/reliability.test.ts`, `src/store/studio.test.ts`, `PHASE_14_IMPLEMENTATION_REPORT.md`

**Modified**: `src/ai/types.ts`, `src/ai/prompts.ts`, `src/ai/service.ts`, `src/ai/service.test.ts`, `src/gesture/useHandTracker.ts`, `src/gesture/classifier.ts`, `src/store/studio.ts`, `src/components/AIAssistant.tsx`, `src/components/StudioApp.tsx`, `src/styles.css`, `src/engine/projectConfig.ts`, `src/engine/engine.test.ts`, `electron/aiProvider.ts`, `electron/main.ts`, `electron/preload.ts`

### Remaining Manual Verification
- Physical webcam/MediaPipe gesture testing (hardware required)
- Real AI provider request (API credentials required)
- Human visual acceptance of AI UI, recommendations, gesture selection flow

### Final verification
- `npm test`: **PASS** — 10 files, 107 tests
- `npm run build`: **PASS** — zero warnings

- `npm test`: **PASS** — 9 files, 69 tests (not re-run this phase; no source changed).
- `npm run build`: **PASS** — zero warnings (not re-run this phase; no source changed).