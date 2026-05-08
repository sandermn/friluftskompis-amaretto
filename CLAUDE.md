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

## Rules

- `dynamic(() => import(...), { ssr: false })` is only allowed inside Client Components — Next.js 16 will error if used in a Server Component.
- Never nest interactive elements: no `<button>` inside `<button>`, no `<span role="button">` inside `<button>`. Use sibling elements or restructure the layout.
- Use `useEffect` with a state dependency to trigger side effects like `focus()` — never `setTimeout(() => ..., 0)`.
- Derive expensive values with `useMemo` rather than recomputing them in JSX or in multiple places in the same render.
- Every new interactive component (dropdown, combobox, menu) must support keyboard navigation: ↑/↓ to move, Enter to select, Escape to close.
- All `<input>` elements need a visible `<label>` or `aria-label`.
