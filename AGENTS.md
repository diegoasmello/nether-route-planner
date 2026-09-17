# Nether Hub Route Planner

## What this project is

A web tool that helps plan **Nether Hubs in Minecraft**: a hub has a circular central area (where portals sit) from which straight tunnels radiate outward to destination portals. The tool computes the shortest-distance route between the hub center and a portal, and turns that mathematical line into a practical block-by-block path to build in game.

This is not a generic coordinate calculator — it's purpose-built for that workflow (planning/building hubs), with Minecraft-specific conventions and visualization.

## Core functionality

Given:

- **Origin** (hub center): X, Z
- **Destination** (portal): X, Z
- **Hub radius**: blocks to keep clear of tunnel around the center
- **Tunnel width**: blocks
- **Tunnel height**: blocks (used only for volume estimates — the view is 2D)
- **Route style**: `diagonal` (follow the ideal line exactly, jagged block staircase) or `orthogonal` (two straight axis-aligned legs, an "L", easier to build but doesn't follow the ideal line), plus an axis-order inversion that only applies to `orthogonal`

The app computes and displays:

- ΔX, ΔZ, Euclidean distance, angle, direction (Minecraft compass)
- The hub circle and the point where the origin→destination line crosses it (that point is the **effective tunnel start** — the hub margin never changes the route's direction, only where it starts being "built")
- The line's rasterization into blocks (Bresenham for `diagonal`, two Bresenham legs for `orthogonal`) from the tunnel start to the destination
- The block corridor for the configured width, centered on the route's direction (not on the block-by-block rasterized line, to avoid a jagged edge)
- Approximate area/volume estimates (explicitly labeled as approximate, since the discrete rasterization can overlap itself)
- A copyable list of the trajectory's coordinates, for use while building in game

Y is not part of any calculation — everything happens on the horizontal X/Z plane.

Portal configurations (portal X/Z, route style, axis inversion) can be saved as named "paths" and reloaded later — see **Saved paths (localStorage)** below. When the current form state exactly matches a visible saved path, its title is drawn on the canvas as a label at the midpoint of that route's ideal line (like a street name on a map app) — but always kept **horizontal**, never rotated to the line's angle, unlike a real map's street labels. The canvas can render **multiple saved paths at once** (see **Saved paths** below for the visibility toggle that controls this) — the route currently being edited draws in full color on top, other visible saved paths draw underneath in a muted violet so the active route stays visually dominant.

## Important math conventions

These decisions are already made and tested — don't rediscover them from scratch:

- **`angleFromXAxis`** (`lib/minecraft/geometry.ts`): pure math angle, `atan2(dz, dx)` in degrees, [0, 360). Unrelated to how the canvas is drawn — just a numeric reference value.
- **`compassDirection`/`compassBearing`**: Minecraft's real compass, where North = -Z, South = +Z, East = +X, West = -X. This is the value a player actually uses (matches the in-game compass/F3 screen).
- **The canvas is always drawn with North up** (`lib/minecraft/coordinates.ts`, `worldToScreen`/`screenToWorld`): Z increases **downward** on screen. This is deliberate and not the generic-Cartesian default (Z up) — it was fixed after noticing the visual direction (line going "up") didn't match the real Minecraft compass direction ("Southeast"), which would confuse any player. Minecraft maps (F3, in-game map, Chunkbase, BlueMap) always show North up — this app follows the same convention. A fixed "N" compass marker is drawn in the canvas corner. If you ever change the sign convention here, also update `panViewportByScreenDelta` in `route-canvas.tsx` — it hardcodes the same sign and won't update itself, which previously caused inverted vertical dragging.
- **Even widths**: can't be centered exactly on a block grid. The extra block goes on the positive side of the route's perpendicular (e.g. width 4 → offsets `[-1, 0, 1, 2]`). Odd widths center perfectly (e.g. width 3 → `[-1, 0, 1]`).
- **Hub radius 0**: the tunnel starts at the center (origin) itself.
- **Portal inside the hub radius**: no tunnel to build (`tunnel.length === 0`, `centerline`/`corridorBlocks` empty).
- **Origin === destination**: handled explicitly in the UI ("origin and destination are the same point"), with no angle/direction computed.
- **`rasterizeOrthogonalPath`** (`lib/minecraft/line-rasterization.ts`): by default travels the dominant axis (larger of `|dx|`/`|dz|`) first, out of the hub, so the corner sits as close to the destination as possible; ties go to X. `invert: true` swaps to the minor axis first. When start and end already share an axis, both orders degenerate to the same single leg, identical to `rasterizeLine`.

## Saved paths (localStorage)

Portal configurations can be saved, listed, reloaded, renamed, deleted, and shown/hidden from the sidebar (`saved-paths-list.tsx`), replacing what used to be a numeric results panel there. Persistence (`lib/storage/route-planner-storage.ts`) is split across **two separate localStorage records**, deliberately not merged:

- `nether-route-planner:paths` — the list of saved paths. Each entry is only the portal-specific fields: title, destination (X, Z), route style, axis inversion, and `visible` (whether it's drawn on the canvas).
- `nether-route-planner:settings` — hub center, hub radius, tunnel width, tunnel height. These are shared by every saved path (one hub, many portals), so they live outside any individual path entry and are persisted automatically whenever they change.

Loading a saved path only overwrites the destination/style/axis-inversion fields in the form — it never touches the hub center or radius/width/height, since those are shared state, not part of the saved path.

**Per-path visibility (`visible`)**: each saved path has a canvas visibility toggle, defaulting to `true` — both for newly saved paths and for paths saved before this field existed (`loadSavedPaths` normalizes any stored entry missing `visible` to `true`, so old localStorage data doesn't silently go invisible). Toggling it only affects whether that path is drawn on the canvas; it doesn't affect the saved list itself. `route-planner.tsx` computes the canvas's `otherRoutes` as every visible saved path *other than* the one matching the current form state (by destination + route style + axis inversion), each re-planned with `planRoute()` against the shared hub settings — so toggling or editing paths never requires touching `lib/minecraft/route.ts` itself, which only ever plans one route at a time.

## Stack and architecture

- Next.js (App Router) + TypeScript + React + Tailwind CSS
- No backend — everything is client-side; persistence is browser localStorage only (see **Saved paths** above)
- Vitest for tests (math layer only, 92 tests)
- Structure:
  ```
  src/
    app/                          # page shell (layout, page)
    components/route-planner/     # UI (client components)
      route-planner.tsx           # state + composition
      coordinate-input.tsx        # X/Z field pair
      number-field.tsx            # generic numeric field (radius/width/height)
      route-style-toggle.tsx      # diagonal/orthogonal picker + axis-invert checkbox
      saved-paths-list.tsx        # save/load/rename/delete/show-hide saved paths
      route-canvas.tsx            # Canvas2D: grid, hub circle, ideal line(s), corridor, path title labels, pan/zoom, compass — draws the current route plus every other visible saved path
      route-controls.tsx          # zoom in/out/center buttons
      route-coordinate-list.tsx   # collapsible list + copy coordinates
    lib/minecraft/                # pure logic, testable, no React dependency
      geometry.ts                 # distance, delta, angle, compass, circle intersection
      line-rasterization.ts       # Bresenham + orthogonal ("L"-shaped) path
      tunnel.ts                   # width -> offsets, corridor, area/volume estimates
      coordinates.ts              # world<->screen transforms, zoom/fit
      route.ts                    # planRoute(): composes everything into one result for the UI
    lib/storage/                  # browser persistence, no React dependency
      route-planner-storage.ts    # localStorage read/write for saved paths + shared settings
  ```

The math layer (`lib/minecraft`) was implemented and tested first, before any UI — geometry, rasterization, tunnel width, and circle intersection are the parts most worth getting right; the UI is built on top of it, not the other way around.

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
