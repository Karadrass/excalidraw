# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Excalidraw is an open-source virtual hand-drawn style whiteboard application. It's built as a **monorepo** using Yarn workspaces, with a clear separation between the core library (published to npm) and the full-featured web application.

## Project Structure

```
excalidraw/
├── packages/
│   ├── excalidraw/          # Main React component library (@excalidraw/excalidraw)
│   │   ├── index.tsx        # Main entry point for the library
│   │   ├── components/      # UI components (App, Canvas, MainMenu, etc.)
│   │   ├── actions/         # Action handlers (zIndex, selection, etc.)
│   │   ├── data/            # Data management and serialization
│   │   ├── fonts/           # Font definitions (Virgil, Cascadia, etc.)
│   │   └── types.ts         # Core TypeScript types
│   ├── common/              # Shared utilities across packages
│   ├── element/             # Element-specific logic and types
│   ├── math/                # Mathematical utilities
│   └── utils/               # General utility functions
├── excalidraw-app/          # Full-featured app (excalidraw.com)
│   ├── App.tsx              # Main app component
│   ├── collab/              # Real-time collaboration features
│   ├── components/          # App-specific components
│   ├── data/                # App data management
│   └── index.tsx            # App entry point
├── examples/                # Integration examples (NextJS, browser scripts)
└── dev-docs/                # Documentation site (Docusaurus)
```

## Development Commands

### Starting Development
```bash
yarn start                   # Start development server (runs excalidraw-app)
                            # Accessible at http://localhost:3000
```

### Building
```bash
yarn build                   # Build the app for production
yarn build:packages          # Build all packages (common, math, element, excalidraw)
yarn build:app               # Build only the excalidraw-app
```

### Testing
```bash
yarn test                    # Run tests with vitest
yarn test:update             # Run all tests and update snapshots
yarn test:typecheck          # TypeScript type checking
yarn test:code               # Run ESLint
yarn test:coverage           # Generate coverage report
yarn test:ui                 # Run tests with Vitest UI
```

### Code Quality
```bash
yarn fix                     # Auto-fix formatting and linting issues
yarn fix:code                # Fix ESLint issues
yarn fix:other               # Fix Prettier formatting
```

### Package Management
```bash
yarn clean-install           # Clean node_modules and reinstall
yarn rm:build                # Remove all build artifacts
yarn rm:node_modules         # Remove all node_modules
```

## Architecture

### Monorepo System
- **Package Manager**: Yarn 1.22.22 (workspaces enabled)
- **Build Tools**: Vite for the app, esbuild for packages
- **Testing**: Vitest with jsdom environment
- **TypeScript**: Strict mode enabled throughout

### Path Aliases
The project uses TypeScript path aliases for internal imports (defined in \`tsconfig.json\` and \`vitest.config.mts\`):

```typescript
@excalidraw/common      → packages/common/src/
@excalidraw/excalidraw  → packages/excalidraw/
@excalidraw/element     → packages/element/src/
@excalidraw/math        → packages/math/src/
@excalidraw/utils       → packages/utils/src/
```

When adding new features, use these aliases instead of relative paths when importing from other packages.

### State Management
- **Core Library**: Uses Jotai for state management (\`editor-jotai.ts\`)
- **App**: Additional Jotai stores in \`excalidraw-app/app-jotai.ts\`
- State is scoped to prevent conflicts in multi-instance scenarios

### Key Technologies
- **React 19.0.0**: Main UI framework (peer dependency for the library)
- **Vite 5.0.12**: Development server and build tool
- **Vitest 3.x**: Testing framework
- **TypeScript 4.9.4**: Type safety
- **RoughJS**: Hand-drawn style rendering
- **Socket.io**: Real-time collaboration (app only)
- **Firebase**: Backend for collaboration (app only)

### Package Development Workflow

1. **Working on Core Library** (\`packages/excalidraw/\`):
   - Changes are automatically reflected in the dev server
   - Main export is \`packages/excalidraw/index.tsx\`
   - Publishes to npm as \`@excalidraw/excalidraw\`
   - Build with \`yarn build:excalidraw\`

2. **Working on App** (\`excalidraw-app/\`):
   - Add app-specific features here (collaboration, PWA, etc.)
   - Import from \`@excalidraw/excalidraw\` package
   - Build with \`yarn build:app\`

3. **Working on Utility Packages** (\`packages/common|element|math|utils/\`):
   - Shared code used by both library and app
   - Build all packages with \`yarn build:packages\`

### Component Architecture
- **\`packages/excalidraw/components/App.tsx\`**: Core editor component with canvas, toolbar, and event handlers
- **\`excalidraw-app/App.tsx\`**: Wraps the core editor with app-specific features (collaboration, cloud storage)
- **Actions System**: All editor actions are in \`packages/excalidraw/actions/\` with a centralized action manager
- **Element System**: Drawing elements defined in \`packages/element/\` with type definitions and utilities

### Collaboration System (App Only)
- Located in \`excalidraw-app/collab/\`
- Uses Socket.io for real-time communication
- End-to-end encrypted with Firebase backend
- Portal-based architecture for managing collaborative sessions

### Testing Strategy
- **Coverage Thresholds**: 60% lines, 70% branches, 63% functions
- **Test Location**: Tests live alongside source files (\`.test.ts\`, \`.test.tsx\`)
- **Setup**: Configured in \`setupTests.ts\` and \`vitest.config.mts\`
- **Important**: Run \`yarn test:update\` before committing to update snapshots

### Building for Production
```bash
# Full production build
yarn build

# Preview production build locally
yarn build:preview  # Runs build and starts preview server on port 5000
```

### Localization
- Translations managed via Crowdin
- Language detection in \`excalidraw-app/app-language/\`
- Default language: English (\`defaultLang\` in \`packages/excalidraw/i18n.ts\`)

## Common Development Tasks

### Adding a New Feature to the Library
1. Create feature code in \`packages/excalidraw/\`
2. Export from \`packages/excalidraw/index.tsx\` if it's a public API
3. Run \`yarn test:typecheck\` to verify types
4. Run \`yarn test:update\` to ensure tests pass
5. Update documentation if needed

### Adding a New Feature to the App
1. Create feature code in \`excalidraw-app/\`
2. Import from \`@excalidraw/excalidraw\` for editor functionality
3. Test locally with \`yarn start\`
4. Run full test suite with \`yarn test:all\`

### Working with Elements
- Element types defined in \`packages/element/\`
- Element creation/manipulation in \`packages/excalidraw/element/\`
- Use the element API for creating new shapes or modifying existing ones

#### Ruler Tool Implementation
The Ruler tool is a specialized linear element for measuring distances in inches (71 pixels = 1 inch):

**Key Features:**
- Measures distance between two points with automatic conversion (71px = 1")
- Displays measurement as bound text (e.g., `2.9"`) that stays horizontal
- Text automatically updates when ruler is modified
- Text masks the line underneath for better readability
- No midpoint handle shown (unlike lines/arrows) to avoid obscuring the measurement text

**Implementation Details:**
- **Type Definition**: `ExcalidrawRulerElement` in `packages/element/src/types.ts`
- **Type Guards**: `isRulerElement()` and `isLinearElementType()` include "ruler"
- **Rendering**: `packages/element/src/renderElement.ts` handles both inline and bound text rendering
- **Text Binding**: Uses same bound text system as arrows via `actionFinalize.tsx`
- **Text Updates**: Measurement recalculates in `packages/element/src/textElement.ts` (handleBindTextResize)
- **Text Behavior**: Never wraps (stays single line), always horizontal, uses Excalifont
- **UI Hiding**: Midpoint handle hidden in `packages/excalidraw/renderer/interactiveScene.ts`
- **Auto-finalization**: Finalizes after 2nd click in `packages/excalidraw/components/App.tsx`

**Files Modified for Ruler:**
- `packages/element/src/types.ts` - ExcalidrawRulerElement type
- `packages/element/src/typeChecks.ts` - isRulerElement, isLinearElementType
- `packages/element/src/renderElement.ts` - Rendering and masking
- `packages/element/src/textElement.ts` - Measurement calculation and positioning
- `packages/excalidraw/actions/actionFinalize.tsx` - Bound text creation
- `packages/excalidraw/components/App.tsx` - Auto-finalization
- `packages/excalidraw/renderer/interactiveScene.ts` - Hide midpoint handle
- `packages/excalidraw/components/shapes.tsx` - Toolbar icon
- `packages/excalidraw/locales/en.json` - Translations

**Future Enhancement:** When curved rulers are implemented, remove the `if (!isRulerElement(element))` condition in interactiveScene.ts line 532 to re-enable the midpoint handle for curving

#### Custom Rotation Center (Pivot Point) Implementation
The Custom Rotation Center feature allows users to reposition the rotation pivot point of both individual elements and groups, with magnetization to corners and center via Ctrl key.

**Key Features:**
- Draggable rotation center handle displayed as white crosshair at element/group center
- Ctrl+drag snaps to element corners and center (20px threshold)
- Elements/groups rotate and orbit around the custom pivot point
- Works with rotated elements (coordinate transformation applied)
- Fully functional for both individual elements and grouped selections
- Smart corner detection: calculates actual element corners even after rotation

**Implementation Details:**

**Core Architecture:**
- **Single Element Property**: `customRotationCenter?: LocalPoint | null` in `packages/element/src/types.ts`
  - Stored as coordinates relative to element's (x, y) origin
  - Optional to avoid breaking existing element creation code
  - `null` or `undefined` uses default center
- **Group Element Property**: `groupCustomRotationCenter?: LocalPoint | null` in `packages/element/src/types.ts`
  - Stored as offset from group center point [relativeX, relativeY]
  - Applied to all elements in a group
  - Persists across deselection/reselection cycles
- **State Management**:
  - `isDraggingRotationCenter: boolean` in AppState for drag tracking
  - `groupRotationCenter: { x: number; y: number } | null` in AppState for temporary group pivot position

**Handle Detection:**
- **Single Element**: `isPointerOnRotationCenterHandle()` in `packages/element/src/resizeTest.ts` (lines 293-338)
  - Distance-based hit testing with 2x handle size tolerance
  - Accounts for element rotation using `pointRotateRads`
  - Returns true if pointer within handle area
- **Group**: `isPointerOnGroupRotationCenterHandle()` in `packages/element/src/resizeTest.ts` (lines 343-368)
  - Uses group common bounds to determine default center
  - Accepts optional `customRotationCenter` parameter for stored pivot position
  - Distance-based hit testing with 2x handle size tolerance

**Visual Rendering:**
- **Single Element**: `renderRotationCenterHandle()` in `packages/excalidraw/renderer/interactiveScene.ts` (lines 606-663)
  - Renders white filled circle with crosshair (horizontal + vertical lines)
  - Handle size: 8px / zoom, crosshair: 1.5x handle size
  - No manual translation needed (parent context already translated)
  - Called automatically when single element selected (line 1110)
- **Group**: `renderGroupRotationCenterHandle()` in `packages/excalidraw/renderer/interactiveScene.ts` (lines 665-702)
  - Calculates group center using `getCommonBounds()`
  - Uses stored `groupCustomRotationCenter` from element data or temporary state
  - Renders same visual style as single element handle
  - Called automatically when multiple elements selected (line 1221-1227)

**Drag & Drop Logic:**
- **Single Element**: `handleCanvasPointerMove` in `packages/excalidraw/components/App.tsx` (lines 8452-8520)
  - **Coordinate Transformation**:
    1. Unrotate pointer position around element center if element.angle !== 0
    2. Calculate coordinates relative to element origin (x, y)
    3. Store as LocalPoint relative to element
  - **Magnetization**: When Ctrl held, snaps to:
    - 4 corners: (0,0), (width,0), (width,height), (0,height)
    - Center: (width/2, height/2)
    - Threshold: 20 pixels
- **Group**: `handleCanvasPointerMove` in `packages/excalidraw/components/App.tsx` (lines 8602-8659)
  - Updates `groupRotationCenter` in state with pointer coordinates
  - **Smart Corner Magnetization**: When Ctrl held (lines 8607-8642):
    - Calculates actual corners for each element accounting for rotation
    - Uses rotation matrix: [cos(θ) -sin(θ); sin(θ) cos(θ)]
    - Snaps to all element corners + group center
    - Works correctly even after group rotation
  - **Group Drag Tracking**: Pivot follows group during drag (lines 8872-8908)
    - Calculates actual offset by comparing group center before/after drag
    - Accounts for snap/grid/lock-direction adjustments
  - **Persistence**: On pointer up, stores pivot as relative offset in all elements (lines 9432-9471)
- **Cleanup**: `isDraggingRotationCenter` reset to false on pointer up

**Rotation Mechanics:**
- **Single Element**: `rotateSingleElement()` in `packages/element/src/resizeElements.ts` (lines 197-290)
  - **Modified signature**: Added `originalElements` parameter to track initial angle
  - **Behavior**:
    1. Calculate angle based on pointer position relative to custom center (or default)
    2. If `customRotationCenter` defined, element orbits around it:
       - Calculate angle delta from start of rotation
       - Rotate element's center point around custom pivot
       - Update both `angle` and position (`x`, `y`)
    3. Element position updated so it orbits correctly
- **Group**: Rotation center calculation in `packages/excalidraw/components/App.tsx` (lines 7444-7457)
  - Reads `groupCustomRotationCenter` from first element with stored pivot
  - Calculates absolute position by adding relative offset to group center
  - Updates `pointerDownState.resize.center` with custom pivot coordinates
  - Group rotates around custom pivot via standard rotation mechanics
  - **Post-Rotation Update**: Recalculates and saves pivot offset after rotation completes (lines 9452-9471)
    - Ensures pivot stays at correct relative position after bounding box changes

**Coordinate System Notes:**
- **Scene coordinates**: Absolute coordinate system
- **Element coordinates**: Relative to element's top-left (x, y)
- **Viewport coordinates**: Account for scrollX/scrollY and zoom
- **Key Pattern**: For rotated elements, apply inverse rotation to convert pointer coords to element space

**Files Modified:**
- `packages/element/src/types.ts` - Added `customRotationCenter` and `groupCustomRotationCenter` properties (line 88)
- `packages/element/src/resizeTest.ts` - Handle detection functions for single and group (lines 293-368)
- `packages/element/src/resizeElements.ts` - Rotation logic with custom center for single elements
- `packages/excalidraw/types.ts` - Added `isDraggingRotationCenter` state and `groupRotationCenter` (lines 238, 354)
- `packages/excalidraw/appState.ts` - State initialization and observability configuration (lines 79, 208)
- `packages/excalidraw/components/App.tsx` - Extensive modifications:
  - Pointer down detection for groups (lines 7360-7399)
  - Rotation center calculation for groups (lines 7444-7457)
  - Group pivot drag handling with smart snap (lines 8602-8659)
  - Group drag tracking (lines 8872-8908)
  - Pivot persistence and post-rotation update (lines 9432-9471)
- `packages/excalidraw/renderer/interactiveScene.ts` - Visual rendering for single and group (lines 606-702, 1221-1227)

**Technical Implementation Notes:**
- **Relative Coordinates**: Group pivot stored relative to group center for stability during transformations
- **Rotation Matrix**: Smart snap uses proper trigonometric rotation for accurate corner detection
- **State Synchronization**: Temporary `groupRotationCenter` in AppState, persistent `groupCustomRotationCenter` in element data
- **Bounding Box Handling**: Post-rotation recalculation accounts for bounding box changes after rotation
- **Scene Updates**: Explicit `this.scene.triggerUpdate()` calls ensure UI refreshes during drag operations

### Debugging
- Enable source maps in browser DevTools
- Use \`debug.ts\` utilities in both app and library
- Vitest UI available with \`yarn test:ui\` for interactive debugging

## Important Notes

- **Node Version**: 18.0.0 - 22.x.x required
- **React Version**: The library requires React ^17.0.2 || ^18.2.0 || ^19.0.0 as a peer dependency
- **Strict TypeScript**: All code must pass strict type checking
- **Pre-commit Hooks**: Husky configured to run linting and formatting before commits
- **Browser Support**: Modern browsers only (see \`browserslist\` in package.json files)
