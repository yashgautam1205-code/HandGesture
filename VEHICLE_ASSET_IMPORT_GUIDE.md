# Vehicle Asset Import Guide

The vehicle database is manifest-driven. The application currently contains catalogue metadata only; it does **not** bundle real-world vehicle models. Do not mark an asset available or verified until the asset and its license/source evidence have been reviewed.

For the complete secure remote and local registration workflow, see [HOW_TO_ADD_REAL_VEHICLE_ASSETS.md](./HOW_TO_ADD_REAL_VEHICLE_ASSETS.md). The Electron retrieval path accepts only manifest vehicle IDs, not renderer-supplied URLs or paths.

## Add a distributable catalogue model

1. Obtain a GLB/glTF asset that you are authorized to redistribute. Confirm the model and all referenced textures/buffers are covered by the license.
2. Put the model and its local dependencies under `public/vehicles/<vehicle-id>/`. Use only paths inside the app; remote dependencies are rejected.
3. Add a manifest entry in `src/vehicles/manifest.json`:
   - Set `asset.status` to `"available"`.
   - Set `asset.mainFile` to the app-relative path, for example `vehicles/example/model.glb`.
   - Include the main model and every resource file in `asset.files`.
   - Record the asset source and license names, URLs, and required attribution.
   - Set `accuracy` to `"verified"` only after checking the actual asset and its provenance. Verified entries require source and license URLs.
4. Add specifications only from an identified, reliable source. Keep unknown fields `null`; do not infer a trim, year, engine, dimensions, or option from the model name.
5. Add component mappings only after inspecting the GLB/glTF node names. `meshName` matching is case-insensitive. `focusPoint` is expressed in the mapped node's local coordinates; `cameraDistance` is in the normalized studio scene's units. Use `allowedModifications`, `inspectable`, and `customizable` to reflect what the asset actually supports.
6. If adding a thumbnail, place a real, authorized image inside `public/vehicles/` and use a safe app-relative path. Do not use a generated placeholder to imply the real model is present.
7. Run `npm test` and `npm run build`, then load the catalogue record in the app. Review mesh/material/texture counts, normalized bounds and scale, orientation warnings, unmatched mappings, selection focus, and component permissions.

## Asset limits and compatibility

- Maximum 256 files per import.
- Maximum 96 MB for the main GLB/glTF file.
- Maximum 128 MB total for model resources and catalogue asset fetching.
- GLB with embedded resources is simplest. A `.gltf` asset must include its local buffers and textures in `asset.files`.
- Remote files are fetched only through Electron from HTTPS URLs registered for every manifest file. Redirects must remain on the registered origin; each file is hash-verified before loading. Browser-only mode does not fetch remote vehicle assets.
- Electron caches verified remote files in the application user-data directory. Cache entries are fingerprinted, checked again before reuse, and can be removed from the catalogue UI.
- Unavailable and license-review-required entries cannot be fetched. Local user imports remain explicitly unverified and do not become verified catalogue assets.
- KTX2/Basis transcoding is not configured. Avoid those textures unless the application is extended and tested to support them.
- Importing a local file through a catalogue entry labels it **user-provided and unverified**. It does not become an official or accurate OEM model and does not inherit catalogue specifications.
- Catalogue IDs in saved project metadata are optional, so older version 1 and version 2 projects remain readable.

## Component mapping example

```json
{
  "componentId": "front-left-wheel",
  "meshName": "Wheel_FL",
  "displayName": "Front-left wheel",
  "category": "wheel",
  "focusPoint": [0, 0, 0],
  "cameraDistance": 2.4,
  "allowedModifications": ["material", "transform"],
  "inspectable": true,
  "customizable": true
}
```

The example is illustrative only; confirm the node name and coordinates in the actual asset before using it. Missing or unmatched mappings are surfaced in the model audit rather than silently treated as a successful match.

## Current catalogue state

The BMW M4 G82 entry now has one bundled, hash-verified BMW M4 Competition model with CC BY 4.0 attribution. Its named body and combined wheel/rim assemblies are selectable and material-editable; generic child nodes do not support finer component selection. The other 18 catalogue targets remain unavailable and never silently load the procedural demo in their place. See [HOW_TO_ADD_REAL_VEHICLE_ASSETS.md](./HOW_TO_ADD_REAL_VEHICLE_ASSETS.md) and [REAL_VEHICLE_FETCHING_IMPLEMENTATION_REPORT.md](./REAL_VEHICLE_FETCHING_IMPLEMENTATION_REPORT.md) for provenance, mapping, retrieval tests, and limitations.
