# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **pnpm monorepo** for the Audacity Design System - a collection of reusable UI components for audio editing applications. The repository is transitioning from a single prototype to a modular design system architecture.

**Current State**: Early-stage monorepo with foundational packages. The main demo (`apps/demo/clip-envelope/`) has not yet been migrated to consume the packages.

## Development Commands

### Monorepo (Root)
```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build

# Watch all packages in development mode
pnpm dev

# Lint all packages
pnpm lint
```

### Individual Packages
```bash
# Build a specific package
cd packages/core
pnpm build

# Watch mode for a package
cd packages/tokens
pnpm dev
```

### Demo Application
```bash
# Run the clip envelope demo
cd apps/demo/clip-envelope
npm install  # Note: Uses npm, not pnpm (legacy)
npm run dev  # Runs on http://localhost:3000
npm run build
npm run lint
```

## Architecture

### Monorepo Structure

- **`packages/`** - Published npm packages (use tsup for builds)
  - `@audacity-ui/core` - Core TypeScript types and interfaces
  - `@audacity-ui/tokens` - Design tokens (themes, colors)
  - *(Planned)* `@audacity-ui/components` - Basic UI components
  - *(Planned)* `@audacity-ui/audio-components` - Complex audio editing components

- **`apps/demo/clip-envelope/`** - Next.js 16 demo application
  - Self-contained prototype showcasing clip envelope editing
  - Uses React 19, TypeScript 5, Tailwind CSS 4
  - Currently does NOT import from `packages/` (planned migration)

- **`docs/`** - Architecture documentation
  - `design-system-architecture.md` - Complete design system roadmap
  - `automation-overlay-states.md` - Visual state documentation
  - `clip-styling-states.md` - Clip styling state matrix

### Key Components in `apps/demo/clip-envelope/`

**Main Controller:**
- `ClipEnvelopeEditor.tsx` - Root component managing all state, mouse events, and interactions
  - Manages tracks, clips, selections, drag states
  - Coordinates between TrackCanvas, Toolbar, TrackHeader components
  - Contains all mouse event handlers and state management logic

**Rendering:**
- `TrackCanvas.tsx` - Canvas-based rendering engine
  - Draws waveforms, envelope curves, overlays, time selections
  - Uses HTML5 Canvas API for performance
  - Receives props from ClipEnvelopeEditor (controlled component pattern)

**UI Components:**
- `Toolbar.tsx` - Top toolbar with "Clip Envelopes" toggle
- `ResizableTrackHeader.tsx` - Track labels with resize handles
- `ResizableRuler.tsx` - Timeline ruler with resize
- `TimelineRuler.tsx` - Time markers
- `Tooltip.tsx` - dB value tooltip

**Data:**
- `types.ts` - TypeScript interfaces (Clip, Track, EnvelopePoint, DragState, etc.)
- `theme.ts` - Theme system (light/dark modes)

### Audio Rendering Architecture

**Non-Linear dB Scale:**
- Uses cubic power curve (x³) for visual dB positioning
- 0dB positioned at ~2/3 down the clip height
- Range: -60dB to +12dB, with -∞ at bottom 1px
- Functions: `dbToYNonLinear()`, `yToDbNonLinear()` in ClipEnvelopeEditor.tsx

**Canvas Rendering Order (TrackCanvas.tsx):**
1. Clip background (track-specific colors)
2. Clip header (with rounded corners)
3. Envelope fill (automation overlay)
4. Time selection overlay (if present)
5. Automation overlay within selection (if in envelope mode)
6. Waveform (scaled by envelope curve)
7. Envelope line and control points
8. Clip borders

**Automation Overlay States:**
There are 6 distinct overlay states based on envelope mode, selection, and time selection. See `docs/automation-overlay-states.md` for the complete state matrix.

Key states:
- **Active** (envelope mode ON): `rgba(255, 255, 255, 0.5)`
- **Idle** (envelope mode OFF, has points): `rgba(255, 255, 255, 0.6)`
- **Time selection overlays**: Track-specific blended colors or pure white

**Clip Styling States:**
Clips have 10 combined visual states based on:
- Selection (selected/unselected)
- Hover state (idle/hover on header)
- Time selection (present/absent)
- Envelope mode (on/off)

See `docs/clip-styling-states.md` for the complete state matrix.

### Interaction Model

**Dual Hit Zones for Envelope Editing:**
- **0-4px from line**: Add new control point
- **4-16px from line**: Drag entire segment (only if clip has ≥1 point)
- **>16px from line**: No envelope interaction

**Segment Dragging:**
- When 4-16px from line and clip has points: drags both endpoints of segment vertically
- Segment hover shows orange color (`#ffaa00`) and semi-transparent overlay
- Disabled for clips with zero control points (empty state)

**Mouse Event Flow:**
1. `ClipEnvelopeEditor` handles all mouse events (move, down, up)
2. Maintains drag state refs: `dragStateRef`, `envelopeDragStateRef`, `envelopeSegmentDragStateRef`, `timeSelectionDragStateRef`, `trackResizeDragStateRef`
3. Updates cursor style based on hover state
4. Triggers re-renders by updating state
5. `TrackCanvas` receives props and renders accordingly

**Constants:**
- `TRACK_HEIGHT = 114` (default)
- `CLIP_HEADER_HEIGHT = 20`
- `LEFT_PADDING = 12`
- `INFINITY_ZONE_HEIGHT = 1` (bottom 1px = -∞ dB)
- `SNAP_THRESHOLD_DB = 6` (snap within 6dB)
- `SNAP_THRESHOLD_TIME = 0.05` (snap within 0.05 seconds)

## Important Patterns

### State Management
- **Controlled Components**: TrackCanvas is fully controlled by ClipEnvelopeEditor
- **Ref-Based Drag State**: All drag operations use refs to avoid re-render during drag
- **Cursor Updates**: `updateCursor()` called on mouse move to set hover states and cursor style

### Theme System
- Centralized in `@audacity-ui/tokens` (package) and `clip-envelope/app/theme.ts` (legacy)
- Themes define colors for every visual state (see `Theme` interface)
- Track-specific colors: Blue (track1), Violet (track2), Magenta (track3)

### Canvas Performance
- Waveforms use high sample counts (50,000 samples per second) for solid appearance
- Canvas cleared and redrawn on every state change
- Drawing optimizations: batch operations, avoid unnecessary clears

## Migration Notes

**Current Migration Status:**
- ✅ Monorepo infrastructure setup (pnpm workspaces)
- ✅ `@audacity-ui/core` package created with types
- ✅ `@audacity-ui/tokens` package created with theme
- ✅ Demo moved to `apps/demo/clip-envelope/`
- ⏳ Demo still uses local types/theme (not importing from packages)
- ⏳ No `@audacity-ui/components` or `@audacity-ui/audio-components` yet

**Next Steps (per roadmap):**
1. Extract basic UI components to `@audacity-ui/components`
2. Extract complex audio components to `@audacity-ui/audio-components`
3. Migrate demo to consume packages instead of local files
4. Setup Storybook in `apps/docs/`
5. Publish packages to npm

**When Extracting Components:**
- Prefer controlled component pattern (consumer manages state)
- Export both component and prop types
- Use composition over configuration
- Provide sensible defaults but allow full customization

## Key Files Reference

**Types & Theme:**
- `packages/core/src/types/index.ts` - All TypeScript interfaces
- `packages/tokens/src/index.ts` - Theme definitions
- `apps/demo/clip-envelope/app/components/types.ts` - Legacy types (to be removed)
- `apps/demo/clip-envelope/app/theme.ts` - Legacy theme (to be removed)

**Main Components:**
- `apps/demo/clip-envelope/app/components/ClipEnvelopeEditor.tsx` - State management & events (~1200 lines)
- `apps/demo/clip-envelope/app/components/TrackCanvas.tsx` - Canvas rendering (~1000 lines)

**Documentation:**
- `docs/design-system-architecture.md` - Design system plan
- `docs/automation-overlay-states.md` - 6 automation overlay states
- `docs/clip-styling-states.md` - 10 clip styling states

## Build System

- **Packages**: Use tsup (esbuild-based) for fast TypeScript compilation
  - Outputs: CJS (`dist/index.js`), ESM (`dist/index.mjs`), Types (`dist/index.d.ts`)
  - Config in each `package.json` via `build` script

- **Demo**: Uses Next.js 16 with Turbopack
  - Config: `apps/demo/clip-envelope/next.config.js`
  - Tailwind CSS 4 via `@tailwindcss/postcss`

## Version Control

- Repository renamed from `clip-envelopes-prototype` to `audacity-design-system`
- Default branch: `master`
- Git submodule: `apps/demo/clip-envelope` (separate git repo)
- `.gitignore` excludes: `node_modules/`, `dist/`, `pnpm-lock.yaml`, `.claude/`

## Package Publishing (Future)

Packages will be published under `@audacity-ui/*` scope to npm registry:
- `@audacity-ui/core`
- `@audacity-ui/tokens`
- `@audacity-ui/components`
- `@audacity-ui/audio-components`

Use independent versioning (each package has own version number).
