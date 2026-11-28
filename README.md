# Gesture Drive 3D

A premium automotive digital customization and inspection studio for Windows. Select a vehicle, customize its appearance with paint and materials, interact using hand gestures, and get AI-powered styling suggestions.

## Key Features

- **3D Vehicle Showroom** — Cinematic rendering with 5 showroom environments and reflective floor
- **Vehicle Library** — 25 catalogue targets with manufacturer/model filtering, 7 verified real 3D assets
- **Real 3D Assets** — 7 verified vehicles: BMW M4 G82 (CC BY 4.0), Toy Car (CC0 1.0), Khronos Car Concept (CC BY 4.0), Kenney Sedan/SUV/Sedan Sports/Truck (CC0 1.0 ×4)
- **Camera System** — 8 bounding-box-driven views, smooth transitions, orbit/zoom/fit
- **Presentation Modes** — Showroom, Inspection, Customization, Presentation (auto-rotate)
- **Component Inspection** — Searchable hierarchy, per-component detail, focus/isolate/hide, wireframe, measurements
- **Material Customization** — Per-component color, metallic, roughness, opacity, emissive, reset
- **Replacement Parts** — Import and install GLB/glTF replacement components
- **Gesture Controls** — Pinch, point, open-palm, two-hand gestures via MediaPipe
- **AI Styling Assistant** — OpenAI/Anthropic integration with preview/apply/cancel
- **Screenshot Capture** — Export the 3D viewport as PNG
- **Project Persistence** — Save/load with native Windows dialogs (schema v2)
- **Undo/Redo** — Full history support (40 snapshots)

## Screenshots

*No screenshots available yet. Capture from the running application at 1920×1080 for best results.*

Suggested screenshots to capture:
1. Main showroom with BMW M4 loaded
2. Component selection and material editing
3. Gesture panel with hand tracking active
4. AI Assistant preview
5. Vehicle library with catalogue
6. Each of 5 showroom environments

## Installation

1. Download `Gesture Drive 3D Setup 0.2.0.exe` from [Releases](../../releases)
2. Run the installer
3. Choose installation directory
4. Launch from desktop or Start menu

**Note:** The installer is not code-signed. Windows SmartScreen will display a warning on first run. Click "More info" → "Run anyway" to proceed.

### Requirements

- Windows 10 or 11 (64-bit)
- 4 GB RAM minimum (8 GB recommended)
- 500 MB free disk space
- Webcam (optional, for gesture controls)
- Internet (optional, for AI features)

## Technology Stack

| Layer | Technology |
|-------|------------|
| Desktop | Electron 43 |
| UI | React 18 + TypeScript |
| Build | Vite 8 |
| 3D | Three.js + React Three Fiber + Drei |
| Gestures | MediaPipe Tasks Vision |
| State | Zustand |
| Styling | Tailwind CSS 4 |
| Testing | Vitest |

## Vehicle Library

### Available Vehicles (7)

| Vehicle | License | Source | Components |
|---------|---------|--------|------------|
| **BMW M4 G82** | CC BY 4.0 | Sketchfab (SRT Performance™) | 2 (body, wheels) |
| **Toy Car** | CC0 1.0 | Khronos Group glTF Samples | 1 (body) |
| **Khronos Car Concept** | CC BY 4.0 | Khronos Group glTF Samples | 23 (body, doors, roof, hood, trunk, fenders, bumpers, wheels, rims, glass, interior, dashboard, lights, mirrors) |
| **Kenney Sedan** | CC0 1.0 | Kenney Car Kit | 5 (body, 4 wheels) |
| **Kenney SUV** | CC0 1.0 | Kenney Car Kit | 6 (body, front wheels, rear wheels) |
| **Kenney Sedan Sports** | CC0 1.0 | Kenney Car Kit | 6 (body, spoiler, 4 wheels) |
| **Kenney Truck** | CC0 1.0 | Kenney Car Kit | 5 (body, 4 wheels) |

### Catalogue Entries (25 Total)
18 additional manufacturer/model entries are catalogued as placeholders for future asset acquisition (BMW 3/5/M3, Mercedes C/E/AMG GT, Audi A4/A6/RS5, Porsche 911/Cayenne/Panamera, Tata Nexon/Harrier/Safari, Mahindra Thar/XUV700/Scorpio-N).

## Showroom Environments

All sourced from Poly Haven (CC0 1.0):
- **Studio Dark** — Dark studio with softbox lighting
- **Luxury Showroom** — Bright automotive showroom
- **Cyber Night** — Neon-lit cyberpunk atmosphere
- **Outdoor Daylight** — Natural sunlight environment
- **Minimal White** — Clean white studio

## Gesture Controls

| Gesture | Action |
|---------|--------|
| Pinch (one hand) | Camera zoom (distance delta) |
| Open Palm | Orbit camera (palm movement) |
| Pointing (index) | Component selection (raycast + dwell) |
| Two-Hand Spread | Exploded view |
| Two-Hand Pinch | Zoom (palm separation) |
| Closed Fist | Pause interaction |
| Thumbs-Up | Confirm customization |

**Reliability Features:** Tracking loss detection/recovery, per-gesture cooldowns, debounce/throttle, stable gesture detection, reconnection logic.

## AI Assistant

- **Providers:** OpenAI (GPT-4o-mini default), Anthropic (Claude 3.5 Sonnet default)
- **Context:** Full vehicle context (components, materials, capabilities, supported actions)
- **Workflow:** Natural language → structured proposals → preview → apply/cancel/undo
- **Offline Mode:** 7 styling presets (Racing Red, Stealth Black, Luxury Chrome, Cyberpunk Neon, Off-Road Olive, Executive Navy, Street Carbon)
- **Credentials:** Environment variables only (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`)

## Project Persistence

- **Schema Version:** 2 (backward compatible with v1)
- **Native Dialogs:** Windows Save/Open via Electron main process
- **Data Preserved:** Vehicle, customization, component materials, rotations, replacement parts, gesture settings
- **Format:** `.gd3d.json` (UTF-8 JSON)

## Development

```bash
npm install
npm run dev        # Start Vite dev server (UI only)
npm test           # Run tests (107 tests)
npm run build      # Production build (web + electron)
npm run package:win  # Build Windows installer
```

### Development Workflow

**UI Development:** `npm run dev` starts Vite at `http://127.0.0.1:5173`

**Electron Testing:** Due to Electron 43+ npm package architecture, `npm run dev` does not launch Electron correctly. Use the packaged app for Electron-specific testing:

```bash
npm run package:win
release\win-unpacked\Gesture Drive 3D.exe
```

The packaged application provides full Electron functionality (native dialogs, vehicle assets, AI bridge, gestures, screenshots).

## Documentation

- [Phase 17 Release Audit](PHASE_17_RELEASE_AUDIT_REPORT.md)
- [Phase 17 Development Mode](PHASE_17_DEVELOPMENT_MODE_REPORT.md)
- [Phase 17 Vehicle Acceptance](PHASE_17_VEHICLE_ACCEPTANCE_REPORT.md)
- [Phase 17 Visual Acceptance](PHASE_17_VISUAL_ACCEPTANCE_REPORT.md)
- [Phase 17 Gesture Acceptance](PHASE_17_GESTURE_ACCEPTANCE_REPORT.md)
- [Phase 17 AI Acceptance](PHASE_17_AI_ACCEPTANCE_REPORT.md)
- [Phase 17 Project Persistence](PHASE_17_PROJECT_PERSISTENCE_REPORT.md)
- [Phase 17 Performance](PHASE_17_PERFORMANCE_REPORT.md)
- [Phase 17 Security Audit](PHASE_17_SECURITY_AUDIT_REPORT.md)
- [Phase 17 Windows Release](PHASE_17_WINDOWS_RELEASE_REPORT.md)

Previous Phases: [Phase 10](PHASE_10_VEHICLE_LIBRARY_REPORT.md) | [Phase 11](PHASE_11_COMPONENT_SYSTEM_REPORT.md) | [Phase 12](PHASE_12_SHOWROOM_REPORT.md) | [Phase 13](PHASE_13_FINAL_QA_REPORT.md) | [Phase 14](PHASE_14_IMPLEMENTATION_REPORT.md) | [Phase 15](PHASE_15_IMPLEMENTATION_REPORT.md) | [Phase 16](PHASE_16_RELEASE_READINESS_REPORT.md)

## Asset Attribution

### BMW M4 Competition M Package
by SRT Performance™, licensed CC BY 4.0. Original Sketchfab listing: https://sketchfab.com/3d-models/bmw-m4-competition-m-package-5c0a2dafb1ad408d9fc9eeef9aee531b. Mirror by Cooper Codes. Model geometry and textures unmodified.

### Toy Car
by Guido Odendahl and Eric Chadwick, CC0 1.0 Universal (Public Domain). Source: Khronos Group glTF Sample Assets.

### Khronos Car Concept
by Eric Chadwick (Darmstadt Graphics Group GmbH), CC BY 4.0. Source: Khronos Group glTF Sample Assets.

### Kenney Car Kit Vehicles (Sedan, SUV, Sedan Sports, Truck)
by Kenney (www.kenney.nl), CC0 1.0 Universal (Public Domain). Source: https://kenney.nl/assets/car-kit.

### Showroom Environments (HDRI)
All sourced from Poly Haven (https://polyhaven.com) under CC0 1.0 Universal.

### Third-Party Libraries
Electron, React, Vite, TypeScript, Three.js, @react-three/fiber, @react-three/drei, Zustand, MediaPipe Hands, @gltf-transform/cli, Vitest, ESLint, Prettier. All under their respective open-source licenses (MIT, Apache-2.0, BSD, etc.).

See [ATTRIBUTION.txt](ATTRIBUTION.txt) for complete licence details and SHA-256 verification hashes.

## Known Limitations

- **Development Mode:** Electron 43+ npm package is a binary downloader only. Use `npm run package:win` for Electron testing.
- **Unsigned Installer:** Windows SmartScreen warning on first run. Click "More info" → "Run anyway".
- **No Code Signing:** Installer and executable are unsigned.
- **No Auto-Updater:** Manual reinstall required for updates.
- **x64 Only:** No ARM64 build available.
- **Default Electron Icon:** No custom application icon.
- **Physical Webcam Testing:** Not performed in CI (requires hardware).
- **Real AI Provider Testing:** Not performed (requires API credentials).
- **Human Visual Acceptance:** Not performed (requires manual verification).

## License

Application code: See repository license.
BMW M4 asset: CC BY 4.0 (see attribution above).
Third-party dependencies retain their respective licenses.
All Kenney and Khronos assets: CC0 1.0 / CC BY 4.0 as noted above.