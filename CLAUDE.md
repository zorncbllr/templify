# Templify — Claude Agent Rules

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling**: Tailwind CSS 4 (landing page), inline styles (sandbox editor)
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

## No Emojis

Never use emoji characters anywhere in the codebase — not in JSX, string literals, comments, labels, or button text. Always use SVG icons from `@/components/Icons` (mapped to `components/Icons.tsx`). If a needed icon doesn't exist, add it to that file following the existing `svg()` / `multiPath()` pattern.

## Follow App Theming

All UI additions must match the existing design language:

- **Dark theme**: background `#0a0a10`, text `#f0ede8`, muted text `rgba(240,237,232,0.X)`
- **Accent**: `#e8ff47` (yellow-green) for primary actions, highlights, and selected states
- **Secondary accent**: `#63b3ed` (blue) for data/photo-related UI
- **Surfaces**: `rgba(255,255,255,0.02–0.06)` backgrounds, `rgba(255,255,255,0.05–0.1)` borders
- **Border radius**: 6–9px for small elements, 10–16px for cards/modals
- **Font sizes**: 8–11px for labels/controls, monospace for values, uppercase + letter-spacing for section labels
- **Backdrop blur**: `blur(16px)` on floating panels
- **Shadows**: `0 8px 32px rgba(0,0,0,0.6)` on floating UI

Do not introduce new colors, font families, or design patterns without explicit approval.
