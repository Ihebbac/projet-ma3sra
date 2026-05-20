Purpose
-------
This file gives succinct, actionable guidance to an AI coding assistant working on this Next.js (app-router) TypeScript dashboard project.

Key project facts
-----------------
- Framework: Next.js (app router) — see `src/app/layout.tsx` and nested `(admin)` routes.
- Scripts: use `npm run dev` (Next dev with turbopack), `npm run build`, `npm run start`, `npm run typecheck`, `npm run lint`, `npm run format` (see package.json).
- Public API base is configured via `NEXT_PUBLIC_API_BASE` and used by client components (example: `src/app/(admin)/(apps)/(dashboards)/dashboard/components/DashboardClient.tsx`).

Big-picture architecture to preserve
----------------------------------
- App router with server and client components. Files that start with `use client` (e.g. `DashboardClient.tsx`) are client components and safe to use DOM APIs.
- Shared UI patterns: `src/components` (UI primitives), `src/components/client-wrapper` (wrappers for libraries that require client execution), `src/layouts` and `src/app` pages.
- Data flow: client components call the public API (relative to `NEXT_PUBLIC_API_BASE`) using `fetch`. Example endpoints: `/clients`, `/fitoura`, `/transactions`, `/caisse`, `/employes`.
- Theme handling: theme values are read at runtime from CSS variables and `data-bs-theme` (see `getThemePalette()` in `DashboardClient.tsx`); changes are observed with a `MutationObserver`. Avoid touching theme logic unless you update `getThemePalette()` and its consumer components.

Project-specific conventions
--------------------------
- TypeScript strictness: prefer existing typed shapes; many components declare local types (see `DashboardClient.tsx` — `Client`, `Fitoura`, `Transaction`, `Caisse`, `Employe`). Match those shapes when changing data mappings.
- Third-party libs are wrapped in `src/components/client-wrapper/*` — follow this pattern when adding libraries that require window/document (charts, datepickers, etc.).
- Charts: `chart.js` is registered globally in client components (avoid duplicate registrations). Check `ChartJS.register(...)` usages before adding another registration.
- Styling: SCSS variables live in `assets/scss`; components also use `style jsx` blocks for component-local CSS. Respect `data-bs-theme` and CSS variables rather than hard-coding colors.
- API consumption: client components directly call REST endpoints. Keep fetch calls resilient and return sensible defaults when remote data is missing.

Integration points worth checking first
-------------------------------------
- `NEXT_PUBLIC_API_BASE` (env) — set this for local dev. Without it, client fetches default to an IP in `DashboardClient.tsx`.
- `src/lib/serverApi.ts` — centralized server-side helpers (inspect before creating new API helpers).
- `src/components/client-wrapper` — examples for initializing libraries on client-side only.

Developer workflows (how to run & validate)
------------------------------------------
- Start dev server: `npm run dev` (uses turbopack). Use browser devtools to inspect network requests to `NEXT_PUBLIC_API_BASE`.
- Typecheck: `npm run typecheck` (runs `tsc --noEmit`).
- Lint: `npm run lint`.
- Format: `npm run format` (Prettier target: `src/**/*.{ts,tsx,js,jsx}`).

Practical examples / patterns
-----------------------------
- Adding a client-only chart component: put `use client` at top, import wrapper from `src/components/client-wrapper`, and avoid re-registering `ChartJS`.
- Adding a new REST fetch: follow existing pattern in `DashboardClient.tsx` — use `fetch(
  `${process.env.NEXT_PUBLIC_API_BASE}/your-endpoint`
)` and guard JSON parsing with defaults.
- Reading theming values: use `getComputedStyle(document.documentElement).getPropertyValue('--bs-primary')` as in `getThemePalette()` instead of hard-coded colors.

Safety notes for the assistant
------------------------------
- Do not convert client components to server components unless you fully remove all DOM or window usage.
- Avoid changing theme observation logic without testing across light/dark mode; it's intentionally tuned with `MutationObserver` and `matchMedia`.
- When modifying data calculations, prefer small, easily-reviewable PRs — many UI cards rely on precise numeric formatting (see `formatMoney`, `formatQty`, `CountUpClient`).

Where to look first
-------------------
- `src/app` — app router and page structure.
- `src/components` and `src/components/client-wrapper` — shared UI patterns and client-only wrappers.
- `src/lib/serverApi.ts` and any `src/api` helpers — server-side integrations.
- `assets/scss` — global theme variables.
- Representative example: `src/app/(admin)/(apps)/(dashboards)/dashboard/components/DashboardClient.tsx` (complex client component showing data fetching, charts, theming, and UX patterns).

If anything in this file is unclear or you want deeper, line-level examples (e.g., more file links or code snippets), tell me which area to expand.
# Copilot instructions — projet-ma3sra

Purpose: Help AI coding agents be immediately productive in this Next.js 13 codebase.

- Big picture
  - This is a Next.js 13 (App Router) frontend in `src/app`. Route groups use parenthesis (e.g. `(admin)`) to scope layouts and routes.
  - UI is component-driven. Heavy, browser-only libraries (charts, maps, editors) are wrapped in client wrappers under `src/components/client-wrapper` (example: `ApexChartClient.tsx`).
  - Styling uses SCSS variables in `assets/scss/_variables.scss` and `assets/scss/_variables-dark.scss`; the global bundle is `assets/scss/app.scss`.
  - Shared logic and infra live under `src/lib` (e.g. `serverApi.ts`, `jwt.ts`) and `src/types` for TypeScript types.

- Key patterns & conventions
  - Route groups: use `(group)` folders to isolate admin/landing/auth areas. Add a new page by creating a folder with `page.tsx` (and optional `layout.tsx`) inside `src/app` or a group.
  - Client vs server components: add `"use client"` at the top when the file uses state, effects or browser-only libraries. Prefer creating a small client wrapper in `components/client-wrapper` for third-party browser libs.
  - Context & hooks: global contexts live in `src/context/*` and reusable hooks in `src/hooks/*`. Use these rather than introducing ad-hoc global state.
  - Charts & heavy UI: follow the existing wrapper pattern (see `src/components/client-wrapper/*`) rather than importing chart libs directly into pages.
  - SCSS: change theme tokens in `_variables*.scss` and import through `app.scss`. Keep component-specific styles under `assets/scss/components`.
  - API/auth: server endpoints (if added) should follow Next.js app-router API conventions under `src/app/api`. Client helpers for requests are in `src/lib/serverApi.ts` and token helpers in `src/lib/jwt.ts`.

- Build / dev / lint commands (from `package.json`)
  - Dev (fast local start): `npm run dev` (runs `next dev --turbopack`).
  - Build: `npm run build` → `next build`.
  - Start production server: `npm run start`.
  - Type check: `npm run typecheck` → `tsc --noEmit`.
  - Lint: `npm run lint`.
  - Format: `npm run format` (Prettier for `src/**/*.{ts,tsx,js,jsx}`).

- Integration and external libraries to be aware of
  - Charts: `apexcharts`, `react-chartjs-2`, wrappers under `components/client-wrapper`.
  - Maps: `leaflet` and `react-leaflet` (see `assets/images/leaflet` and map components).
  - Rich text: `quill` / `react-quill-new` with client wrappers.
  - Data tables: `datatables.net-*` family; pattern for initializing is already present in table components.
  - File uploads: `filepond` + `react-filepond` client wrappers.

- Practical editing tips
  - When introducing a browser-only dependency: create a client wrapper in `src/components/client-wrapper` and import that wrapper into pages/components.
  - Follow existing file naming and folder layout. Example: admin dashboards live under `src/app/(admin)/(apps)/(dashboards)` with their component files under `components`.
  - Update corresponding SCSS tokens when changing spacing/colors to keep theme consistent.
  - Keep changes localized: update types in `src/types` when adding props, and update `src/lib/serverApi.ts` if adding new API endpoints consumed by the client.

- Security
  - Secrets should be in environment variables. Do not commit local secret files (there are `.claude` settings and other local configs — avoid committing them).

- Files to inspect for examples
  - `src/app/layout.tsx` and `src/app/(admin)/layout.tsx` — app & admin layouts.
  - `src/components/client-wrapper/ApexChartClient.tsx` — chart wrapping pattern.
  - `src/lib/serverApi.ts`, `src/lib/jwt.ts` — request & auth helpers.
  - `assets/scss/_variables.scss` and `assets/scss/app.scss` — theming and global styles.

If any of the above assumptions are unclear or you want the file to emphasize other areas (e.g., contributing rules, commit message style, or tests), tell me what to add and I'll iterate.
