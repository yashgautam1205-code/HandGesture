# Phase 10 Asset Licences

## Overview
This document records all 3D vehicle assets integrated into Gesture Drive 3D, their sources, licences, and usage permissions.

## Integrated Assets

### 1. BMW M4 G82

**Asset Details**
- **File**: `public/vehicles/bmw-m4/bmw-m4.glb`
- **Size**: 21.7 MB (22,745,088 bytes)
- **SHA-256**: `913ac951ba2645777c91393b86aed2def2433a807e57e626b203908aa474b8fb`
- **Format**: GLB (glTF 2.0 Binary)
- **Meshes**: 30
- **Materials**: 28
- **Textures**: 12

**Source & Attribution**
- **Original Creator**: SRT Performance™
- **Original Platform**: Sketchfab
- **Original URL**: https://sketchfab.com/3d-models/bmw-m4-competition-m-package-5c0a2dafb1ad408d9fc9eeef9aee531b
- **Mirror Source**: Cooper Codes (GitHub)
- **Mirror URL**: https://github.com/coopercodes/bmwGLB
- **Downloaded**: Prior to Phase 10
- **Packaging**: Filename changed from original for integration

**Licence**
- **Type**: Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Licence URL**: https://creativecommons.org/licenses/by/4.0/
- **Commercial Use**: ✅ Allowed
- **Modification**: ✅ Allowed
- **Distribution**: ✅ Allowed
- **Attribution Required**: ✅ Yes
- **Attribution Text**: "BMW M4 Competition M Package by SRT Performance™. Original Sketchfab listing: https://sketchfab.com/3d-models/bmw-m4-competition-m-package-5c0a2dafb1ad408d9fc9eeef9aee531b. Changes: Filename modified for packaging. Model geometry and textures unmodified."

**Usage in Gesture Drive 3D**
- Available in vehicle catalogue as "BMW M4 G82"
- Supports material customization (body, wheels)
- Component mappings: BodyParts_1 (body), WHeelsandrims_2 (wheels)
- Project save/load compatible

**Attribution Compliance**
- ✅ Attribution displayed in UI (catalogue details panel)
- ✅ Source URL included in manifest
- ✅ Licence URL included in manifest
- ✅ Modifications documented (filename change only)
- ✅ Licence text accessible

---

### 2. Toy Car

**Asset Details**
- **File**: `public/vehicles/toy-car.glb`
- **Size**: 9.18 MB (9,180,948 bytes)
- **SHA-256**: `01a60862de55cd4b9f3acfab0b0def86451800f9c42467fcd61052c16cb9838c`
- **Format**: GLB (glTF 2.0 Binary)
- **Meshes**: 1
- **Materials**: Multiple (PBR with clearcoat, transmission, sheen)
- **Textures**: Embedded

**Source & Attribution**
- **Creators**: Guido Odendahl (initial model), Eric Chadwick (extensions and scene composition)
- **Source**: Khronos Group glTF Sample Assets
- **Repository**: https://github.com/KhronosGroup/glTF-Sample-Assets
- **Model Directory**: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/ToyCar
- **Downloaded**: Phase 10 (2026-11-24)
- **Direct URL**: https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/glTF-Binary/ToyCar.glb

**Licence**
- **Type**: Creative Commons Zero v1.0 Universal (CC0 1.0)
- **Licence URL**: https://creativecommons.org/publicdomain/zero/1.0/
- **Commercial Use**: ✅ Allowed (no restrictions)
- **Modification**: ✅ Allowed (no restrictions)
- **Distribution**: ✅ Allowed (no restrictions)
- **Attribution Required**: ❌ Not required
- **Attribution Text**: "Toy Car by Guido Odendahl and Eric Chadwick, CC0 1.0 Universal. Public domain."

**Usage in Gesture Drive 3D**
- Available in vehicle catalogue as "Toy Car"
- Supports material customization (body)
- Component mappings: ToyCar (body)
- Project save/load compatible
- Demonstrates CC0 asset integration

**Attribution Compliance**
- ✅ Attribution provided (voluntary, not required)
- ✅ Source URL included in manifest
- ✅ Licence URL included in manifest
- ✅ CC0 1.0 dedication respected
- ✅ No restrictions violated

---

## Asset Validation Checklist

### BMW M4 G82
- [x] GLB structure valid (loads in Three.js)
- [x] Embedded textures present
- [x] Material references valid
- [x] Mesh count: 30
- [x] Bounding box calculated
- [x] Scale and orientation verified
- [x] Model visible and renderable
- [x] No external dependencies
- [x] SHA-256 verified
- [x] File size within limits (21.7 MB < 96 MB)
- [x] Component mappings verified
- [x] Licence metadata complete

### Toy Car
- [x] GLB structure valid (loads in Three.js)
- [x] Embedded textures present
- [x] Material references valid
- [x] Mesh count: 1
- [x] Bounding box calculated
- [x] Scale and orientation verified
- [x] Model visible and renderable
- [x] No external dependencies
- [x] SHA-256 verified
- [x] File size within limits (9.18 MB < 96 MB)
- [x] Component mappings verified
- [x] Licence metadata complete

---

## Rejected Assets

No assets were rejected during Phase 10. All researched assets either:
1. Had unclear licensing (not downloaded)
2. Prohibited redistribution (not integrated)
3. Were not real manufacturer vehicles (not suitable)

### Research Notes

**Sketchfab CC-BY Models**
- Many high-quality vehicle models available under CC BY 4.0
- Requires individual verification of each asset
- Examples found but not integrated:
  - Ford F150 Raptor Police (CC BY) - 657k triangles, too large
  - Mercedes-Benz GLB 2027 (CC BY) - 1.8M triangles, split into 3 parts
  - Various Skoda, Pininfarina models (CC BY) - not prioritized manufacturers

**Khronos glTF Sample Assets**
- ToyCar (CC0) - ✅ Integrated
- CarConcept (CC BY 4.0) - Not integrated (concept car, not production vehicle)
- Other models (Fox, etc.) - Not vehicles

**Manufacturer Assets**
- BMW, Mercedes, Audi, etc. do not provide public 3D model downloads
- Official configurators use proprietary formats
- No redistribution permitted

---

## Licence Compliance Summary

| Asset | Licence | Commercial | Modify | Distribute | Attribution | Status |
|-------|---------|------------|--------|------------|-------------|--------|
| BMW M4 G82 | CC BY 4.0 | ✅ | ✅ | ✅ | Required | ✅ Compliant |
| Toy Car | CC0 1.0 | ✅ | ✅ | ✅ | Not required | ✅ Compliant |

**Total Assets**: 2
**Compliant**: 2
**Non-Compliant**: 0

---

## Future Asset Integration Guidelines

### Acceptable Licences
1. **CC0 1.0** - Public domain, no restrictions
2. **CC BY 4.0** - Attribution required, commercial use allowed
3. **CC BY-SA 4.0** - Share-alike, attribution required (use with caution)

### Unacceptable Licences
1. **CC BY-NC** - Non-commercial only
2. **CC BY-ND** - No derivatives
3. **Proprietary** - No redistribution
4. **Unclear/No licence** - Legal risk

### Required Metadata
Every integrated asset must include:
- Creator name(s)
- Source URL
- Licence name and URL
- Attribution text
- SHA-256 checksum
- File size
- Modification notes (if any)
- Commercial use permission
- Redistribution permission
- Modification permission

### Integration Process
1. Verify licence allows commercial redistribution
2. Download asset from legitimate source
3. Calculate SHA-256 checksum
4. Validate GLB structure and dependencies
5. Test loading in Three.js
6. Document all metadata
7. Update manifest.json
8. Add attribution to UI
9. Run full test suite
10. Commit with clear message

---

## Conclusion

All integrated assets in Gesture Drive 3D are legally cleared for commercial use and redistribution. The project maintains full compliance with CC BY 4.0 and CC0 1.0 licences. Future asset integration must follow the documented guidelines to maintain legal compliance.