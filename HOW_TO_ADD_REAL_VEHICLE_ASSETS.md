# How to Add Real Vehicle Assets

The catalogue is a registry and secure loader. It currently has 19 targets; only an asset with an inspected file, recorded provenance/license, verified hash, and matching model mappings is marked available.

## First target: BMW M4 G82

- Catalogue ID: `bmw-m4` (existing ID retained).
- Display name and generation identify the user-requested G82. Year, variant, and specifications remain unset.
- Bundled model: `public/vehicles/bmw-m4/bmw-m4.glb`; manifest path: `vehicles/bmw-m4/bmw-m4.glb`.
- The 22,739,084-byte GLB was retrieved from the user-supplied Cooper Codes GitHub mirror. SHA-256: `913ac951ba2645777c91393b86aed2def2433a807e57e626b203908aa474b8fb`.
- Embedded GLB metadata and the mirror README identify “BMW M4 Competition M Package” by SRT Performance™ and CC BY 4.0. The Sketchfab listing was deleted when checked; the source link and mirror are retained in the manifest and `public/vehicles/bmw-m4/ATTRIBUTION.txt`.
- Actual GLB inspection found 35 nodes, 30 meshes, 28 materials, and 12 embedded PNG textures. The only descriptive assembly nodes are `BodyParts_1` (27 meshes) and `WHeelsandrims_2` (3 meshes); other mesh node names are generic `Object_n`. The app's existing GLTF transforms put the vehicle in Y-up orientation; the loader audit reports standard orientation.
- Only the body/exterior assembly and combined wheel/rim assembly are mapped. This asset does not provide individually named body panels, headlights, seats, or four separately selectable wheels. Year, variant, detailed specifications, and finer component editing remain unknown/unsupported.
- The manifest now marks this single bundled asset `available` with per-file integrity and attribution. The other 18 catalogue entries remain unavailable.
- A `.gltf` is also supported, but every referenced `.bin`, texture, and other dependency must be supplied in the same folder and listed in the manifest.
- **Current state:** `bmw-m4` is `available`; the file is bundled at the path above and passed the real-asset loader test and browser catalogue load. Electron main-process cache/runtime and project-dialog validation remain pending.

For future catalogue assets, provide the model and all dependency files plus:

1. The source page, creator/rightsholder, and required attribution.
2. The exact license name/version and canonical license URL.
3. Evidence that the license/rightsholder permits redistributing the model and all dependencies with this application. If usage, modification, commercial distribution, or attribution has limits, provide those terms explicitly.
4. Confirmation the file is the BMW M4 G82 and any trusted year/variant information. Unknown technical specifications will remain null.
5. For each distinct editable component, its actual glTF node name. Mappings will not be guessed from generic names.

Do not send credentials, private keys, or access tokens. The retrieval service does not support authenticated asset downloads.

## 1. Obtain and inspect the asset

1. Use a GLB/glTF model whose license explicitly allows the distribution and use planned for this application. Confirm that the license also covers every texture, buffer, and other dependency.
2. Verify that the model depicts the exact manufacturer/model/year/variant before attaching catalogue metadata. Do not infer identity or specifications from a filename or marketing page.
3. Inspect the node hierarchy, materials, dimensions, orientation, and dependencies in a GLB/glTF viewer.
4. Choose one delivery method:
   - **Bundled local asset:** place the model and all local dependencies under `public/vehicles/<vehicle-id>/`.
   - **Remote asset:** host the model and every dependency on an authorized HTTPS host. The application will download them only when that catalogue entry is selected.

## 2. Add verified manifest metadata

Edit `src/vehicles/manifest.json` for the exact catalogue ID. Preserve unknown specifications as `null`. Use a structure like this, replacing every placeholder with reviewed data:

```json
{
  "id": "your-catalogue-id",
  "manufacturer": "Verified manufacturer",
  "model": "Verified model",
  "generation": null,
  "year": null,
  "variant": null,
  "bodyStyle": null,
  "displayName": "Verified display name",
  "thumbnail": null,
  "specifications": null,
  "asset": {
    "status": "available",
    "accuracy": "verified",
    "mainFile": "vehicles/your-catalogue-id/model.glb",
    "files": ["vehicles/your-catalogue-id/model.glb"],
    "remoteFiles": null,
    "integrity": {
      "vehicles/your-catalogue-id/model.glb": "<actual SHA-256 digest>"
    },
    "source": {
      "name": "Actual asset source",
      "url": "<actual HTTPS source page>",
      "attribution": "Required attribution, or null if none"
    },
    "license": {
      "name": "Actual redistribution license",
      "url": "<actual HTTPS license text>",
      "attribution": "Required attribution, or null if none"
    }
  },
  "components": [],
  "customizationOptions": []
}
```

The example's identity, path, digest, source, and license are placeholders—not an asset or a claim that one exists. Do not copy the placeholder values into a release.

### Bundled local assets

- Put the files under `public/vehicles/<vehicle-id>/`; Vite copies them into `dist/vehicles/`.
- List the main model and every local dependency in `asset.files`.
- Keep `asset.remoteFiles` null or omit it.
- Calculate a SHA-256 for each file and use the exact manifest path as each `integrity` key. In PowerShell, for each real file:

```powershell
Get-FileHash -Algorithm SHA256 .\public\vehicles\<vehicle-id>\model.glb
```

- The Electron main process verifies every hash before returning files to the renderer. Browser-only local loading also checks the registered hashes.

### Remote assets

- `asset.files` must still list the main model and every external glTF buffer/image.
- `asset.remoteFiles` must map **every** listed file path to its actual authorized HTTPS download URL:

```json
"remoteFiles": [
  {
    "path": "vehicles/your-catalogue-id/model.glb",
    "url": "<actual HTTPS download URL>"
  }
]
```

- Use the real host and URLs; none are supplied by this guide. The loader rejects non-HTTPS/private destinations and redirects that leave the registered URL's origin.
- Each file URL must be directly GET-accessible without login, cookies, custom headers, tokens, or expiring authorization. A CDN may be used, but its redirects must remain on that file URL's HTTPS origin. The application downloads in Electron main, so CORS headers are not required.
- Hash each downloaded file and record its SHA-256 in `integrity`. A verified asset cannot be fetched without complete hashes and source/license URLs.
- Browser-only Vite mode does not fetch remote vehicle assets; remote retrieval requires the Electron service.
- Do not add authentication tokens or secrets to manifest URLs.

## 3. Map components only from the actual model

After inspecting the model, add `components` mappings for node names that actually exist. A mapping can include `componentId`, `displayName`, `category`, `focusPoint`, `cameraDistance`, `allowedModifications`, `inspectable`, and `customizable`. Do not invent engine, interior, wheel, or component geometry. Unmatched mappings appear in the model audit.

Only add technical specifications from a reliable source and only for the exact vehicle variant. Keep unknown fields null; do not infer them from the model.

## 4. Validate before release

Run:

```powershell
npm test
npm run build
```

Then launch the Electron app and test the selected entry while online and offline. Verify progress, cancellation, retry, hash rejection, cache reuse/removal, geometry loading, component mappings/focus, audit warnings, customization permissions, and project save/load. Test with the actual authorized model; generated test geometry is not evidence of real-vehicle support.

Current service limits: 256 files, 96 MB for the main model, and 128 MB total. Remote assets are downloaded on demand and cached under Electron `userData/vehicle-assets`. Entries marked `unavailable` or `license-review-required` cannot be fetched.

The BMW actual-asset integration test reads the bundled model bytes, checks the manifest hash, loads it through the production model loader, and validates mesh/material/texture counts, bounds, orientation, mappings, supported material editing, and project metadata round-trip. Browser testing confirms real texture decoding/rendering. Electron cache/runtime and project-dialog tests remain pending.

## Current state

One of 19 entries (`bmw-m4`) is registered as available and passed the browser renderer load. Electron main-process/cache behavior and remaining user-facing workflows are tracked in [GESTURE_DRIVE_3D_FINAL_ACCEPTANCE_REPORT.md](./GESTURE_DRIVE_3D_FINAL_ACCEPTANCE_REPORT.md); 18 other entries remain unavailable. See [REAL_VEHICLE_FETCHING_IMPLEMENTATION_REPORT.md](./REAL_VEHICLE_FETCHING_IMPLEMENTATION_REPORT.md) for retrieval-pipeline coverage and limitations.
