# Templify — Claude Agent Rules

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling**: Tailwind CSS 4 + CSS variables from `globals.css` (see Styling Rules below)
- **UI Libraries**: Radix UI, shadcn/ui, Lucide React (landing only)
- **Export**: Canvas 2D API, jsPDF (loaded via CDN script), JSZip (loaded via CDN script)
- **Icons**: Custom inline SVGs via `components/Icons.tsx` — no emoji, no icon libraries in the editor

## Architecture

```
app/
  layout.tsx                      # Root layout — Geist fonts, metadata, html/body wrapper
  page.tsx                        # Landing page
  sandbox/
    page.tsx                      # Main editor — state, handlers, layout, sidebar panels
    types/
      index.ts                    # CanvasObject, ImageObject, TextField, CanvasSize, etc.
      constants.ts                # Defaults, presets, sheet sizes, Google Fonts list
    hooks/
      useUndoRedo.ts              # Generic undo/redo hook (25-step history)
      useDragResize.ts            # Mouse handlers for drag + resize on canvas objects
    components/
      CanvasObjects.tsx           # ImageEl, TextEl — rendered on the canvas
      SelectionHandles.tsx        # Resize handles around selected objects
      Controls.tsx                # ZoomControls, FloatingPageNav, KbdHint
      LayerItem.tsx               # Layer list item + DimensionInputs
      DataPanel.tsx               # DataImagesPanel, DataImageInfo
      StylePanels.tsx             # ShadowPanel, BorderPanel, ToggleSwitch
      FontPicker.tsx              # Google Fonts dropdown with search + categories
      ImpositionModal.tsx         # Print imposition modal (GA layout + export)
      TemplateThumbnail.tsx       # CSS-transform preview of a single card
    utils/
      data.ts                     # Spreadsheet parsing, image column detection, data image resolution
      rendering.ts                # shrinkFontSize, textShadowCSS, shadowCSS, loadScript, downloadBlob
      export.ts                   # renderSingleCard (Canvas 2D), renderImpositionSheet, exportRecords
    lib/
      impositionGA.ts             # Genetic algorithm for print imposition layout optimization
components/
  Icons.tsx                       # All SVG icons (shared across landing + editor)
  EditorPreview.tsx               # Landing page editor preview component
  RLabel.tsx                      # Reusable uppercase muted section label (8px, editor panels)
  PanelSection.tsx                # Labeled panel section wrapper with optional bottom border
  ui/
    button.tsx                    # shadcn/ui button (landing page only)
lib/
  utils.ts                        # cn() utility — clsx + tailwind-merge (landing page only)
```

Key patterns:
- `sandbox/page.tsx` holds all editor state — objects, canvas size, selection, undo/redo via `useUndoRedo`
- Canvas objects use delta-based drag (`dx, dy`) for multi-selection movement
- `remapObjects()` proportionally rescales all objects when canvas size changes
- Export uses Canvas 2D API (not html2canvas) for cross-origin safety
- `TemplateThumbnail` renders at full canvas size then CSS `transform: scale()` for pixel-accurate previews

## Package Manager

Always use **bun** instead of npm, yarn, or pnpm for all commands:
- `bun install` (not npm install)
- `bun run dev` (not npm run dev)
- `bun add <pkg>` (not npm install <pkg>)
- `bun remove <pkg>` (not npm uninstall <pkg>)

## No Emojis

Never use emoji characters anywhere in the codebase — not in JSX, string literals, comments, labels, or button text. Always use SVG icons from `@/components/Icons` (mapped to `components/Icons.tsx`). If a needed icon doesn't exist, add it to that file following the existing `svg()` / `multiPath()` pattern.

## Styling Rules

### Use globals.css theme variables — no hardcoded colors

All colors must come from the CSS variables defined in `globals.css`. Use Tailwind utility classes that reference these variables:

- **App theme** (editor/sandbox): `bg-app-bg`, `bg-app-bg-deep`, `bg-app-panel`, `bg-app-canvas`, `text-app-text`, `text-app-accent`, `text-app-accent-blue`, `text-app-warn`, `text-app-success`, `text-app-danger`
- **shadcn theme** (general UI): `bg-background`, `bg-card`, `bg-popover`, `bg-muted`, `bg-accent`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, etc.

Never hardcode hex colors like `#0a0a10`, `#f0ede8`, or `#e8ff47` directly. Always use the corresponding Tailwind class that maps to the CSS variable.

### Tailwind CSS for static styles, inline styles only for dynamic values

- Use **Tailwind CSS classes** for all static/structural styling: layout, spacing, colors, typography, borders, border-radius, shadows, etc.
- Use **inline `style={{}}`** only when a value is computed at runtime or driven by state (e.g., `left: obj.x`, `width: zoom * 100 + '%'`, `opacity: isActive ? 1 : 0.5`).
- If a style is always the same regardless of state, it belongs in a Tailwind class, not an inline style.

### Always use shadcn/ui components

Use shadcn/ui components (`components/ui/*`) for all standard UI elements: buttons, inputs, popovers, dialogs, selects, command palettes, etc. Do not build custom versions of components that shadcn already provides. Extend existing shadcn components when needed (e.g., adding a `container` prop to `PopoverContent`) rather than replacing them.

### Consistent border radius and padding

- **Small interactive elements** (buttons, inputs, badges, kbd hints): `rounded-md`
- **Cards, panels, floating containers**: `rounded-lg`
- **Modals**: `rounded-lg` or `rounded-xl`
- **Button/input padding**: use consistent `px-2.5 py-1.5` for small controls, `px-3.5 py-2` for standard controls
- **Panel padding**: `p-3` to `p-4` for section content

Keep these consistent across all components — do not mix arbitrary pixel values like `rounded-[6px]` or `padding: "5px 8px"` when a Tailwind utility exists.

### Follow App Theming

All UI additions must match the existing design language:

- **Accent**: `app-accent` (`#e8ff47`, yellow-green) for primary actions, highlights, and selected states
- **Secondary accent**: `app-accent-blue` (`#63b3ed`) for data/photo-related UI
- **Font sizes**: 8–11px for labels/controls, monospace for values, uppercase + letter-spacing for section labels
- **Backdrop blur**: `backdrop-blur-md` on floating panels
- **Shadows**: `shadow-lg` or `shadow-xl` on floating UI

Do not introduce new colors, font families, or design patterns without explicit approval.
