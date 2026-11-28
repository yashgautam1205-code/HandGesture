# Phase 11 Component Mapping Report

## Mapping Architecture
Vehicle-specific mappings live in `src/vehicles/manifest.json` per vehicle `components[]`. Each mapping:
- `componentId` — stable ID.
- `meshName` — exact GLB node name (case-insensitive match).
- `displayName`, `category`, `allowedModifications`, `inspectable`, `customizable`.
- Optional `focusPoint`, `cameraDistance`.

At load, `buildComponentRegistry` matches `meshName` to scene nodes, assigns `source: "mapping"`, records `meshUuids`, and computes bounds/focus. Unmatched nodes fall back to category detection (`source: "category"`) or merged geometry (`source: "fallback"`).

## BMW M4 G82
| Component ID | Mesh Name | Category | Mods | Meshes |
|--------------|-----------|----------|------|--------|
| bmw-m4-body-assembly | BodyParts_1 | body | material | 27 |
| bmw-m4-wheel-assembly | WHeelsandrims_2 | wheel | material | 3 |

Evidence: Real GLB inspected (30 meshes, 28 materials, 12 textures). Only two descriptive nodes exist; child nodes are generic `Object_n`. No year/variant/specs asserted.

## Toy Car
| Component ID | Mesh Name | Category | Mods | Meshes |
|--------------|-----------|----------|------|--------|
| toycar-body | ToyCar | body | material | 1 |

Evidence: CC0 Khronos asset, single mesh. No interior/wheel separation.

## Procedural Fallback
Separate meshes per part (body, hood, roof, bumpers, windows, doors, wheels, headlights, spoiler, exhaust). Category-derived. Not a real manufacturer model.

## Mapping Confidence
No confidence values are fabricated. Mappings are explicit (mesh name match = certain). Category/fallback are clearly labeled via `source`.

## Future Vehicles
Add a `components[]` array to the manifest entry with verified mesh names. The loader handles the rest. Uncertain mappings should be omitted so generic selection applies.