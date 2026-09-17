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

The app computes and displays:

- ΔX, ΔZ, Euclidean distance, angle, direction (Minecraft compass)
- The hub circle and the point where the origin→destination line crosses it (that point is the **effective tunnel start** — the hub margin never changes the route's direction, only where it starts being "built")
- The line's rasterization into blocks (Bresenham) from the tunnel start to the destination
- The block corridor for the configured width, centered on the route's direction (not on the block-by-block rasterized line, to avoid a jagged edge)
- Approximate area/volume estimates (explicitly labeled as approximate, since the discrete rasterization can overlap itself)
- A copyable list of the trajectory's coordinates, for use while building in game

Y is not part of any calculation — everything happens on the horizontal X/Z plane.

## Important math conventions

These decisions are already made and tested — don't rediscover them from scratch:

- **`angleFromXAxis`** (`lib/minecraft/geometry.ts`): pure math angle, `atan2(dz, dx)` in degrees, [0, 360). Unrelated to how the canvas is drawn — just a numeric reference value.
- **`compassDirection`/`compassBearing`**: Minecraft's real compass, where North = -Z, South = +Z, East = +X, West = -X. This is the value a player actually uses (matches the in-game compass/F3 screen).
- **The canvas is always drawn with North up** (`lib/minecraft/coordinates.ts`, `worldToScreen`/`screenToWorld`): Z increases **downward** on screen. This is deliberate and not the generic-Cartesian default (Z up) — it was fixed after noticing the visual direction (line going "up") didn't match the real Minecraft compass direction ("Southeast"), which would confuse any player. Minecraft maps (F3, in-game map, Chunkbase, BlueMap) always show North up — this app follows the same convention. A fixed "N" compass marker is drawn in the canvas corner. If you ever change the sign convention here, also update `panViewportByScreenDelta` in `route-canvas.tsx` — it hardcodes the same sign and won't update itself, which previously caused inverted vertical dragging.
- **Even widths**: can't be centered exactly on a block grid. The extra block goes on the positive side of the route's perpendicular (e.g. width 4 → offsets `[-1, 0, 1, 2]`). Odd widths center perfectly (e.g. width 3 → `[-1, 0, 1]`).
- **Hub radius 0**: the tunnel starts at the center (origin) itself.
- **Portal inside the hub radius**: no tunnel to build (`tunnel.length === 0`, `centerline`/`corridorBlocks` empty).
- **Origin === destination**: handled explicitly in the UI ("origin and destination are the same point"), with no angle/direction computed.

## Stack and architecture

- Next.js (App Router) + TypeScript + React + Tailwind CSS
- No backend — everything is client-side
- Vitest for tests (math layer only, 75 tests)
- Structure:
  ```
  src/
    app/                          # page shell (layout, page)
    components/route-planner/     # UI (client components)
      route-planner.tsx           # state + composition
      coordinate-input.tsx        # X/Z field pair
      number-field.tsx            # generic numeric field (radius/width/height)
      route-results.tsx           # numeric results panel
      route-canvas.tsx            # Canvas2D: grid, hub circle, ideal line, corridor, pan/zoom, compass
      route-controls.tsx          # zoom in/out/center buttons
      route-coordinate-list.tsx   # collapsible list + copy coordinates
    lib/minecraft/                # pure logic, testable, no React dependency
      geometry.ts                 # distance, delta, angle, compass, circle intersection
      line-rasterization.ts       # Bresenham
      tunnel.ts                   # width -> offsets, corridor, area/volume estimates
      coordinates.ts              # world<->screen transforms, zoom/fit
      route.ts                    # planRoute(): composes everything into one result for the UI
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
