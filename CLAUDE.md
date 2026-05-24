# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript 5
- **Auth + DB**: Supabase (SSR cookies via `@supabase/ssr`); migrations in `supabase/migrations/`
- **Storage**: Cloudflare R2 (S3-compatible, `@aws-sdk/client-s3`) for user-uploaded "data images"
- **Payments**: PayMongo (PH: GCash, Maya, QRPH, card) — the active router (`lib/payments/router.ts`) uses PayMongo as the payment gateway service.
- **Styling**: Tailwind CSS 4 + CSS variables from `app/globals.css` (see Styling Rules)
- **UI Libraries**: Radix UI + shadcn/ui (general UI), Lucide React (landing only)
- **Export**: Canvas 2D API, jsPDF + JSZip (loaded via CDN script at runtime, not bundled)
- **Icons**: Custom inline SVGs via `components/Icons.tsx` — no emoji, no icon libraries inside the editor

## Commands

Always use **bun** — never npm/yarn/pnpm:

- `bun install` — install deps
- `bun run dev` — start Next.js dev server on :3000
- `bun run build` — production build
- `bun run start` — run the built app
- `bun run lint` — ESLint (uses flat config in `eslint.config.mjs` extending `eslint-config-next` core-web-vitals + typescript)
- `bun add <pkg>` / `bun remove <pkg>`

There is no test framework wired up; do not invent test commands.

## Environment

`.env.local` (copy from `.env.local.example`) must define:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`
- R2: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `NEXT_PUBLIC_R2_CDN_URL` (these are *not* in the example file but are referenced by `app/api/r2/*` — check `.env` if adding storage features)
- `NEXT_PUBLIC_APP_URL` (used by payment redirects and OAuth callback)
- `CRON_SECRET` for `/api/cron/check-plans`

## High-Level Architecture

### Route groups

The app uses Next.js route groups to keep three distinct surfaces in one project:

- `app/(marketing)/` — `pricing` (and the root `app/page.tsx` landing page)
- `app/(auth)/login/` + `app/auth/callback/` — Google OAuth flow via Supabase
- `app/(dashboard)/` — authenticated app: `dashboard`, `projects/[id]/edit`, `settings`, `payment-success`. Shares a layout (`app/(dashboard)/layout.tsx`) that renders the top nav with plan badge.
- `app/sandbox/` — **unauthenticated free-tier editor** (limits from `PLAN_LIMITS.free`). The same `Editor` component is reused inside the authenticated `projects/[id]/edit` flow.

### Middleware lives in `proxy.ts`, not `middleware.ts`

This project exports the middleware as `proxy` from `/proxy.ts`. It:
1. Refreshes the Supabase SSR session on every matched request.
2. Redirects unauthenticated users away from `PROTECTED_PATHS` (`/dashboard`, `/projects`, `/settings`, `/payment-success`) to `/login`, and authenticated users away from `/login` to `/dashboard`.
3. Sets a `locale` cookie (`ph` or `intl`) on first visit using the `x-vercel-ip-country` header, and writes it to `profiles.locale` for logged-in users.

If you need new auth-gated routes, **add the prefix to `PROTECTED_PATHS` in `proxy.ts`**.

### Supabase clients — three flavors, pick the right one

- `lib/supabase/client.ts` — browser client, use in Client Components / `"use client"` files
- `lib/supabase/server.ts` — RSC/Server Action client (reads cookies via `next/headers`)
- `lib/supabase/middleware.ts` — used only by `proxy.ts`
- `lib/supabase/admin.ts` — service-role client for trusted server-side operations (webhooks, cron)

### Editor — shared between `/sandbox` and `/projects/[id]/edit`

The editor state machine is **`app/sandbox/components/Editor.tsx`** (not `sandbox/page.tsx`). It holds `objects`, `canvasSize`, selection, and unified undo/redo (`useUndoRedo`, 25-step history of `{ objects, canvasSize }` so both restore together).

Two entry points wrap it:
- `app/sandbox/page.tsx` — passes free-tier limits, no persistence (anonymous use)
- `app/(dashboard)/projects/[id]/edit/ProjectEditor.tsx` — loads `project` row from Supabase, loads R2 data images via `lib/storage/data-images.ts`, passes `userPlan`/`userId` for persistence and storage tracking

When changing editor behavior, the change applies to **both** entry points — don't fork.

Key editor patterns:
- Canvas objects use delta-based drag (`dx, dy`) for multi-selection movement
- `remapObjects()` proportionally rescales all non-background objects when canvas size changes
- Export uses Canvas 2D API (not html2canvas) for cross-origin safety
- `TemplateThumbnail` renders at full canvas size then CSS `transform: scale()` for pixel-accurate previews

### Plans, limits, locale-aware pricing

- `lib/config/pricing.ts` is the single source of truth. `PRICING[plan][locale]` returns `{ amount, currency, display, period }`. `PLAN_LIMITS[tier]` defines `maxProjects`, `maxRows`, `maxPhotoColumns`, `storageBytes`.
- Tier is derived from the DB `plan` column: `biz_*` → business, `pro_*` → pro, else free. Always use `getPlanTier(plan)` / `getPlanLimits(plan)` — don't reimplement the prefix check.
- `lib/payments/router.ts` is the entry point for starting checkout. It reads `locale` (from the cookie set by `proxy.ts`) to decide payment methods.

### Cloudflare R2 — "data images"

User-uploaded images that fill `{photo}`-style placeholders are stored in R2 under `bulk-images/{userId}/{projectId}/{filename}`. The client never talks to R2 directly — it goes through `app/api/r2/{upload,list,delete,proxy}/route.ts`. Use the helpers in `lib/storage/data-images.ts` (`uploadDataImages`, `loadDataImages`, `deleteProjectDataImages`) rather than building new fetch calls.

### Database

Schema is in `supabase/migrations/` (apply in numeric order). Core tables:
- `profiles` — one row per auth user, holds `plan`, `plan_expires_at`, `storage_used` (bytes), `locale`, gateway IDs
- `projects` — `objects` (jsonb of `CanvasObject[]`), `canvas_width/height`, `columns`, `data_rows`, `data_images_label`, `data_file_name`, `paper_size`, `row_count`, `thumbnail`
- `payments` — audit log

Types live in `lib/types/database.ts`.

### Cron

`vercel.json` schedules `/api/cron/check-plans` daily at 00:00 UTC. It downgrades expired paid plans — must be guarded by `CRON_SECRET`.

## Styling Rules

### Use globals.css theme variables — no hardcoded colors

All colors come from CSS variables in `app/globals.css`. Use Tailwind utility classes that reference them:

- **App theme** (editor/sandbox/dashboard): `bg-app-bg`, `bg-app-bg-deep`, `bg-app-panel`, `bg-app-canvas`, `text-app-text`, `text-app-accent`, `text-app-accent-blue`, `text-app-warn`, `text-app-success`, `text-app-danger`
- **shadcn theme** (general UI): `bg-background`, `bg-card`, `bg-popover`, `bg-muted`, `bg-accent`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, etc.

Never hardcode hex colors like `#0a0a10`, `#f0ede8`, or `#e8ff47` directly — use the Tailwind class that maps to the CSS variable.

### Tailwind for static styles, inline `style={{}}` only for dynamic values

- **Tailwind classes** for all static/structural styling: layout, spacing, colors, typography, borders, radius, shadows.
- **Inline `style={{}}`** only when a value is computed at runtime or driven by state (e.g., `left: obj.x`, `width: zoom * 100 + '%'`, `opacity: isActive ? 1 : 0.5`).
- If a style is always the same regardless of state, it belongs in a Tailwind class.

### Always use shadcn/ui components

Use shadcn/ui components (`components/ui/*`: `button`, `command`, `dialog`, `dropdown-menu`, `popover`, `select`) for all standard UI primitives. Do not build custom versions of components shadcn already provides. Extend existing ones (e.g., adding a `container` prop to `PopoverContent`) rather than replacing them.

### Consistent border radius and padding

- **Small interactive elements** (buttons, inputs, badges, kbd hints): `rounded-md`
- **Cards, panels, floating containers**: `rounded-lg`
- **Modals**: `rounded-lg` or `rounded-xl`
- **Button/input padding**: `px-2.5 py-1.5` for small controls, `px-3.5 py-2` for standard controls
- **Panel padding**: `p-3` to `p-4` for section content

Do not mix arbitrary pixel values like `rounded-[6px]` or `padding: "5px 8px"` when a Tailwind utility exists.

### Follow app theming

- **Accent**: `app-accent` (`#e8ff47`, yellow-green) for primary actions, highlights, selected states
- **Secondary accent**: `app-accent-blue` (`#63b3ed`) for data/photo-related UI
- **Font sizes**: 8–11px for labels/controls, monospace for values, uppercase + letter-spacing for section labels
- **Backdrop blur**: `backdrop-blur-md` on floating panels
- **Shadows**: `shadow-lg` or `shadow-xl` on floating UI

Do not introduce new colors, font families, or design patterns without explicit approval.

## No Emojis

Never use emoji characters anywhere in the codebase — JSX, string literals, comments, labels, or button text. Always use SVG icons from `@/components/Icons` (`components/Icons.tsx`). If a needed icon doesn't exist, add it there following the existing `svg()` / `multiPath()` pattern. `lucide-react` is allowed on the landing page only.
