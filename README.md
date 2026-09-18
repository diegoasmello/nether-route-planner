# Nether Hub Route Planner

A web tool for planning **Nether Hubs in Minecraft**. A hub is a circular central area (where portals sit) from which straight tunnels radiate outward to destination portals. This tool computes the shortest-distance route between the hub center and a portal, and turns that mathematical line into a practical block-by-block path to build in game.

It's not a generic coordinate calculator, it's purpose-built for the hub-planning workflow, with Minecraft-specific conventions and visualization (Minecraft compass directions, North-up map orientation, block rasterization, tunnel width/corridor, portal capacity slots).

## Features

- **Hub settings**: center (X, Z), radius, and optional portal capacity (slot count + width), edited inline, always persisted.
- **Paths**: any number of portal destinations, each with its own tunnel width, route style (`diagonal` or `orthogonal`), and axis order, managed as a list, with an edit-with-confirmation form (Salvar/Cancelar).
- For the selected path: ΔX, ΔZ, Euclidean distance, angle, and Minecraft compass direction.
- Hub circle intersection: the point where the origin→destination line crosses the hub radius (the effective tunnel start).
- Block-by-block rasterization of the route (Bresenham for diagonal routes, two Bresenham legs for orthogonal "L" routes) and of the hub's circular perimeter.
- Width-aware corridor rendering, centered on the route's direction, with an approximate area estimate.
- Canvas2D map view with pan/zoom, a North-up compass, and every visible path drawn at once (selected path in full color, others muted).
- Portal capacity visualization: evenly spaced portal slots around the hub perimeter.
- Everything persists to browser `localStorage`, no backend, no account.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + React + Tailwind CSS
- [Vitest](https://vitest.dev) for the math layer's test suite
- No backend, fully client-side, persistence via browser `localStorage`

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Useful commands

```bash
npm run dev          # start the dev server
npm run build        # production build
npm run test         # run the math layer test suite (vitest)
npm run test:watch   # vitest in watch mode
npx tsc --noEmit      # type-check
npx eslint .          # lint
```

## Project structure

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
    route-canvas.tsx            # Canvas2D: grid, hub circle, portal capacity slots, centerline/corridor, labels, pan/zoom, compass
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

The math layer (`lib/minecraft`) is implemented and tested independently of the UI, geometry, rasterization, tunnel width, and circle intersection are pure functions with no React dependency.

## Conventions worth knowing

- **The canvas is always drawn with North up** (Z increases downward on screen), matching Minecraft's own maps (F3, in-game map, Chunkbase, BlueMap), not generic Cartesian (Z up).
- **Compass direction** follows Minecraft's real compass: North = -Z, South = +Z, East = +X, West = -X.
- **Even tunnel/portal widths** can't be centered exactly on a block grid, so the extra block goes on the positive side of the route's perpendicular.
- Hub settings and paths are deliberately separate concepts, in the data model, the UI, and persistence (two separate `localStorage` records), see `AGENTS.md` for the full rationale.

For the complete set of design decisions and math conventions behind this project, see [`AGENTS.md`](./AGENTS.md).
