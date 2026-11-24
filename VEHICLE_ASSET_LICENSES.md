# Gesture Drive 3D — Vehicle Asset Licenses

## Available Assets

### BMW M4 G82 (`bmw-m4`)

- **File:** `public/vehicles/bmw-m4/bmw-m4.glb`
- **Size:** 22,739,084 bytes (22.7 MB)
- **SHA-256:** `913ac951ba2645777c91393b86aed2def2433a807e57e626b203908aa474b8fb`
- **Source:** Cooper Codes GitHub mirror (`https://github.com/coopercodes/bmwGLB`)
- **Original Creator:** SRT Performance™ on Sketchfab
- **Original Listing:** `https://sketchfab.com/3d-models/bmw-m4-competition-m-package-5c0a2dafb1ad408d9fc9eeef9aee531b` (deleted)
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **License URL:** `https://creativecommons.org/licenses/by/4.0/`
- **Attribution:** "BMW M4 Competition M Package" by SRT Performance™. Credit SRT Performance™; link the source and license. Model geometry and textures are unmodified. Filename changed for packaging.
- **Modifications:** None (geometry and textures unmodified; filename changed only)
- **Components Mapped:**
  - `BodyParts_1` (27 meshes) → Body and exterior assembly
  - `WHeelsandrims_2` (3 meshes) → Wheels and rims assembly
- **Unmapped:** 28 generic `Object_n` nodes (not individually selectable)

## Unavailable Assets

The following 18 catalogue entries have no verified 3D assets and are marked `unavailable`:

- BMW 3 Series, 5 Series, M3
- Mercedes-Benz C-Class, E-Class, AMG GT
- Audi A4, A6, RS5
- Porsche 911, Cayenne, Panamera
- Tata Motors Nexon, Harrier, Safari
- Mahindra Thar, XUV700, Scorpio-N

These entries display "3D MODEL NOT AVAILABLE — ASSET REQUIRED" and cannot be loaded.

## Adding New Assets

See `HOW_TO_ADD_REAL_VEHICLE_ASSETS.md` for the asset registration process. Requirements:
1. Valid GLB/glTF with all dependencies
2. Verified source and creator
3. Explicit redistribution license
4. SHA-256 hash
5. Manifest registration
6. Component mapping (only for named nodes)

## Procedural Demonstration Model

When no vehicle is loaded, the application shows a procedural sport coupe for demonstration purposes. This is **not** a real vehicle model and is clearly labeled "PROCEDURAL DEMO" in the UI.