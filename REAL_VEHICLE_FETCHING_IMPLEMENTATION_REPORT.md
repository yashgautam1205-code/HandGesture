# Real Vehicle Fetching Implementation Report

## Result

**PARTIAL — the secure, manifest-driven retrieval and cache pipeline is implemented and tested; one bundled real model is now registered.** The BMW M4 GLB's embedded metadata and mirror README identify its title, creator, and CC BY 4.0 license. Its original Sketchfab listing is deleted. The other 18 catalogue targets remain unavailable; no specifications or thumbnails have been invented.

## Implemented

- The Electron main process resolves requests using a catalogue vehicle ID only. Renderer-provided URLs and filesystem paths are not accepted.
- Renderer IPC uses the existing sandboxed preload bridge. The bridge provides progress, cancellation, cache status, and cache removal.
- Available manifest assets require HTTPS source and license references, a SHA-256 digest for every file, and a complete list of local and/or remote resource files.
- Remote retrieval uses HTTPS, rejects private/local destinations, limits redirects to the registered origin, caps the main model at 96 MB and all files together at 128 MB, and verifies each downloaded digest before cache finalization.
- GLB/glTF headers and JSON are validated. External glTF buffers and images must be listed in the manifest; malformed and unregistered dependencies are rejected.
- Cache files are stored under Electron `userData/vehicle-assets`, fingerprinted from file mappings and hashes. Cached content is re-verified before use; corrupt entries are discarded and fetched again. The selected vehicle is fetched on demand; the catalogue is not prefetched.
- Local packaged catalogue files are read through the Electron service and hash-checked. Browser-only local asset loading also verifies the manifest hashes; browser-only remote fetching is intentionally disabled.
- Retrieval progress, cancellation, retry via the load action, offline cache reuse, damaged-cache replacement, and cache removal are surfaced through the existing catalogue UI. Favorites and recent selections persist locally; body-style and availability/favorites/recent filters are available when metadata exists.
- The canonical catalogue manifest is copied into `dist/vehicles/manifest.json` during production builds for the packaged main process.

## Files changed for this continuation

- `electron/vehicleAssetService.ts`, `electron/vehicleAssetService.test.ts`
- `electron/main.ts`, `electron/preload.ts`, `electron/tsconfig.json`
- `src/types/global.d.ts`
- `src/vehicles/catalogue.ts`, `src/vehicles/loadCatalogueAsset.ts`
- `src/components/StudioApp.tsx`
- `vite.config.mts`
- `README.md`, `VEHICLE_ASSET_IMPORT_GUIDE.md`, `GESTURE_DRIVE_3D_PROGRESS.md`
- `GESTURE_DRIVE_3D_FINAL_ACCEPTANCE_REPORT.md`, `VEHICLE_DATABASE_IMPLEMENTATION_REPORT.md`
- `REAL_VEHICLE_FETCHING_IMPLEMENTATION_REPORT.md`, `HOW_TO_ADD_REAL_VEHICLE_ASSETS.md`

## Verification

| Check | Result |
|---|---|
| `npm test` | **PASS** — 8 test files, 67 tests. Retrieval tests cover local integrity, remote download/hash/cache/offline reuse, retry, corrupt-cache replacement/removal, license review, redirect rejection, cancellation ownership, and unregistered glTF resources. |
| `npm run build` | **PASS** — renderer TypeScript/Vite and Electron TypeScript. Existing chunk-size and ineffective-dynamic-import warnings remain. |
| Packaged manifest copy | **PASS** — `dist/vehicles/manifest.json` exists with 19 entries; the BMW M4 entry is available and the other 18 are unavailable. |
| Catalogue browser workflow | **PASS** — favorites persist, the available BMW record loads through the local integrity-checked fetch path, and the live 3D canvas remains present. |
| BMW M4 real-asset integration | **PASS** — the test reads the bundled 22.7 MB GLB, checks its SHA-256, loads its geometry/material/texture metadata through the production model loader, applies a mapped material edit, and round-trips the model reference through project serialization. |
| Real remote host, DNS, Electron cache behavior with this asset, Windows installer | **NOT VERIFIED** — the BMW is bundled locally; no remote host or installer was tested. |

The retrieval-service tests still use generated GLB bytes and injected fetch responses. The BMW integration test loads real bundled bytes. Its Node-only image shim reads embedded PNG dimensions; actual browser image decoding/rendering is tracked separately in the acceptance report.

## Limitations and next action

The catalogue now contains one bundled model and 18 unavailable targets. The BMW asset has broad body and wheel/rim assembly mappings only; its generic child mesh names prevent finer inspection/customization. Browser rendering and the packaged Electron cache path still require runtime verification. Keep the overall acceptance **PARTIAL** until those workflows and the remaining project/undo interactions are verified.
