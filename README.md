# Gesture Drive 3D

A premium automotive digital customization and inspection studio for Windows. Select a vehicle, customize its appearance with paint and materials, interact using hand gestures, and get AI-powered styling suggestions.

## Key Features

- **3D Vehicle Showroom** — Real-time 3D rendering with cinematic lighting
- **Vehicle Library** — 19 catalogue targets with manufacturer/model filtering
- **BMW M4 G82** — Real bundled GLB asset (22.7 MB, CC BY 4.0)
- **Component Inspection** — Select, focus, and inspect vehicle components
- **Material Customization** — Paint, metallic, roughness, clearcoat controls
- **Replacement Parts** — Import and install GLB/glTF replacement components
- **Gesture Controls** — Pinch, point, open-palm, two-hand gestures via MediaPipe
- **AI Styling Assistant** — OpenAI/Anthropic integration with preview/apply/cancel
- **Project Persistence** — Save/load with native Windows dialogs
- **Undo/Redo** — Full history support
- **Offline Presets** — 7 styling presets work without internet

## Screenshots

*No screenshots available yet. Capture from the running application at 1920×1080 for best results.*

Suggested screenshots to capture:
1. Main showroom with BMW M4 loaded
2. Component selection and material editing
3. Gesture panel with hand tracking active
4. AI Assistant preview
5. Vehicle library with catalogue

## Installation

1. Download `Gesture Drive 3D Setup 0.2.0.exe` from [Releases](../../releases)
2. Run the installer
3. Choose installation directory
4. Launch from desktop or Start menu

### Requirements

- Windows 10 or 11 (64-bit)
- 4 GB RAM minimum (8 GB recommended)
- 500 MB free disk space
- Webcam (optional, for gesture controls)
- Internet (optional, for AI features)

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron 45 |
| UI | React 18 + TypeScript |
| Build | Vite 8 |
| 3D | Three.js + React Three Fiber + Drei |
| Gestures | MediaPipe Tasks Vision |
| State | Zustand |
| Styling | Tailwind CSS 4 |

## Documentation

- [Installation Guide](INSTALLATION_GUIDE.md)
- [User Guide](USER_GUIDE.md)
- [Gesture Control Guide](GESTURE_CONTROL_GUIDE.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [Asset Licenses](VEHICLE_ASSET_LICENSES.md)
- [Manual Acceptance Checklist](PHASE_6_MANUAL_ACCEPTANCE_CHECKLIST.md)
- [Release Notes](RELEASE_NOTES.md)

## Limitations

- Only **BMW M4 G82** is available as a verified real 3D asset
- 18 other catalogue entries are placeholders (no 3D model)
- BMW year/variant/specifications not independently verified
- Native dialog and webcam workflows require manual testing
- AI features require API key configuration
- Installer is unsigned

## Asset Attribution

BMW M4 Competition M Package by SRT Performance™, licensed CC BY 4.0. Original Sketchfab listing deleted; mirror by Cooper Codes. Model geometry and textures unmodified. See [VEHICLE_ASSET_LICENSES.md](VEHICLE_ASSET_LICENSES.md).

## Development

```bash
npm install
npm run dev        # Start Vite + Electron
npm test           # Run tests (69 tests)
npm run build      # Production build
npm run package:win  # Build Windows installer
```

## License

Application code: See repository license.
BMW M4 asset: CC BY 4.0 (see attribution above).
Third-party dependencies retain their respective licenses.