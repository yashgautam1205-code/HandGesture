# Gesture Drive 3D — Release Notes

## Version 0.2.0 (2026-11-24)

### New Features
- Professional Windows installer with customizable installation directory
- Desktop and Start menu shortcuts
- Improved branding and metadata
- Enhanced error messages with dismiss buttons
- Gesture settings tooltips for better usability
- Improved bottom status bar with accurate save state

### Improvements
- Better accessibility with ARIA labels on gesture panel
- Clearer error messages for model loading failures
- Updated documentation suite (Installation, User, Gesture, Troubleshooting guides)
- Version bump to 0.2.0

### Bug Fixes
- Fixed misleading "ALL CHANGES SAVED" status (now shows actual state)
- Added dismiss buttons to error panels
- Fixed gesture panel accessibility (removed aria-hidden)

### Known Limitations
- 18 of 19 catalogue entries remain unavailable (no verified 3D assets)
- BMW M4 year/variant/specifications not independently verified
- Native dialog GUI workflow requires manual testing
- Physical webcam testing required
- Real AI provider requests require API credentials

### Compatibility
- Project files from 0.1.0 are fully compatible
- No schema changes in this release

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