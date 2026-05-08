@AGENTS.md

# Friluftskompis

Norwegian outdoor trip planning app. Consolidates cabin discovery, weather, route planning and group coordination into one place.

## Stack

- **Next.js 16** App Router (see AGENTS.md — read the docs before writing code)
- **TypeScript**, **React 19**, **Tailwind CSS v4**
- **react-leaflet** for the map (client-only, always needs `ssr: false`)
- External APIs: DNT/UT.no GraphQL, Kartverket tiles, Geonorge Stedsnavn, Yr/MET

## Architecture

```
app/
  api/          Route Handlers — server-side proxies to upstream APIs
  components/   React components
    MapLoader   Coordinates map state (selected location, area filter); dynamically imports DntMap
    DntMap      Leaflet map — must be a Client Component, imported with ssr: false
    SearchBar   Debounced search against /api/search
    AreaFilter  DNT area filter dropdown
  page.tsx      Server Component shell with header
```

State for the map lives in `MapLoader`. `DntMap` is a pure display component that receives props.

## Workflow

After applying any code changes, always run:
1. `npm run lint` — fix any ESLint errors before finishing
2. `npx prettier --write <changed files>` — format changed files

## Completed tasks

When a task is finished, add it to this list before committing.

- DS1 — Designsystem utvid
- DS2 — MCP-kobling mellom Figma og Claude
- F1 — Turforslag vises
- F2 — Søk og filter
- F3 — Kart med hytter
- F4 — Vær per dag
- F5 — Invitere deltakere
- F6 — AI-pakkeliste
- F10 — Discover/Journey
- F19 — Sosial deling
- F20 — Administrasjon og observabilitet
- GS1 — Live URL
- GS2 — LLM-drevet WCAG-verifisering
- GS3 — Design brief that works
- TE1 — CI kjører grønt
- TE2 — Streng review av AI-generert kode
- TE4 — Code-review skill
- TE5 — To eksterne API-er integrert

## Rules

- `dynamic(() => import(...), { ssr: false })` is only allowed inside Client Components — Next.js 16 will error if used in a Server Component.
- Never nest interactive elements: no `<button>` inside `<button>`, no `<span role="button">` inside `<button>`. Use sibling elements or restructure the layout.
- Use `useEffect` with a state dependency to trigger side effects like `focus()` — never `setTimeout(() => ..., 0)`.
- Derive expensive values with `useMemo` rather than recomputing them in JSX or in multiple places in the same render.
- Every new interactive component (dropdown, combobox, menu) must support keyboard navigation: ↑/↓ to move, Enter to select, Escape to close.
- All `<input>` elements need a visible `<label>` or `aria-label`.
- Every `<button>` that is not a form submit must have `type="button"` — omitting it defaults to `type="submit"` and will trigger any ancestor `<form>`.
