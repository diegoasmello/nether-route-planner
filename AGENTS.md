# Nether Hub Route Planner

## What this project is

A web tool that helps plan **Nether Hubs in Minecraft**: a hub has a circular central area (where portals sit) from which straight tunnels radiate outward to destination portals. The tool computes the shortest-distance route between the hub center and a portal, and turns that mathematical line into a practical block-by-block path to build in game.

This is not a generic coordinate calculator — it's purpose-built for that workflow (planning/building hubs), with Minecraft-specific conventions and visualization.

## The hub/paths mental model

The app's data — and its UI — is deliberately split into two levels, and the two must never be conflated:

1. **Hub settings**: hub center (X, Z), hub radius, and an optional portal capacity (how many portal slots the hub is built for, and their width). There is exactly one hub. Shown in a fixed "Hub" section at the top of the sidebar, always visible, edited inline (every change persists immediately — no explicit save step).
2. **Paths**: a list of portals radiating from that hub. Each path is a fully self-contained record: portal destination (X, Z), tunnel width, route style (`diagonal`/`orthogonal`), and axis order (only meaningful for `orthogonal`). Shown in a "Caminhos" section below, as a list — there is no separate "current route being edited" living outside that list; the list itself is the only source of truth for path data.

This split exists in the code exactly as it does in the UI: `HubSettings` and `SavedPath` are two separate types with no overlapping fields (`lib/storage/route-planner-storage.ts`), and the sidebar has two correspondingly separate sections (`route-planner.tsx`). Don't reintroduce a field shared between them (e.g. moving tunnel width back onto the hub) without deliberately revisiting this split.

## Core functionality

Given, per hub:

- **Origin** (hub center): X, Z
- **Hub radius**: blocks to keep clear of tunnel around the center
- **Portal capacity** (optional): how many portal slots the hub supports, and their width in blocks — both must be set for anything to render; see **Portal capacity** below

Given, per path:

- **Destination** (portal): X, Z
- **Tunnel width**: blocks
- **Route style**: `diagonal` (follow the ideal line exactly, jagged block staircase) or `orthogonal` (two straight axis-aligned legs, an "L", easier to build but doesn't follow the ideal line), plus an axis-order inversion that only applies to `orthogonal`

For the selected path, the app computes and displays:

- ΔX, ΔZ, Euclidean distance, angle, direction (Minecraft compass)
- The hub circle and the point where the origin→destination line crosses it (that point is the **effective tunnel start** — the hub margin never changes the route's direction, only where it starts being "built")
- The line's rasterization into blocks (Bresenham for `diagonal`, two Bresenham legs for `orthogonal`) from the tunnel start to the destination
- The block corridor for the configured width, centered on the route's direction (not on the block-by-block rasterized line, to avoid a jagged edge)
- An approximate area estimate (explicitly labeled as approximate, since the discrete rasterization can overlap itself)

Y is not part of any calculation — everything happens on the horizontal X/Z plane.

The canvas draws only the actual built path for each visible path — the rasterized `tunnel.centerline`/corridor (diagonal staircase or the two orthogonal legs) — with no separate straight origin→destination overlay. Every visible path's title is drawn as a label at the midpoint of that centerline (like a street name on a map app) — but always kept **horizontal**, never rotated to the line's angle, unlike a real map's street labels. The canvas renders **every visible path at once**: the selected path draws in full color on top; every other visible path draws underneath in a muted violet, so the selected one stays visually dominant. A path's visibility toggle (in the sidebar list) is independent of selection — hiding the selected path removes it from the canvas even though it's still selected.

## Portal capacity (optional hub setting)

A hub can optionally declare how many portals it's built to support (`portalCount`) and how wide each one is (`portalWidth`, in blocks) — both live on `HubSettings`, not on any path. This is deliberately **not** tied to the paths list: it's a "how many slots fit" visualization, not a claim that every slot has a configured destination. Not every hub is built to its maximum capacity, and any leftover perimeter space is left for the player to place portals wherever they like — so:

- Both fields are optional and independent. Rendering the slots requires **both** to be set (positive numbers); either missing/blank is treated as "feature off", not filled in with a fallback value like `tunnelWidth`'s default of 3.
- `distributePortalsOnHub` (`lib/minecraft/portals.ts`) computes the slots: it takes the hub's already-pixelated perimeter (`rasterizeCircle`), sorts those blocks by `angleFromXAxis` around the hub center, and spaces `portalCount` slots evenly by position in that ordering — portal `#0` anchored at angle 0 (East, +X). Each slot is a contiguous run of `portalWidth` perimeter blocks, using the same `widthOffsets` even/odd centering convention as tunnel width.
- If `portalCount * portalWidth` exceeds the perimeter length, slots overlap — this is intentionally left unvalidated; the drawing itself shows the problem rather than the app second-guessing the user's numbers.
- On the canvas, slot blocks are painted in their own color, layered on top of the hub's plain perimeter blocks (`route-canvas.tsx`).

## Important math conventions

These decisions are already made and tested — don't rediscover them from scratch:

- **`angleFromXAxis`** (`lib/minecraft/geometry.ts`): pure math angle, `atan2(dz, dx)` in degrees, [0, 360). Unrelated to how the canvas is drawn — just a numeric reference value.
- **`compassDirection`/`compassBearing`**: Minecraft's real compass, where North = -Z, South = +Z, East = +X, West = -X. This is the value a player actually uses (matches the in-game compass/F3 screen).
- **The canvas is always drawn with North up** (`lib/minecraft/coordinates.ts`, `worldToScreen`/`screenToWorld`): Z increases **downward** on screen. This is deliberate and not the generic-Cartesian default (Z up) — it was fixed after noticing the visual direction (line going "up") didn't match the real Minecraft compass direction ("Southeast"), which would confuse any player. Minecraft maps (F3, in-game map, Chunkbase, BlueMap) always show North up — this app follows the same convention. A fixed "N" compass marker is drawn in the canvas corner. If you ever change the sign convention here, also update `panViewportByScreenDelta` in `route-canvas.tsx` — it hardcodes the same sign and won't update itself, which previously caused inverted vertical dragging.
- **Even widths**: can't be centered exactly on a block grid. The extra block goes on the positive side of the route's perpendicular (e.g. width 4 → offsets `[-1, 0, 1, 2]`). Odd widths center perfectly (e.g. width 3 → `[-1, 0, 1]`).
- **Hub radius 0**: the tunnel starts at the center (origin) itself.
- **Portal inside the hub radius**: no tunnel to build (`tunnel.length === 0`, `centerline`/`corridorBlocks` empty).
- **Origin === destination**: handled explicitly in the UI ("origin and destination are the same point"), with no angle/direction computed. A brand-new path defaults its destination to the hub origin exactly, so it starts in this state until the user edits it.
- **`rasterizeOrthogonalPath`** (`lib/minecraft/line-rasterization.ts`): by default travels the dominant axis (larger of `|dx|`/`|dz|`) first, out of the hub, so the corner sits as close to the destination as possible; ties go to X. `invert: true` swaps to the minor axis first. When start and end already share an axis, both orders degenerate to the same single leg, identical to `rasterizeLine`.
- **`rasterizeCircle`** (`lib/minecraft/line-rasterization.ts`): the hub boundary is drawn pixelated — the same block-square rendering as a path's corridor/centerline — rather than a smooth curve, to represent the actual ring of blocks a player would place. Uses the midpoint (Bresenham) circle algorithm (one octant, mirrored 8-way) so the ring has no gaps. This is purely a drawing concern: `findHubExit` (`geometry.ts`) still does the exact, non-rasterized circle-intersection math: don't wire `rasterizeCircle` into it.

## Paths list: interaction model

The list in the sidebar (`saved-paths-list.tsx`) is a deliberate choice, made explicitly by the user, among two options: **edit-with-confirmation** (chosen) vs. inline autosave (like the Hub section uses). This means path fields behave differently from hub fields — don't blur that distinction:

- Path fields (title, destination, tunnel width, route style, axis order) are **not** shown inline in a compact list row. A row shows a compact summary (title, coordinates, style/width description) plus four controls: select (click the row body), visibility toggle, edit (pencil), delete.
- Fields only become editable inside an expanded form, reached via the **"+ Novo caminho"** button (for a new path) or the pencil button (for an existing one). The same `PathEditForm` component is reused for both. Edits are **not** persisted until "Salvar" is pressed; "Cancelar" discards them. Only one path can be in edit mode at a time (creating/editing one disables the others' edit/delete buttons and the "+ Novo caminho" button).
- **Selection** (`selectedId` in `route-planner.tsx`) is a separate concept from both visibility and editing: clicking a row's body selects it, which determines which path draws as the bright/primary one on the canvas — it does not open the edit form and does not affect what's persisted.
- While a path is being created/edited, the canvas mirrors the draft's unsaved field values live (`saved-paths-list.tsx` reports the draft up via `onDraftChange`; `route-planner.tsx` holds it as `editingPreview` and uses it, in place of the selected path, to compute the bright/primary route). This preview takes over the primary slot regardless of the underlying path's own visibility toggle — what's being typed matters more than the saved visibility state while editing — and the path being edited is excluded from the muted "other paths" set so it isn't drawn twice. Nothing here touches persistence; only "Salvar" does.

## Persistence (localStorage)

`lib/storage/route-planner-storage.ts` splits state across **two separate localStorage records**, deliberately not merged — mirroring the hub/paths split above:

- `nether-route-planner:paths` — the list of paths. Each entry: `id`, `title`, `destination` (X, Z), `tunnelWidth`, `routeStyle`, `invertAxisOrder`, `visible` (canvas visibility), `savedAt`.
- `nether-route-planner:settings` — hub `origin`, `hubRadius`, and the optional `portalCount`/`portalWidth` (see **Portal capacity** above). Persisted automatically whenever any of them changes (no explicit save step, unlike paths — see **interaction model** above).

Both loaders normalize missing fields on stored entries rather than rejecting them, and ignore unrecognized extra fields rather than treating them as invalid:

- `visible` missing on a path → normalized to `true`.
- `tunnelWidth` missing on a path → normalized to `3` (`DEFAULT_TUNNEL_WIDTH` in that file).
- `loadHubSettings` only requires `origin`/`hubRadius` to be present and well-typed; any other fields on the stored object are ignored.
- `portalCount`/`portalWidth` missing or not a positive number → normalized to `undefined` each, independently (not to a fallback default — see **Portal capacity** above for why).

## Stack and architecture

- Next.js (App Router) + TypeScript + React + Tailwind CSS
- No backend — everything is client-side; persistence is browser localStorage only (see **Persistence** above)
- Vitest for tests (math layer only, 106 tests)
- Structure:
  ```
  src/
    app/                          # page shell (layout, page)
    components/route-planner/     # UI (client components)
      route-planner.tsx           # state + composition: hub settings, paths list, selection, canvas wiring
      coordinate-input.tsx        # X/Z field pair
      number-field.tsx            # generic numeric field (radius/width), always required
      optional-number-field.tsx   # like number-field, but empty is a valid "unset" state (portal count/width)
      route-style-toggle.tsx      # diagonal/orthogonal picker + axis-invert checkbox
      saved-paths-list.tsx        # the paths list: select/create/edit/delete/show-hide, edit-with-confirmation form
      route-canvas.tsx            # Canvas2D: grid, hub circle, portal capacity slots, centerline/corridor, path title labels, pan/zoom, compass — draws the hub once plus every visible path (selected path full color on top, others muted underneath)
      route-controls.tsx          # zoom in/out/center buttons
    lib/minecraft/                # pure logic, testable, no React dependency
      geometry.ts                 # distance, delta, angle, compass, circle intersection
      line-rasterization.ts       # Bresenham + orthogonal ("L"-shaped) path + hub-circle rasterization
      tunnel.ts                   # width -> offsets, corridor, area estimate
      portals.ts                  # distributes optional hub portal capacity around the pixelated perimeter
      coordinates.ts              # world<->screen transforms, zoom/fit
      route.ts                    # planRoute(): composes everything into one result for the UI, for a single path at a time
    lib/storage/                  # browser persistence, no React dependency
      route-planner-storage.ts    # localStorage read/write for the paths list + hub settings
  ```

The math layer (`lib/minecraft`) was implemented and tested first, before any UI — geometry, rasterization, tunnel width, and circle intersection are the parts most worth getting right; the UI is built on top of it, not the other way around. `planRoute()` always plans exactly one path; rendering multiple paths on the canvas means calling it once per visible path (see `route-planner.tsx`'s `primary`/`otherRoutes`), not teaching the math layer about lists.

The visualization uses Canvas2D (not SVG with thousands of DOM elements) because a route can have hundreds or thousands of blocks.

## Useful commands

```
npm run dev          # dev server (the user prefers to start this manually)
npm run build         # production build
npm run test          # vitest run (math layer)
npm run test:watch    # vitest in watch mode
npx tsc --noEmit       # type-check
npx eslint .           # lint
```

**Important:** the user prefers to start `npm run dev` manually — don't run the dev server on your own unless explicitly asked, or it's needed to verify a visual change (in that case, always stop it afterward, checking the actual port it's bound to rather than just the npm wrapper's PID).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
