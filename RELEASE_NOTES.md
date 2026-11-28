# Gesture Drive 3D — Release Notes

## Version 0.2.0 (2026-11-28)

### 🚗 Vehicle Library — 7 Verified Real Assets (Phase 15)
- **BMW M4 G82** (CC BY 4.0) — 22.7 MB, 2 components (body, wheels)
- **Toy Car** (CC0 1.0) — 5.4 MB, 1 component (body)
- **Khronos Car Concept** (CC BY 4.0) — 11.8 MB, 23 components (full hierarchy)
- **Kenney Sedan** (CC0 1.0) — 87 KB, 5 components
- **Kenney SUV** (CC0 1.0) — 105 KB, 6 components
- **Kenney Sedan Sports** (CC0 1.0) — 91 KB, 6 components
- **Kenney Truck** (CC0 1.0) — 90 KB, 5 components
- **25-entry catalogue** with manufacturer/model filtering (18 placeholders for future)
- **48 component mappings** validated across all 7 vehicles
- SHA-256 integrity verification for all assets
- gltf-transform optimized (dedup, instance, palette, prune)

### 🤖 AI-Powered Styling Assistant (Phase 14/17)
- **Dual provider support:** OpenAI (GPT-4o-mini default) + Anthropic (Claude 3.5 Sonnet default)
- **Secure credential isolation:** API keys only in Electron main process, never in renderer
- **Full vehicle context injection:** Component hierarchy, materials, capabilities, supported actions, replacement parts
- **7 offline styling presets** (no API key required):
  - Racing Red, Stealth Black, Luxury Chrome, Cyberpunk Neon
  - Off-Road Olive, Executive Navy, Street Carbon
- **Preview → Apply → Cancel → Undo workflow** with structured JSON proposals
- **Response validation** against strict schema with material setting sanitization

### 🤲 Advanced Gesture Controls (Phase 14/17)
- **MediaPipe Tasks Vision 0.10.21** — local WASM, no network calls
- **8 gesture types:** Pinch (zoom), Open Palm (orbit), Point (select), Two-Hand Spread (exploded), Two-Hand Pinch (zoom), Closed Fist (pause), Thumbs-Up (confirm)
- **Smart selection flow:** Pinch → Dwell (800ms) → Confirm → Thumbs-Up
- **Reliability engine:** Tracking loss detection (3-frame threshold) + auto-recovery, per-gesture cooldowns (300-1000ms), debounce/throttle, stable gesture confirmation (3-frame)

### 💾 Project Persistence — Schema v2 (Phase 13/17)
- **Native Windows Save/Open dialogs** via Electron main process IPC
- **Backward compatible:** Auto-migrates v1 projects to v2
- **Complete state preservation:** Vehicle selection, component materials, rotations, visibility, replacement parts, gesture settings, AI customizations, undo history
- **Format:** `.gd3d.json` (UTF-8 JSON)
- **Undo/Redo:** 40 snapshots with full history support

### 🔒 Security Hardening (Phase 16)
- Context isolation: **enabled**
- Sandbox: **enabled**
- nodeIntegration: **disabled**
- Credential isolation: **main process only** (aiProvider.ts)
- IPC validation: **trusted-renderer origin check**
- CSP: **enforced** via meta tag and headers
- No credentials in renderer bundle: **verified**
- No external downloads at runtime: **verified**
- MediaPipe local WASM: **no network calls**

### 🪟 Windows Installer (Phase 16/17)
- NSIS installer with customizable installation directory
- Desktop + Start Menu shortcuts
- Per-machine installation
- **Unsigned** (SmartScreen warning expected — documented)
- SHA-256: `05408ef6bfb424b8f053f04fc53f63d12031ebfb316c5ac776fa44a408608d03`

### 🎨 Showroom Environments (Phase 12)
- 5 HDRI environments from Poly Haven (CC0 1.0):
  - Studio Dark, Luxury Showroom, Cyber Night, Outdoor Daylight, Minimal White
- Reflective floor plane with tone-mapped rendering

### 📸 Camera & Presentation (Phase 12/13)
- 8 bounding-box-driven camera views
- Smooth transitions with easing
- Fit-to-FOV framing
- 4 presentation modes: Showroom, Inspection, Customization, Presentation (auto-rotate)

### 🧪 Testing & Quality
- **107 automated tests passing** (10 test files)
- **TypeScript compilation:** 0 errors
- **Build:** Web + Electron production builds successful
- **Manual verification:** Installer install/launch/uninstall, vehicle loading, native dialogs, vehicle switching

---

### Improvements
- Better accessibility with ARIA labels on gesture panel
- Clearer error messages for model loading failures
- Updated documentation suite (README, Installation, User, Gesture, Troubleshooting guides)
- Version bump to 0.2.0 with complete Phase 17 release preparation

### Bug Fixes
- Fixed misleading "ALL CHANGES SAVED" status (now shows actual state)
- Added dismiss buttons to error panels
- Fixed gesture panel accessibility (removed aria-hidden)
- Electron 43+ CommonJS module resolution fixed
- Vehicle asset loading via IPC secured

### Known Limitations
- **Unsigned installer:** Windows SmartScreen warning (click "More info" → "Run anyway")
- **No code signing certificate:** Future enhancement
- **No auto-updater:** Manual reinstall required for updates
- **x64 only:** No ARM64 build available
- **Default Electron icon:** No custom application icon
- **Development mode:** Electron 43+ npm package is binary downloader; use `npm run package:win` for Electron testing
- **18 of 25 catalogue entries unavailable:** Placeholders for future asset acquisition
- **Physical webcam testing:** Not performed in CI (requires hardware)
- **Real AI provider testing:** Not performed (requires API credentials)
- **Human visual acceptance:** Not performed (requires manual verification)

### Compatibility
- Project files from 0.1.0 are fully compatible with 0.2.0
- Schema v2 auto-migrates v1 projects
- No breaking changes

---

## Version 0.1.0 (2026-11-18)

### Initial Release
- 3D vehicle showroom with BMW M4 G82 real GLB asset
- Vehicle catalogue with 19 targets (1 available)
- Paint and material customization
- Component selection and inspection
- Replacement part system
- Gesture controls (MediaPipe)
- AI styling assistant (OpenAI/Anthropic)
- Project save/load with native dialogs
- Undo/redo
- Offline styling presets
- Windows installer