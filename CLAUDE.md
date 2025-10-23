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
