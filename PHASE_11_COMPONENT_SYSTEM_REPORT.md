# Phase 11 Component System Report

## Overview
Phase 11 transformed Gesture Drive 3D into a component-level inspection and customization studio. The component engine now produces stable, geometry-backed component identities with source tracking, mesh UUID association, and parent/child hierarchy, while the inspector UI gained search, per-component detail, and expanded material controls.

## Task A — Audit Findings (Completed)
- **Mesh identification**: `buildComponentRegistry` traverses the GLB scene, groups named nodes by category patterns, and falls back to merged geometry for unnamed meshes. Mappings override naming via `meshName`.
- **Selection**: Raycast in `CarScene` walks up to `userData.gd3dComponentId`; store `setSelectedPart` validates `inspectable`.
- **Material overrides**: `MaterialController` clones original materials per mesh, applies style, disposes clones on change/dispose. Textures preserved (clone keeps texture refs).
- **Visibility/Isolation**: Store `componentVisibility` + `isolatedComponentId`; applied per-frame in `StudioStage`.
- **Exploded view**: `setExplodedView` offsets by `explodeOffset`, restores original position/quaternion/scale each frame.
- **Replacement parts**: `parts.ts` + `ReplacementPartsLayer` place imported GLB at target bounds center.
- **Measurements**: Bounds computed from `THREE.Box3.setFromObject`.
- **Serialization**: `projectConfig.ts` schema v2 stores componentMaterials, componentRotations, replacementParts, gestureSettings.
- **Limitations identified**: Unnamed geometry grouped; no per-panel granularity on combined meshes; component IDs were positional (`model-N`) for unmapped nodes.

## Task B — Smart Component Hierarchy (Completed)
Enhanced `VehicleComponent` with:
- `source: "mapping" | "category" | "fallback"` — provenance of identification.
- `meshUuids: string[]` — stable mesh UUIDs (not positional indexes).
- `parentId: string | null` — hierarchy linkage.
- `buildComponentHierarchy()` helper for tree rendering.

Stable IDs: mapped components use `componentId`; unmapped use `model-N` (unchanged for compatibility) but now carry mesh UUIDs for stable association.

## Task C — Advanced Component Inspector UI (Completed)
- Component search input filters by name or ID.
- Each row shows category, mesh count, and source badge (mapped/merged).
- New **Component Detail** panel: mesh count, material slots, W/H/D, material/transform capability, source.
- Existing isolate/hide/wireframe/measure actions retained.

## Task D — Material Customization Engine (Completed)
- `ComponentMaterialOverride` extended with `emissive?: string` and `opacity?: number`.
- `MaterialController.applyMaterialStyle` applies emissive color and opacity (with transparency toggle).
- Procedural `Car` material map handles emissive/opacity.
- UI: metallic, roughness, opacity sliders + reset button per component.
- Textures preserved (clone-based); unrelated materials untouched; clones disposed on change.

## Task E — Precision Transforms (Retained)
Existing `rotateSelectedComponent`, `resetSelectedComponentTransform`, `applyComponentRotation` use local/world conversions and original snapshots. Transformable flag gates UI. No regression.

## Task F — Exploded View (Retained)
`setExplodedView` restores originals each frame; combined meshes get a single merged offset (no fake per-door explosion). Graceful fallback preserved.

## Task G — Replacement Parts (Retained)
Import/preview/compatibility/install/remove/save-load unchanged and functional. Path validation in `modelLoader` prevents unsafe paths.

## Task H — Vehicle-Specific Mappings (Completed)
- **BMW M4 G82**: `bmw-m4-body-assembly` (BodyParts_1, body), `bmw-m4-wheel-assembly` (WHeelsandrims_2, wheel). Source = mapping.
- **Toy Car**: `toycar-body` (ToyCar, body). Source = mapping.
- Unmapped geometry → category/fallback with generic selection.

## Task I — Gesture Integration (Retained)
Existing gesture→action mapping unchanged (point=dwell select, pinch=zoom, open-palm=orbit, two-hand=explode/zoom, thumbs-up=confirm). No new conflicting gestures.

## Task J — Project Persistence (Completed)
Schema v2 unchanged. New emissive/opacity fields serialize automatically via `ComponentMaterialOverride`. Validation updated in `projectConfig.ts`. Round-trip test added.

## Task K — Performance & Memory (Audited)
- MaterialController disposes clones on every apply and on dispose.
- `disposeVehicle` disposes textures/materials/geometries.
- No per-frame allocations added; hierarchy built on demand.
- No evidence of leak; existing patterns retained.

## Actual Component Support

| Vehicle | Components | Source |
|---------|-----------|--------|
| BMW M4 G82 | Body assembly (27 meshes), Wheel assembly (3 meshes) | mapping |
| Toy Car | Body (1 mesh) | mapping |
| Procedural | body, hood, roof, bumpers, windows, doors, 4 wheels, headlights, spoiler, exhaust | fallback |

## Known Limitations
- Combined meshes (BMW body) cannot be split into doors/hood.
- Unmapped nodes use positional IDs with mesh UUID association.
- No automatic mesh-to-component inference beyond name patterns.
- Gesture actions require physical webcam (not verified in CI).