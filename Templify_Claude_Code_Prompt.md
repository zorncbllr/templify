# Templify — Add Auth, Database, Payments & Subscription System

You are adding authentication, a database layer, payment processing, and subscription management to an existing Next.js SaaS application called Templify. The editor and export engine already work. Your job is to wire up the backend infrastructure without breaking anything that exists.

Read the CLAUDE.md file in the project root before making any changes — it describes the full current architecture, theming rules, and code patterns you must follow.

---

## Context: What Templify Is

Templify is a web-based SaaS tool that lets users upload a design template (image) and an Excel/CSV file, map data columns to template elements, and export hundreds of print-ready designs in one click — with built-in print imposition to minimize paper waste.

The editor at `/sandbox` is fully functional. Users can upload templates, map Excel columns, style text fields, and export PDFs. What's missing is: user accounts, saved projects, subscription gating (free vs Pro), and payment processing.

---

## What to Build (in this order)

### Phase 1: Supabase Setup & Auth
### Phase 1.5: Extract Editor into Reusable Component
### Phase 2: Database Schema & Project Persistence
### Phase 3: Free Tier Limits (25 rows, 3 projects, watermark)
### Phase 4: Payment Integration (PayMongo + Stripe)
### Phase 5: Subscription Management & Webhooks
### Phase 6: Pricing Page & Upgrade Flow

---

## Tech Stack Additions (do not change existing stack)

Add these to the existing Next.js 16 / React 19 / TypeScript 5 / Tailwind 4 project:

- **@supabase/supabase-js** — Supabase client
- **@supabase/ssr** — Server-side auth with cookie-based sessions
- **stripe** — Stripe Node.js SDK (server-side only)
- ~~**pdf-lib**~~ — **Not needed.** Watermark is applied client-side via Canvas 2D (see Phase 3.3). Remove from consideration.

Do NOT add: Clerk, NextAuth/Auth.js, Prisma, Drizzle, or any ORM. We use Supabase client directly. Do NOT add any UI component libraries beyond what's already in the project (Radix UI, shadcn/ui are already there for the landing page).

---

## Phase 1: Supabase Setup & Auth

### 1.0 Supabase dashboard configuration (manual, before writing any code)

These settings MUST be configured in the Supabase dashboard before auth will work:

1. **Authentication → Providers → Google:** Enable Google provider. Add your Google OAuth client ID and client secret (from Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID).
2. **Authentication → URL Configuration:**
   - Site URL: `http://localhost:3000` (change to production URL before deploying)
   - Redirect URLs: add `http://localhost:3000/auth/callback` (and the production equivalent). **Do NOT use wildcard redirects** (`*`) — this allows attackers to redirect the OAuth flow to their own domain and steal the authorization code.
3. **Google Cloud Console → OAuth consent screen:**
   - Add authorized redirect URI: `https://{SUPABASE_PROJECT_REF}.supabase.co/auth/v1/callback` (Supabase handles the first leg of OAuth, then redirects to your `/auth/callback`)
   - Set authorized JavaScript origins to your app's domain(s)

### 1.1 Install dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 1.2 Environment variables

Create/update `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<from Supabase dashboard>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard — NEVER expose to client>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 1.3 Create Supabase client utilities

Create `lib/supabase/` with four files:

**lib/supabase/client.ts** — Browser client for client components:
- Use `createBrowserClient` from `@supabase/ssr`
- Params: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**lib/supabase/server.ts** — Server component client (read-only cookies):
- Use `createServerClient` from `@supabase/ssr`
- Access cookies via `cookies()` from `next/headers` (await it — Next.js 16 makes cookies() async)
- Cookie methods: `getAll()` for get, `set()` wrapped in try/catch (server components can't set cookies, but middleware can)

**lib/supabase/middleware.ts** — Middleware client (read/write cookies):
- Use `createServerClient` from `@supabase/ssr`
- Cookie methods read from `request.cookies` and write to both `request.cookies` and `response.cookies`
- Returns `{ supabase, response }`

**lib/supabase/admin.ts** — Service role client for webhook handlers:
- Use `createClient` from `@supabase/supabase-js` (NOT ssr)
- Params: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- This bypasses RLS — use ONLY in API routes that handle webhooks
- NEVER import this file from any client component or server component

### 1.4 Auth middleware

Create `middleware.ts` at project root:

```typescript
// Protected paths — require auth:
// /dashboard, /dashboard/*, /projects, /projects/*, /settings, /payment-success

// Public paths — always accessible:
// /, /sandbox, /login, /pricing, /auth/callback, /api/*

// Logic:
// 1. Create middleware supabase client (lib/supabase/middleware.ts)
// 2. Call supabase.auth.getUser() to refresh the session
// 3. If no user and path is protected → redirect to /login
// 4. If user exists and path is /login → redirect to /dashboard
// 5. Locale detection: read the x-vercel-ip-country header. If country === 'PH',
//    set a 'locale' cookie to 'ph', else 'intl'. This cookie is readable by
//    server components (for the pricing page) and client components.
//    Only set the cookie if it doesn't already exist (don't override user's manual choice).
// 6. Return the response (with updated cookies)

// Export config.matcher to exclude static files, images, favicon:
// matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
```

### 1.5 Auth page

Create `app/(auth)/login/page.tsx`. There is NO separate signup page — Google OAuth handles both new and returning users automatically.

**IMPORTANT: This page must match the existing app theme from CLAUDE.md:**
- Dark background `#0a0a10`, text `#f0ede8`
- Accent `#e8ff47` for primary buttons
- Surface backgrounds `rgba(255,255,255,0.04)`, borders `rgba(255,255,255,0.08)`
- Border radius 10-12px for form cards
- Use existing shadcn/ui components where available (Button)
- Use SVG icons from `@/components/Icons` — NO emoji

**Login page features:**
- "Continue with Google" button (single prominent button — this is the only auth method)
- Brief tagline or Templify logo above the button
- Link to / (back to landing)
- That's it. No email field, no password field, no magic link, no Facebook, no signup link.

**OAuth callback route** at `app/auth/callback/route.ts` (NOT inside a route group — the URL must be `/auth/callback`):
- Extract `code` from URL search params
- If `code` is missing or empty, redirect to `/login` with an error parameter — do NOT render an error page that leaks internal state
- Call `supabase.auth.exchangeCodeForSession(code)` — this completes the PKCE flow (Supabase uses PKCE by default for OAuth, which prevents authorization code interception attacks)
- On success, redirect to `/dashboard`
- On failure (invalid/expired code), redirect to `/login?error=auth_failed`
- **IMPORTANT:** Never redirect to a user-supplied URL from the callback. The redirect destination is hardcoded to `/dashboard`. If you add a `redirectTo` parameter later, validate it against an allowlist of internal paths (must start with `/`, must not start with `//` or contain `://`)
- **IMPORTANT:** Configure the allowed redirect URLs in the Supabase dashboard (Authentication → URL Configuration → Redirect URLs). Add only `{APP_URL}/auth/callback`. This prevents attackers from registering their own callback URL to steal authorization codes.

### 1.6 Auth utility

Create `lib/auth/actions.ts` with:
- `signInWithGoogle()` — calls `supabase.auth.signInWithOAuth({ provider: 'google' })` with redirect to `/auth/callback`
- `signOut()` — calls `supabase.auth.signOut()`, redirect to `/`

That's it. No other auth methods.

---

## Phase 1.5: Extract Editor into Reusable Component

The existing `app/sandbox/page.tsx` is a 2828-line `"use client"` file containing all editor state, handlers, and JSX. It cannot receive props or be reused. Before adding persistence, extract the editor into a component.

### 1.5.1 What moves and what stays

The file contains:
- **`EditorState` interface + `remapObjects()` helper** (lines ~42–104) — move to `Editor.tsx`
- **`SLabel` component + `TEXT_COLORS` constant** (lines ~106–132) — move to `Editor.tsx`
- **`TemplifyEditor` function** (line 134 to EOF, ~2700 lines) — this IS the editor: all `useState`, `useRef`, `useMemo`, `useCallback`, `useEffect`, keyboard handlers, image drop handlers, data file handlers, and all JSX. Move the entire function body into the new `Editor` component.
- **Imports** — all 12 import lines move to `Editor.tsx`. The new `sandbox/page.tsx` only imports `Editor`.

**Critical detail:** Only `page.tsx` has `"use client"`. None of the child components (`CanvasObjects.tsx`, `LayerItem.tsx`, etc.) declare it — they inherit it from the page. `Editor.tsx` MUST have `"use client"` at the top since it uses hooks, `document`, `window`, and event listeners.

### 1.5.2 Create the Editor component

Create `app/sandbox/components/Editor.tsx`:

```typescript
"use client";

// All 12 imports from the current page.tsx move here
// (react, types, constants, utils, components, hooks, icons)

interface EditorProps {
  initialObjects?: CanvasObject[];
  initialCanvasSize?: CanvasSize;
  initialColumns?: string[];
  initialRows?: RowData[];
  initialDataFileName?: string | null;
  initialDataImagesLabel?: string | null;
  initialDataImages?: DataImageMap;
  watermark?: boolean;
  onSave?: (state: { objects: CanvasObject[]; canvasSize: CanvasSize }) => void;
  projectId?: string | null; // null = sandbox mode (no persistence)
  user?: { plan: string } | null; // null = public demo (sandbox)
}
```

**Wiring `initialXxx` props to state:**
- Pass `initialObjects` and `initialCanvasSize` to `useUndoRedo<EditorState>()` as the `init` argument (replacing hardcoded `{ objects: [], canvasSize: { width: 960, height: 540 } }`)
- Initialize `columns` state with `initialColumns ?? []`
- Initialize `rows` state with `initialRows ?? []`
- Initialize `dataFileName` state with `initialDataFileName ?? null`
- Initialize `dataImagesLabel` state with `initialDataImagesLabel ?? null`
- Initialize `dataImages` state with `initialDataImages ?? {}`
- Recalculate `nextZ.current` from `initialObjects`: `Math.max(100, ...initialObjects.map(o => o.zIndex)) + 1`

**Wiring `onSave`:**
- Add a `useEffect` that watches `editorState` (the `useUndoRedo` present value). When it changes and `onSave` is provided, call `onSave(editorState)` through an 800ms debounce (use a `useRef` for the timeout ID). Skip the first render (don't save the initial load as a change).

**Wiring `watermark`:**
- Pass `watermark` prop (default `true`) through to `exportRecords` calls. This requires modifying the export functions — see Phase 3.3.

**Wiring `user`:**
- When `user` is non-null and `user.plan === 'free'`, enforce the 25-row limit after spreadsheet parsing. When `user` is null (sandbox mode), no limits.

### 1.5.3 Simplify sandbox/page.tsx

Replace `app/sandbox/page.tsx` with:

```typescript
import Editor from './components/Editor';

export default function SandboxPage() {
  return <Editor />;
}
```

No `"use client"` needed here — `Editor.tsx` handles that itself.

### 1.5.4 Verification

After this refactor, `/sandbox` must work identically to before — same state management, same drag/resize, same export, same keyboard shortcuts. This is a pure extraction with no logic changes. All 12 child component imports (`CanvasObjects`, `LayerItem`, `Controls`, `StylePanels`, `ImpositionModal`, `FontPicker`, `DataPanel`, `SelectionHandles`) continue to work unchanged since they don't import from `page.tsx`.

---

## Phase 2: Database Schema & Project Persistence

### 2.1 Database TypeScript types

Create `lib/types/database.ts` with types matching the database schema. These are used across server components, API routes, and client components:

```typescript
export type Plan = 'free' | 'pro_monthly' | 'pro_quarterly' | 'pro_annual';
export type Locale = 'ph' | 'intl';
export type PaymentGateway = 'paymongo' | 'stripe';
export type PaymentStatus = 'succeeded' | 'failed' | 'refunded';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: Plan;
  plan_expires_at: string | null; // ISO 8601
  payment_gateway: PaymentGateway | null;
  gateway_customer_id: string | null;
  gateway_subscription_id: string | null;
  locale: Locale;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  name: string;
  objects: import('@/app/sandbox/types').CanvasObject[];
  canvas_width: number;
  canvas_height: number;
  columns: string[];
  data_images_label: string | null;
  data_file_path: string | null;
  paper_size: string;
  row_count: number;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  user_id: string;
  gateway: PaymentGateway;
  gateway_payment_id: string;
  gateway_subscription_id: string | null;
  amount: number;
  currency: 'PHP' | 'USD';
  plan: Exclude<Plan, 'free'>;
  status: PaymentStatus;
  metadata: Record<string, unknown> | null;
  created_at: string;
};
```

### 2.2 SQL migrations

Create `supabase/migrations/001_initial_schema.sql` with the full schema.

**profiles table:**

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro_monthly', 'pro_quarterly', 'pro_annual')),
  plan_expires_at timestamptz,
  payment_gateway text check (payment_gateway in ('paymongo', 'stripe')),
  gateway_customer_id text,
  gateway_subscription_id text,
  locale text not null default 'ph' check (locale in ('ph', 'intl')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger: auto-create profile when user signs up (populates name + avatar from Google OAuth metadata)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- RLS
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

-- Users can update their own profile, but cannot change payment-related fields.
-- Payment fields (plan, plan_expires_at, payment_gateway, gateway_*) are only
-- modified by the admin client in webhook/cron handlers.
-- Use a column-level grant approach: grant UPDATE on specific safe columns only.
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url, locale) on public.profiles to authenticated;

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
```

**projects table:**

The `objects` column stores the full `CanvasObject[]` array (both `ImageObject` and `TextField` entries with all nested styling — Shadow, Border, fonts, opacity, etc.). This is the single source of truth for the template design.

**JSONB safety constraints:**
- Add a CHECK constraint to limit `objects` size: `check (pg_column_size(objects) < 1048576)` (1 MB max). A typical project with 50 objects is ~50 KB. 1 MB is generous but prevents abuse.
- **Server-side validation in the auto-save path:** The `ProjectEditor.tsx` `onSave` callback writes to Supabase via the browser client. Since the browser client uses RLS (not admin), the CHECK constraint enforces the size limit. But additionally, validate the shape of `objects` before saving — ensure each item has `kind`, `id`, `x`, `y`, `width`, `height`, `zIndex` at minimum. This prevents storing arbitrary JSON.
- **`ImageObject.src` URL validation:** When saving, verify that every `ImageObject.src` is either a data URL (`data:image/`) or a URL on your Supabase Storage domain (`{SUPABASE_URL}/storage/v1/object/public/templates/`). Reject arbitrary external URLs. This prevents the project from being used as an open redirect or tracking pixel injector — if someone loads a project with `src: "https://evil.com/track.png"`, the browser makes a request to that server.

Spreadsheet data (`rows`) and resolved data images (`dataImages`) are NOT stored in the database — they are too large. Instead, the spreadsheet file is stored in Supabase Storage and re-parsed on project load. Data images are re-resolved from the parsed spreadsheet data at load time.

```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Untitled Project',
  objects jsonb not null default '[]'::jsonb check (pg_column_size(objects) < 1048576),
  canvas_width integer not null default 960 check (canvas_width between 1 and 10000),
  canvas_height integer not null default 540 check (canvas_height between 1 and 10000),
  columns jsonb default '[]'::jsonb check (pg_column_size(columns) < 65536),
  data_images_label text,
  data_file_path text,
  paper_size text not null default 'a4',
  row_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.update_updated_at();

alter table public.projects enable row level security;

create policy "Users can read own projects"
  on public.projects for select using (auth.uid() = user_id);

create policy "Users can insert projects (free: max 3)"
  on public.projects for insert with check (
    auth.uid() = user_id and (
      (select plan from public.profiles where id = auth.uid()) != 'free'
      or (select count(*) from public.projects where user_id = auth.uid()) < 3
    )
  );

create policy "Users can update own projects"
  on public.projects for update using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete using (auth.uid() = user_id);
```

**No exports table.** Exports are 100% client-side (Canvas 2D → jsPDF/JSZip in the browser). There is no server-side export pipeline, so no database tracking is needed. If server-side export is added in the future, add this table then.

**payments table:**

```sql
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  gateway text not null check (gateway in ('paymongo', 'stripe')),
  gateway_payment_id text not null unique,
  gateway_subscription_id text,
  amount integer not null,
  currency text not null check (currency in ('PHP', 'USD')),
  plan text not null check (plan in ('pro_monthly', 'pro_quarterly', 'pro_annual')),
  status text not null check (status in ('succeeded', 'failed', 'refunded')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "Users can read own payments"
  on public.payments for select using (auth.uid() = user_id);
```

### 2.3 Supabase Storage buckets

Create these storage buckets via SQL migration (add to `001_initial_schema.sql`):

```sql
-- Storage buckets
insert into storage.buckets (id, name, public) values ('templates', 'templates', true);
insert into storage.buckets (id, name, public) values ('data-files', 'data-files', false);

-- Templates bucket: public read (images render on canvas), authenticated upload/delete in own folder
create policy "Anyone can read templates"
  on storage.objects for select using (bucket_id = 'templates');

create policy "Users can upload templates to own folder"
  on storage.objects for insert with check (
    bucket_id = 'templates' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own templates"
  on storage.objects for delete using (
    bucket_id = 'templates' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Data files bucket: private (only owner can read/write)
create policy "Users can read own data files"
  on storage.objects for select using (
    bucket_id = 'data-files' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload data files to own folder"
  on storage.objects for insert with check (
    bucket_id = 'data-files' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own data files"
  on storage.objects for delete using (
    bucket_id = 'data-files' and auth.uid()::text = (storage.foldername(name))[1]
  );
```

- `templates` bucket is **public** (`public: true`) — template images need to be loadable by the Canvas 2D renderer without auth headers (the `loadImage()` function in `export.ts` uses `new Image()` which can't attach auth). The path `{user_id}/{project_id}/{filename}` still provides ownership scoping for uploads/deletes.
- `data-files` bucket is **private** — data files may contain sensitive spreadsheet data. Downloaded via signed URLs or the authenticated Supabase client.

**File upload flow (authenticated editor only):**

**Upload security rules (apply to all uploads):**
- **Filename sanitization:** Strip path separators (`/`, `\`, `..`), non-ASCII characters, and control characters. Replace with underscores. Generate a safe filename: `${Date.now()}_${sanitized}`. This prevents path traversal attacks and ensures unique names.
- **File type validation:** Check both the file extension AND the MIME type. Do not trust one alone — MIME types can be spoofed, and extensions can be misleading.
  - Templates bucket: allow only `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`. Reject everything else (no HTML, no JS, no SVG with embedded scripts — see SVG note below).
  - Data files bucket: allow only `.xlsx`, `.xls`, `.csv`, `.tsv` with corresponding MIME types.
- **SVG safety:** SVGs can contain `<script>` tags and `onload` attributes that execute JavaScript. Since the templates bucket is public, a malicious SVG uploaded there is an XSS vector served from your Supabase domain. **Either reject SVGs entirely, or sanitize them server-side before storing.** The safest option for MVP is to reject SVGs — the Canvas 2D renderer works fine with PNG/JPEG/WebP.
- **File size limits:** Enforce client-side before upload AND configure Supabase Storage bucket limits:
  - Template images: max 10 MB per file
  - Data files: max 25 MB per file
  - Configure in Supabase dashboard: Storage → Buckets → Edit → File size limit

1. **Template image drop**: user drops an image → validate type + size → sanitize filename → upload to `templates/{user_id}/{project_id}/{timestamp}_{sanitized_name}` → get the public Storage URL → store it in the `ImageObject.src` field (replacing the local data URL). On canvas render, load from the Storage URL.

2. **Data file drop**: user drops Excel/CSV → validate type + size → sanitize filename → upload to `data-files/{user_id}/{project_id}/{timestamp}_{sanitized_name}` → parse it in the browser (existing `utils/data.ts` logic) → store `columns` array in the DB, store the file path in `data_file_path` → keep `rows` and `dataImages` in memory only (not persisted to DB — too large).

3. **Project load**: fetch project row from DB (has `objects`, `canvas_width`, `canvas_height`, `columns`, `data_images_label`, `data_file_path`) → if `data_file_path` exists, download the file from Storage → re-parse it to populate `rows` → re-resolve `dataImages` from the parsed data. Images in `objects[]` already have Storage URLs so they render directly.

### 2.4 Dashboard page

Create `app/(dashboard)/layout.tsx`:
- Fetch user profile from Supabase
- Show sidebar or top nav with: project list, account, plan badge (Free/Pro), sign out
- Must match existing dark theme

Create `app/(dashboard)/dashboard/page.tsx`:
- Fetch user's projects from Supabase
- Display as grid of project cards showing: name, template thumbnail, row count, last updated
- "New Project" button (if free user has < 3 projects, or if Pro user)
- If free user has 3 projects, show upgrade prompt instead of new project button
- Clicking a project card navigates to the editor

### 2.5 Connect dashboard to existing editor

The `Editor` component was extracted in Phase 1.5. Now wire it up to the database.

**Create `app/(dashboard)/projects/[id]/edit/page.tsx`** (server component):
- Fetch the project from Supabase by ID (RLS verifies ownership automatically)
- Fetch the user's profile to get `plan`
- If `data_file_path` exists, generate a signed download URL for the data file (do NOT download it server-side — the client will fetch + parse it since `parseSpreadsheet` uses the browser's SheetJS CDN script)
- Pass serializable data to a client wrapper component:

**Create `app/(dashboard)/projects/[id]/edit/ProjectEditor.tsx`** (`"use client"`):
- This thin client wrapper receives the serialized project data and renders `<Editor />` with the right props
- Handles `onSave` as a client-side function using the browser Supabase client (`lib/supabase/client.ts`)
- On mount, if a `dataFileUrl` prop is provided: fetch the file → create a `File` object → call the existing `parseSpreadsheet()` function → populate `rows` and `dataImages` in the editor via `initialRows` / `initialDataImages` props (or via a loading state that resolves before rendering the editor)

```typescript
"use client";

// ProjectEditor receives serializable props from the server component:
interface ProjectEditorProps {
  project: {
    id: string;
    objects: CanvasObject[];
    canvas_width: number;
    canvas_height: number;
    columns: string[];
    data_images_label: string | null;
    data_file_url: string | null; // signed Storage URL, or null
    data_file_path: string | null;
  };
  userPlan: string;
}

export default function ProjectEditor({ project, userPlan }: ProjectEditorProps) {
  // 1. Use useState + useEffect to fetch and parse the data file if data_file_url exists
  //    Show a loading spinner while parsing
  // 2. Create an onSave callback that uses the browser Supabase client:
  //    const supabase = createBrowserClient(...)
  //    supabase.from('projects').update({ objects, canvas_width, canvas_height }).eq('id', project.id)
  // 3. Render <Editor ... /> once data is ready

  return <Editor
    projectId={project.id}
    initialObjects={project.objects}
    initialCanvasSize={{ width: project.canvas_width, height: project.canvas_height }}
    initialColumns={project.columns}
    initialRows={parsedRows}       // from data file fetch
    initialDataImages={parsedImages} // from data file fetch
    initialDataFileName={project.data_file_path?.split('/').pop() ?? null}
    initialDataImagesLabel={project.data_images_label}
    watermark={userPlan === 'free'}
    user={{ plan: userPlan }}
    onSave={handleSave}
  />;
}
```

**Why a separate client wrapper?** You cannot pass functions (`onSave`) or non-serializable values as props from a server component to a client component. The server component fetches data and generates signed URLs; the client wrapper handles interactivity.

**Auto-save implementation (inside `Editor.tsx`):**
- The `onSave` callback is called by the `useEffect` watcher in `Editor.tsx` (added in Phase 1.5)
- Debounce: 800ms after last change (not 500ms — too aggressive for drag operations)
- Add a `saveStatus` state inside `Editor.tsx`: `'idle' | 'saving' | 'saved' | 'error'` — displayed as a small indicator in the editor toolbar
- Do NOT persist `rows`, `dataImages`, `selectedIds`, `clipboard`, zoom/pan, or any transient UI state — only `objects` and `canvasSize` go to the DB via `onSave`
- `nextZ` recalculation happens in `Editor.tsx` on mount (Phase 1.5.2 already specifies this)

**File upload in authenticated mode:**
When `projectId` is non-null:
- **Template image drop:** upload to Supabase Storage at `templates/{userId}/{projectId}/{filename}`, get the public URL, store it in `ImageObject.src`. The `Editor` needs access to the Supabase client for this — pass it via a `storageUpload` callback prop, or have `Editor` create its own browser client when `projectId` is set.
- **Data file drop:** upload to `data-files/{userId}/{projectId}/{filename}`, then parse locally as usual. After upload, save the file path to the project row via `onSave` or a separate callback.

**`/sandbox` remains untouched** — it renders `<Editor />` with no props (all defaults), no auth, no persistence.

---

## Phase 3: Free Tier Limits

### 3.1 Row limit enforcement

In the authenticated editor (`/projects/[id]/edit`):
- After parsing Excel/CSV data, check row count
- If user's plan is 'free' and rows > 25:
  - Show only the first 25 rows as preview
  - Display an upgrade prompt: "This file has {n} rows. Free plan supports 25 rows. Upgrade to Pro for unlimited rows."
  - Pass only the first 25 rows to `exportRecords()` — block export of rows beyond 25
- Pro users: no limit, process all rows

**Security note:** This enforcement is client-side. A technically sophisticated user could modify the JavaScript to bypass it. This is an acceptable tradeoff because:
1. The export itself is client-side (Canvas 2D + jsPDF) — there is no server-side gate to enforce limits
2. The business risk is low: a user who bypasses client-side limits is a paying-caliber user you'd rather convert than block
3. Adding server-side export solely to enforce row limits would be over-engineering at this stage

**Server-side guard:** Store `row_count` in the project row when the data file is uploaded. In the auto-save `onSave` callback, update `row_count`. This provides an audit trail even though the limit isn't server-enforced. If abuse is detected later, you can query for free users with `row_count > 25` and take action.

The existing `/sandbox` has no row limit (it's a demo).

### 3.2 Project limit enforcement

- Database RLS already blocks free users from creating > 3 projects
- In the dashboard UI: if free user has 3 projects, replace "New Project" button with upgrade CTA
- Handle the RLS error gracefully if it somehow gets through

### 3.3 Watermark on exports

Add a `watermark: boolean` parameter to `exportRecords()` in `sandbox/utils/export.ts`:

**Current signature:**
```typescript
export async function exportRecords(
  format: string, objects: CanvasObject[], canvasSize: CanvasSize,
  rows: RowData[], dataImages: DataImageMap, layout: ImpositionResult,
  sheet: { w: number; h: number }, onProgress: (pct: number) => void,
)
```

**New signature** (add `watermark` as the last param before `onProgress`):
```typescript
export async function exportRecords(
  format: string, objects: CanvasObject[], canvasSize: CanvasSize,
  rows: RowData[], dataImages: DataImageMap, layout: ImpositionResult,
  sheet: { w: number; h: number }, watermark: boolean,
  onProgress: (pct: number) => void,
)
```

**Do NOT modify `renderSingleCard` or `renderImpositionSheet`.** Instead, apply the watermark in `exportRecords` after each imposition sheet is composited (line ~283 for PNG, line ~309 for PDF), before converting to blob/data URL:

```typescript
if (watermark) {
  const ctx = sheetCanvas.getContext("2d")!;
  const scale = 2; // match the existing SCALE constant
  ctx.save();
  ctx.scale(scale, scale);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#000000";
  ctx.font = `bold ${Math.round(sheetW * 0.04)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.translate(sheetW / 2, sheetH / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.fillText("Made with Templify", 0, 0);
  ctx.restore();
}
```

**Caller changes:**
- In `Editor.tsx`, pass the `watermark` prop (from `EditorProps`) through to `exportRecords()`
- Sandbox (no props) defaults `watermark` to `true`
- Authenticated editor passes `watermark={user.plan === 'free'}`

---

## Phase 4: Payment Integration

### 4.1 Install Stripe SDK

```bash
npm install stripe
```

PayMongo does not have an official Node SDK — use fetch with their REST API.

### 4.2 Pricing config

Create `lib/config/pricing.ts`:

```typescript
export const PRICING = {
  pro_monthly: {
    ph: { amount: 19900, currency: 'PHP', display: '₱199', period: 'month' },
    intl: { amount: 499, currency: 'USD', display: '$4.99', period: 'month' },
  },
  pro_quarterly: {
    ph: { amount: 49900, currency: 'PHP', display: '₱499', period: 'quarter' },
    intl: null, // quarterly not offered internationally
  },
  pro_annual: {
    ph: { amount: 169900, currency: 'PHP', display: '₱1,699', period: 'year' },
    intl: { amount: 3999, currency: 'USD', display: '$39.99', period: 'year' },
  },
} as const;

export type PlanKey = keyof typeof PRICING;

// Calculate plan expiration date from now
export function getPlanExpiry(plan: PlanKey): Date {
  const d = new Date();
  switch (plan) {
    case 'pro_monthly':  d.setMonth(d.getMonth() + 1); break;
    case 'pro_quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'pro_annual':   d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}
```

### 4.3 PayMongo wrapper

Create `lib/payments/paymongo.ts`:

```typescript
// PayMongo REST API base: https://api.paymongo.com/v1
// Auth: Basic auth with secret key (base64 encode the key followed by a colon)

// createCheckoutSession(params):
//   POST /checkout_sessions
//   Body:
//     line_items: [{ name: 'Templify Pro', amount, currency: 'PHP', quantity: 1 }]
//     payment_method_types: ['gcash', 'maya', 'card'] (or subset based on user selection)
//     success_url: `${APP_URL}/payment-success?session_id={id}`
//     cancel_url: `${APP_URL}/pricing`
//     metadata: { user_id, plan }
//   Returns: checkout_url to redirect user to

// verifyWebhookSignature(rawBody, signatureHeader, webhookSecret):
//   1. Parse the signature header — PayMongo sends: t=<timestamp>,te=<test_signature>,li=<live_signature>
//   2. Check timestamp freshness: reject if timestamp is older than 5 minutes (prevents replay attacks)
//      const tolerance = 5 * 60; // 5 minutes in seconds
//      if (Math.abs(Date.now() / 1000 - timestamp) > tolerance) return false;
//   3. Compute expected signature: HMAC-SHA256 of `${timestamp}.${rawBody}` with webhook secret
//   4. Compare using crypto.timingSafeEqual() — NEVER use === for signature comparison.
//      Timing attacks can leak the correct signature byte-by-byte via response time analysis.
//      const expected = Buffer.from(computedSignature, 'hex');
//      const received = Buffer.from(signatureFromHeader, 'hex');
//      if (expected.length !== received.length) return false;
//      return crypto.timingSafeEqual(expected, received);
//   5. Return true/false
```

Use `PAYMONGO_SECRET_KEY` from env. Add to .env.local:
```
PAYMONGO_SECRET_KEY=
PAYMONGO_WEBHOOK_SECRET=
```

### 4.4 Stripe wrapper

Create `lib/payments/stripe.ts`:

```typescript
import Stripe from 'stripe';

// Initialize: new Stripe(process.env.STRIPE_SECRET_KEY)

// createCheckoutSession(params):
//   stripe.checkout.sessions.create({
//     mode: 'subscription',
//     line_items: [{ price: stripePriceId, quantity: 1 }],
//     success_url: `${APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
//     cancel_url: `${APP_URL}/pricing`,
//     metadata: { user_id, plan },
//     customer_email: userEmail,
//   })
//   Returns: session.url to redirect user to

// Create price IDs in Stripe Dashboard:
//   - Pro Monthly: $4.99/month recurring
//   - Pro Annual: $39.99/year recurring
// Store price IDs in env:
```

Add to .env.local:
```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_MONTHLY=price_xxx
STRIPE_PRICE_ANNUAL=price_xxx
```

### 4.5 Payment router

Create `lib/payments/router.ts`:

```typescript
// routePayment(params: { plan, paymentMethod, locale, userId, userEmail })
//
// Logic:
//   if paymentMethod is 'gcash' or 'maya' → call paymongo.createCheckoutSession()
//   if paymentMethod is 'card' and locale is 'ph' → call paymongo.createCheckoutSession()
//   if paymentMethod is 'card' and locale is 'intl' → call stripe.createCheckoutSession()
//   if plan is 'pro_quarterly' and locale is 'intl' → reject (not available)
//
// Returns: { gateway: 'paymongo' | 'stripe', checkoutUrl: string }
```

### 4.6 Checkout API route

Create `app/api/checkout/route.ts`:

```typescript
// POST /api/checkout
// Body: { plan, paymentMethod }
//
// SECURITY NOTE: /api/* paths are public in middleware (no redirect to /login).
// This route performs its own auth check — if the user is not logged in, return 401.
//
// 1. Verify Origin header matches NEXT_PUBLIC_APP_URL — reject with 403 if mismatched.
//    This is a lightweight CSRF mitigation: browser fetch() sends Origin automatically,
//    and cross-origin requests from attacker sites will have a different Origin.
//    (Stripe/PayMongo webhook routes skip this check — they come from external origins.)
// 2. Get authenticated user via supabase.auth.getUser() — return 401 if not logged in
// 3. Fetch user profile to get locale and email
// 4. Validate plan: must be one of 'pro_monthly' | 'pro_quarterly' | 'pro_annual'
// 5. Validate paymentMethod: must be one of 'gcash' | 'maya' | 'card'
// 6. Reject invalid combos: pro_quarterly + intl locale, gcash/maya + intl locale
// 7. Check user is not already on a Pro plan — if they are, return 400 "Already subscribed"
// 8. Call routePayment() with user details (use locale from the DB profile, NOT from the request body)
// 9. Return { checkoutUrl } as JSON
//
// The frontend redirects: window.location.href = checkoutUrl
//
// IMPORTANT: Do NOT accept `locale` from the request body. Read it from the user's profile.
// A malicious user could send locale='ph' to get cheaper PH pricing while being international.
```

---

## Phase 5: Webhooks & Subscription Management

### 5.1 PayMongo webhook handler

Create `app/api/webhook/paymongo/route.ts`:

```typescript
// POST /api/webhook/paymongo
//
// 1. Read raw body (do NOT parse as JSON yet — need raw for signature verification)
// 2. Verify webhook signature using paymongo.verifyWebhookSignature()
// 3. Parse the event
// 4. Handle event type 'checkout_session.payment.paid':
//    a. Extract metadata: user_id, plan
//    b. SECURITY: Verify the user_id from metadata actually exists in the profiles table.
//       The metadata was set by our checkout API route (server-side), so it's trustworthy
//       IF the webhook signature verified. But defense-in-depth: confirm the user exists.
//       Also verify that `plan` from metadata is a valid plan value.
//    c. Extract payment details: amount, currency, payment_id
//    d. SECURITY: Verify the amount matches the expected price for the plan.
//       A tampered checkout session could have a lower amount. Compare against PRICING config:
//       if (amount !== PRICING[plan].ph.amount) return error
//    e. Check idempotency: does a payment with this gateway_payment_id already exist? If yes, return 200 OK and skip
//    f. Wrap steps g+h in a transaction or use sequential operations with error rollback:
//    g. Insert row into payments table using admin (service role) client
//    h. Update profiles table: set plan, plan_expires_at (calculate from plan), payment_gateway = 'paymongo', gateway_customer_id, gateway_subscription_id
// 5. Return 200 OK
//
// IMPORTANT: Use the admin client (lib/supabase/admin.ts) — webhooks run without user context
// IMPORTANT: Export const runtime = 'nodejs' (not edge — need crypto for HMAC)
```

### 5.2 Stripe webhook handler

Create `app/api/webhook/stripe/route.ts`:

```typescript
// POST /api/webhook/stripe
//
// 1. Read raw body
// 2. Verify using stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
// 3. Handle events:
//
//    'checkout.session.completed':
//      - Extract metadata: user_id, plan
//      - SECURITY: Verify user_id exists in profiles table
//      - SECURITY: Verify amount_total matches expected price for the plan (from PRICING config)
//      - Get subscription ID from session
//      - Check idempotency (same as PayMongo — check gateway_payment_id)
//      - Insert payment record
//      - Update profile: plan, plan_expires_at, payment_gateway = 'stripe', gateway_customer_id, gateway_subscription_id
//
//    'invoice.paid' (recurring payment succeeded):
//      - Find user by gateway_subscription_id
//      - Insert payment record
//      - Extend plan_expires_at
//
//    'invoice.payment_failed':
//      - Find user by gateway_subscription_id
//      - Insert failed payment record
//      - Do NOT immediately downgrade — give grace period
//      - (Optional: send email notification)
//
//    'customer.subscription.deleted' (user cancelled or payment permanently failed):
//      - Find user by gateway_subscription_id
//      - Set plan = 'free', clear plan_expires_at and gateway fields
//
// 4. Return 200 OK
//
// IMPORTANT: Use admin client for all database operations
// IMPORTANT: Export const runtime = 'nodejs'
```

### 5.3 Plan expiration check

For PayMongo e-wallet subscriptions (GCash, Maya), there's no automatic recurring charge — you need to handle renewal:

Create `lib/payments/renewal.ts`:
- Function `checkAndHandleExpiredPlans()`:
  - Query profiles where `plan != 'free'` and `plan_expires_at < now()` and `payment_gateway = 'paymongo'`
  - For expired plans: set `plan = 'free'`, clear `plan_expires_at`

**Renewal UX for PayMongo users (no auto-charge):**
- On the dashboard, show a warning banner when `plan_expires_at` is within 7 days: "Your Pro plan expires on {date}. Renew now to keep unlimited access." with a link to the pricing page.
- After expiry, instant downgrade to free — no grace period (since PayMongo e-wallets have no auto-retry mechanism). The user sees free-tier limits immediately and can re-subscribe from the pricing page.
- The pricing page handles both new subscriptions and renewals identically — the checkout flow is the same.

This can be called via:
- A Vercel Cron job (`vercel.json` → cron schedule) hitting an API route
- Or a Supabase pg_cron extension running daily

Create `app/api/cron/check-plans/route.ts`:
- Extract Bearer token from `Authorization` header
- Compare against `CRON_SECRET` using `crypto.timingSafeEqual()` — NOT `===`
  ```typescript
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(process.env.CRON_SECRET!))) {
    return new Response('Unauthorized', { status: 401 });
  }
  ```
- Call `checkAndHandleExpiredPlans()`
- Return 200 OK
- Export `const runtime = 'nodejs'` (need `crypto` module)

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/check-plans",
    "schedule": "0 0 * * *"
  }]
}
```

### 5.4 Payment success page

Create `app/(dashboard)/payment-success/page.tsx` (inside dashboard route group — requires auth):

**Webhook race condition:** The user is redirected here immediately after payment, but the webhook may not have fired yet. The profile may still show `plan = 'free'`. Handle this:

1. Fetch the user profile on load
2. If `plan` is already Pro → show success screen immediately
3. If `plan` is still `free` → show a "Confirming your payment..." state with a spinner. Poll the profile every 2 seconds (client-side, up to 30 seconds / 15 attempts). Once `plan` flips to Pro, show the success screen. If it times out, show: "Payment received — it may take a moment to activate. Check your dashboard shortly." with a link to `/dashboard`.

**Success screen content:**
- "Welcome to Templify Pro!" with the plan details
- Show what's unlocked: unlimited rows, unlimited projects, no watermark
- CTA: "Go to Dashboard" button
- Match existing dark theme

---

## Phase 6: Pricing Page & Upgrade Flow

### 6.1 Pricing page

Create or update `app/(marketing)/pricing/page.tsx`:

- **Locale detection:** For logged-in users, read `locale` from their profile. For anonymous visitors, use Vercel's `x-vercel-ip-country` header in middleware (set a cookie with the detected country code). If country is `PH`, locale = `ph`, else `intl`. Add a small toggle on the pricing page ("Philippines" / "International") so users can override if the auto-detection is wrong.
- Show localized pricing:
  - PH users: ₱199/mo, ₱499/qtr, ₱1,699/yr — with GCash, Maya, Card options
  - Intl users: $4.99/mo, $39.99/yr — with Card option only
- Billing cycle toggle: Monthly / Quarterly (PH only) / Annual
- Show savings: "Save 3 months" on annual
- Free tier card showing current limits
- Pro tier card with all features
- Comparison table: Free vs Pro
- CTA buttons:
  - If not logged in: "Get started" → /login (Google OAuth handles signup automatically)
  - If logged in + free: "Upgrade to Pro" → opens payment method selection
  - If logged in + Pro: "Current Plan" (disabled) + "Manage Subscription"

- **Theme: must match existing dark theme from CLAUDE.md**

### 6.2 Payment method selector

When a logged-in free user clicks "Upgrade to Pro":
- Show a modal or inline UI with payment method options
- PH users see: GCash logo + label, Maya logo + label, Credit/Debit Card
- Intl users see: Credit/Debit Card only
- On selection, call POST /api/checkout with { plan, paymentMethod, locale }
- Redirect to the returned checkoutUrl

### 6.3 Stripe cancellation API route

Create `app/api/cancel-subscription/route.ts`:

```typescript
// POST /api/cancel-subscription
//
// 1. Verify Origin header matches NEXT_PUBLIC_APP_URL — reject with 403 if mismatched (CSRF mitigation)
// 2. Get authenticated user via supabase.auth.getUser() — return 401 if not logged in
// 3. Fetch user profile — verify:
//    a. payment_gateway is 'stripe' (cannot cancel PayMongo plans — they just expire)
//    b. gateway_subscription_id exists and is non-empty
//    c. plan is not 'free' (cannot cancel what you don't have)
// 4. Call stripe.subscriptions.update(gateway_subscription_id, { cancel_at_period_end: true })
//    IMPORTANT: Use the subscription ID from the DATABASE, not from the request body.
//    Never let the client tell you which subscription to cancel — always derive it from
//    the authenticated user's profile. This prevents a user from cancelling someone else's subscription.
// 5. Return { success: true, cancelsAt: subscription.current_period_end }
//
// Do NOT call stripe.subscriptions.cancel() (immediate cancellation) — use cancel_at_period_end
// instead so the user retains Pro access for the period they already paid for.
// The 'customer.subscription.deleted' webhook will fire at period end and handle the downgrade.
//
// IMPORTANT: Use server Supabase client for auth, direct Stripe SDK for cancellation
// IMPORTANT: Export const runtime = 'nodejs'
```

### 6.4 Account & settings page

Create `app/(dashboard)/settings/page.tsx`:
- Show user info: name, email, avatar (from Google OAuth / profile)
- **Plan section:** current plan name, expiry date (if Pro), payment gateway used
- **For Pro users:**
  - Stripe users: "Cancel Subscription" button → calls `POST /api/cancel-subscription` (see 6.3). Show confirmation dialog first: "Your Pro features will remain active until {expiry date}. After that you'll return to the free plan." On success, update the UI to show "Cancels on {date}".
  - PayMongo users: plan auto-expires, show expiry date and "Renew" link to pricing page (no cancel needed — just don't renew)
- **Locale toggle:** "Philippines" / "International" — updates the `locale` field in the profile (via the browser Supabase client, which has column-level grant for `locale`), which determines pricing and payment methods
- Must match existing dark theme

### 6.5 Upgrade prompts in the editor

Add contextual upgrade CTAs (non-intrusive, matching theme):

1. **Row limit hit**: When free user uploads Excel with > 25 rows, show banner: "This file has {n} rows. Upgrade to Pro for unlimited rows." with upgrade button.

2. **Project limit hit**: On dashboard when free user has 3 projects, the "New Project" card becomes an upgrade CTA.

3. **Watermark notice**: In export modal for free users, show small note: "Exports include Templify watermark. Upgrade to Pro to remove it." with upgrade link.

---

## Security Rules (MANDATORY — zero exceptions)

### Never hardcode secrets or API keys

This is the single most important rule in the entire project. Violations here are unfixable if code reaches a public repo.

1. **NEVER hardcode any API key, secret key, webhook secret, database URL, or any credential anywhere in the codebase.** Not in TypeScript files, not in SQL migrations, not in config files, not in comments, not in example code, not in README, not even as a "temporary" placeholder. No `sk_test_xxx`, no `whsec_xxx`, no `pk_test_xxx`, no `eyJhb...` tokens. Zero exceptions.

2. **ALL secrets and keys must come from environment variables via `process.env`.** Access them at runtime, never at build time in a way that inlines them into client bundles. Every single secret must be read as `process.env.VARIABLE_NAME` — never assigned to a top-level constant with a fallback string, never interpolated into a string literal.

3. **Use `NEXT_PUBLIC_` prefix ONLY for values that are safe to expose to the browser.** Only these variables may have the `NEXT_PUBLIC_` prefix:
   - `NEXT_PUBLIC_SUPABASE_URL` — the Supabase project URL (public by design)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the Supabase anon/public key (public by design, scoped by RLS)
   - `NEXT_PUBLIC_APP_URL` — your app's URL (not a secret)

   Everything else is server-only and must NEVER have the `NEXT_PUBLIC_` prefix:
   - `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS, full database access
   - `PAYMONGO_SECRET_KEY` — can create charges on your account
   - `PAYMONGO_WEBHOOK_SECRET` — used to verify webhook authenticity
   - `STRIPE_SECRET_KEY` — can create charges on your account
   - `STRIPE_WEBHOOK_SECRET` — used to verify webhook authenticity
   - `STRIPE_PRICE_MONTHLY` — Stripe price ID (not sensitive but no reason to expose)
   - `STRIPE_PRICE_ANNUAL` — same as above
   - `CRON_SECRET` — protects cron endpoints from unauthorized calls

4. **Validate that required env vars exist at startup.** In every file that uses an env var, check it exists and throw a clear error if missing:
   ```typescript
   const stripeKey = process.env.STRIPE_SECRET_KEY;
   if (!stripeKey) throw new Error('Missing STRIPE_SECRET_KEY environment variable');
   ```
   Do this for every secret in every file that uses one. Never silently continue with an undefined key.

5. **`.env.local` must be in `.gitignore`.** Verify this. If `.gitignore` does not already include `.env.local`, `.env`, and `.env*.local`, add them. Never commit any `.env` file to git.

6. **Never log secrets.** Do not `console.log` any env var value, API key, token, or webhook body in production. If you need debug logging, log the key name and a boolean (exists / doesn't exist), never the value itself.

7. **Never pass secrets to the client.** Server-only env vars (without `NEXT_PUBLIC_` prefix) are automatically excluded from the client bundle by Next.js. But verify: never return secret keys in API responses, never include them in props passed to client components, never put them in cookies or localStorage.

### Server vs client boundary

8. **Never import `lib/supabase/admin.ts` from any client component, server component, or page.** It is exclusively for API route handlers (webhooks, cron). If you see `admin.ts` imported outside of `app/api/`, that is a bug.

9. **All payment API calls happen server-side only.** The `lib/payments/paymongo.ts` and `lib/payments/stripe.ts` files must only be imported in `app/api/` route handlers. Never call PayMongo or Stripe APIs from the browser.

10. **Webhook endpoints must verify signatures before processing.** Never trust webhook data without cryptographic verification. For PayMongo: HMAC-SHA256 of raw body against the webhook secret. For Stripe: `stripe.webhooks.constructEvent()` with the raw body and signature header. If verification fails, return 400 immediately — do not process the event.

11. **Cron endpoints must verify authorization.** The `/api/cron/check-plans` route must check for a valid `Authorization: Bearer ${CRON_SECRET}` header. If missing or wrong, return 401. Vercel Cron automatically sends this header when configured.

### API route hardening

- **Origin check on state-changing routes.** All API routes that are called by the frontend (`/api/checkout`, `/api/cancel-subscription`) must verify the `Origin` header matches `process.env.NEXT_PUBLIC_APP_URL`. This prevents CSRF attacks where a malicious site tricks an authenticated user's browser into making requests to your API. Webhook routes (`/api/webhook/*`) and cron routes (`/api/cron/*`) skip this check — they come from external servers.

- **Raw body handling for webhooks.** Next.js App Router parses request bodies automatically. For webhook signature verification, you need the raw bytes, not the parsed JSON. Read the body as text BEFORE any parsing:
    ```typescript
    const rawBody = await req.text();
    // Verify signature with rawBody, THEN:
    const event = JSON.parse(rawBody);
    ```
    For Stripe specifically: `stripe.webhooks.constructEvent()` expects the raw body as a string or Buffer. If you pass a parsed-then-re-stringified body, the signature will fail because JSON.stringify may reorder keys or change whitespace.

- **Rate limiting.** For MVP, Vercel's built-in DDoS protection and Supabase's rate limits provide baseline protection. But add application-level rate limiting before launch on these high-value endpoints:
    - `/api/checkout` — max 5 requests per user per minute (prevents checkout spam)
    - `/api/cancel-subscription` — max 3 requests per user per minute
    - OAuth login flow — Supabase handles this upstream, but monitor for abuse
    - Implementation: use Vercel KV (Redis) with a sliding window counter, or Supabase's `pg_net` + a rate limit table. A simple approach: store `{user_id}:{endpoint}:{minute_bucket}` keys in Vercel KV with TTL.

### Data security

12. **RLS on every table, no exceptions.** Every table in the database has Row Level Security enabled. The browser client (anon key) can only access data allowed by RLS policies. Never bypass RLS from the client. The admin client (service role) is used ONLY in webhook handlers and cron jobs.

13. **Validate all user input on the server.** API routes must validate request bodies — check types, check allowed values, check that IDs belong to the authenticated user. Never trust client-side validation alone.

14. **Idempotent webhooks.** Both PayMongo and Stripe can send duplicate webhook events. Before processing any payment webhook, check if a payment record with the same `gateway_payment_id` already exists. If it does, return 200 OK and skip — do not create duplicate payment records or double-upgrade a user.

15. **Use `supabase.auth.getUser()` for auth checks, not `getSession()`.** `getSession()` reads from cookies without server validation and can be spoofed. `getUser()` makes a round-trip to Supabase to verify the session is valid. Always use `getUser()` in API routes and server components when making authorization decisions.

---

## Critical Rules

1. **Do not break the existing /sandbox editor.** It must continue to work as a public demo with no auth required. It uses browser-only state (no database). Keep it exactly as-is.

2. **Follow the existing theme.** Every new page (login, dashboard, pricing, payment-success) must use the dark theme defined in CLAUDE.md: background `#0a0a10`, accent `#e8ff47`, surfaces `rgba(255,255,255,0.04)`, etc. No new colors or fonts.

3. **No emoji anywhere.** Use SVG icons from `@/components/Icons`. If a new icon is needed (e.g., GCash logo, Maya logo, Google logo, checkmark, lock), add it to `components/Icons.tsx` following the existing pattern.

4. **Error handling.** Every Supabase call, every payment API call, and every webhook must have proper try/catch with meaningful error messages. Show user-friendly toast notifications for errors (use the existing UI patterns).

5. **Type safety.** Define TypeScript types for all database tables, API request/response shapes, and payment types. Put shared types in `sandbox/types/` or a new `lib/types/` directory.

6. **Google OAuth only.** The only auth method is "Continue with Google" — a single button. There is no email/password flow, no magic links, no Facebook login, no separate signup page. Users click one button, authorize with Google, and they are in. This keeps the auth UI dead simple.

---

## Environment Variables Summary

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# PayMongo
PAYMONGO_SECRET_KEY=
PAYMONGO_WEBHOOK_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_MONTHLY=
STRIPE_PRICE_ANNUAL=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron
CRON_SECRET=
```

**REMINDER: Never hardcode any of these values. Never commit .env.local to git. Never prefix server-only keys with NEXT_PUBLIC_.**

---

## Testing Checklist

After building, verify:

**Phase 1 + 1.5: Auth & Editor Extraction**
- [ ] `/sandbox` still works with no auth (existing demo, unchanged — identical behavior after editor extraction)
- [ ] Can sign in with Google OAuth → profile auto-created (with name + avatar) → redirected to /dashboard
- [ ] Unauthenticated users on /dashboard are redirected to /login
- [ ] Authenticated users on /login are redirected to /dashboard
- [ ] OAuth callback at `/auth/callback` works (NOT `/callback`)

**Phase 2: Persistence**
- [ ] `/dashboard` shows projects, "New Project" creates one
- [ ] Opening a project loads `objects`, `canvasSize`, and `columns` correctly from DB
- [ ] Template images render from Supabase Storage URLs (not stale data URLs)
- [ ] Data file re-parses on project load, `rows` and `dataImages` repopulate
- [ ] Auto-save triggers on object/canvas changes, save indicator shows status
- [ ] `nextZ` recalculates correctly on project load (no z-index collisions)

**Phase 3: Free Tier**
- [ ] Free user cannot create 4th project (RLS blocks + UI shows upgrade)
- [ ] Free user with > 25 row Excel sees row limit + upgrade prompt
- [ ] Free user export has watermark
- [ ] Pro user has no row limit, no project limit, no watermark

**Phase 4-5: Payments**
- [ ] Pricing page shows correct localized prices
- [ ] Locale auto-detected from `x-vercel-ip-country`, manual toggle works
- [ ] PayMongo checkout works (test mode): GCash, Maya, Card
- [ ] Stripe checkout works (test mode): International card
- [ ] Webhook updates user plan to Pro after payment
- [ ] Payment success page handles webhook race condition (polls until plan updates)
- [ ] Duplicate webhook calls are idempotent (no double-upgrade, no duplicate payment rows)
- [ ] Plan expiration cron correctly downgrades expired PayMongo users
- [ ] Renewal warning banner shows 7 days before PayMongo plan expiry

**Phase 6: Pricing & Account**
- [ ] Settings page shows plan info, expiry date, cancel/renew options
- [ ] Stripe cancel subscription sets `cancel_at_period_end` (not immediate cancel)
- [ ] Locale toggle on settings page updates profile and pricing display
- [ ] Cancel confirmation dialog shows correct expiry date

**Security**
- [ ] No hardcoded API keys or secrets anywhere in the codebase (grep for `sk_`, `pk_`, `whsec_`, `eyJ`, `Bearer ` with a string value)
- [ ] `.env.local` is in `.gitignore`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is never imported outside of `app/api/` routes
- [ ] All webhook endpoints verify signatures before processing (with `timingSafeEqual`)
- [ ] PayMongo webhook checks timestamp freshness (reject events > 5 min old)
- [ ] Cron secret compared with `crypto.timingSafeEqual`, not `===`
- [ ] Templates bucket is public (images renderable by Canvas), data-files bucket is private
- [ ] Column-level grant on profiles table prevents client from modifying plan/payment fields
- [ ] `/api/checkout` and `/api/cancel-subscription` verify Origin header
- [ ] `/api/checkout` reads locale from DB profile, not from request body
- [ ] `/api/cancel-subscription` reads subscription ID from DB, not from request body
- [ ] Webhook handlers verify amount matches expected price for the plan
- [ ] File uploads validated: type, size, sanitized filename — SVGs rejected
- [ ] `objects` JSONB column has size CHECK constraint (< 1 MB)
- [ ] `canvas_width`/`canvas_height` have range CHECK constraints (1–10000)
- [ ] `ImageObject.src` URLs validated against allowed domains before saving
- [ ] OAuth callback redirect is hardcoded to `/dashboard` (no user-supplied redirect)
- [ ] Supabase dashboard: redirect URLs explicitly listed (no wildcards)
- [ ] OAuth callback handles missing/invalid `code` gracefully (redirect to /login, no error leak)
- [ ] `"use client"` directive is on `Editor.tsx` (not just inherited from a page)

**Theme**
- [ ] All pages match the dark theme
- [ ] No emoji anywhere in the UI
