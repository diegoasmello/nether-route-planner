/**
 * Turns the continuous origin->destination line into the discrete sequence
 * of Minecraft blocks a player would actually place, using a symmetric
 * integer Bresenham line algorithm (handles every octant, including
 * vertical/horizontal lines and the degenerate single-point case).
 */

import { isSamePoint, type Point } from "./geometry";

export interface BlockCoord {
  readonly x: number;
  readonly z: number;
}

export function rasterizeLine(start: Point, end: Point): BlockCoord[] {
  let x0 = Math.round(start.x);
  let z0 = Math.round(start.z);
  const x1 = Math.round(end.x);
  const z1 = Math.round(end.z);

  const dx = Math.abs(x1 - x0);
  const dz = Math.abs(z1 - z0);
  const sx = x0 < x1 ? 1 : -1;
  const sz = z0 < z1 ? 1 : -1;
  let err = dx - dz;

  const blocks: BlockCoord[] = [];

  // Bounded by dx+dz+1 (the maximum possible step count) so a malformed
  // input can never spin this loop forever.
  const maxSteps = dx + dz + 1;
  for (let step = 0; step <= maxSteps; step++) {
    blocks.push({ x: x0, z: z0 });
    if (x0 === x1 && z0 === z1) break;
    const e2 = 2 * err;
    if (e2 > -dz) {
      err -= dz;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      z0 += sz;
    }
  }

  return blocks;
}

export interface OrthogonalLeg {
  readonly centerline: BlockCoord[];
  /** Leg direction, in world units (not normalized). Zero vector for a degenerate leg. */
  readonly direction: Point;
}

export interface OrthogonalPath {
  /** The point where the path bends from one axis to the other. */
  readonly corner: Point;
  /** One or two straight, axis-aligned legs, in travel order. */
  readonly legs: OrthogonalLeg[];
  readonly centerline: BlockCoord[];
}

/**
 * Rasterizes start->end as an "L"-shaped path of two straight, axis-aligned
 * segments instead of a single diagonal (see `rasterizeLine`) — the
 * alternative some players prefer to build, since it avoids the jagged
 * block-by-block staircase a true diagonal produces.
 *
 * By default, the dominant axis (whichever of |dx|/|dz| is larger) is
 * traveled first, out of the hub, so the corner sits as close to the
 * destination as possible; ties go to X. Pass `invert: true` to travel the
 * other (minor) axis first instead — e.g. to route around an obstacle near
 * the hub. When start and end already share an axis, both orders degenerate
 * to the same single straight leg, identical to `rasterizeLine`.
 */
export function rasterizeOrthogonalPath(start: Point, end: Point, invert = false): OrthogonalPath {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const xDominant = Math.abs(dx) >= Math.abs(dz);
  const xFirst = invert ? !xDominant : xDominant;
  const corner: Point = xFirst ? { x: end.x, z: start.z } : { x: start.x, z: end.z };

  const legs: OrthogonalLeg[] = [];
  if (!isSamePoint(start, corner)) {
    legs.push({
      centerline: rasterizeLine(start, corner),
      direction: { x: corner.x - start.x, z: corner.z - start.z },
    });
  }
  if (!isSamePoint(corner, end)) {
    legs.push({
      centerline: rasterizeLine(corner, end),
      direction: { x: end.x - corner.x, z: end.z - corner.z },
    });
  }
  if (legs.length === 0) {
    legs.push({ centerline: [{ x: start.x, z: start.z }], direction: { x: 0, z: 0 } });
  }

  const centerline: BlockCoord[] = [];
  for (const leg of legs) {
    centerline.push(...(centerline.length === 0 ? leg.centerline : leg.centerline.slice(1)));
  }

  return { corner, legs, centerline };
}

/**
 * Rasterizes the hub boundary (a circle of `radius` around `center`) into
 * the discrete ring of blocks a player would actually place, using the
 * midpoint (Bresenham) circle algorithm: one octant is computed with
 * integer arithmetic and mirrored 8-way, giving a gap-free pixelated ring
 * with no ordering or duplicates. Mirrors `rasterizeLine`'s role for
 * straight tunnels — the smooth math circle from `findHubExit` stays exact,
 * this is only how it's drawn/built. Returns `[]` for radius <= 0.
 */
export function rasterizeCircle(center: Point, radius: number): BlockCoord[] {
  const cx = Math.round(center.x);
  const cz = Math.round(center.z);
  const r = Math.round(radius);
  if (r <= 0) return [];

  const blocks: BlockCoord[] = [];
  const seen = new Set<string>();
  const addBlock = (x: number, z: number) => {
    const key = `${x},${z}`;
    if (seen.has(key)) return;
    seen.add(key);
    blocks.push({ x, z });
  };

  let x = r;
  let z = 0;
  let err = 1 - r;

  while (x >= z) {
    addBlock(cx + x, cz + z);
    addBlock(cx - x, cz + z);
    addBlock(cx + x, cz - z);
    addBlock(cx - x, cz - z);
    addBlock(cx + z, cz + x);
    addBlock(cx - z, cz + x);
    addBlock(cx + z, cz - x);
    addBlock(cx - z, cz - x);

    z++;
    if (err < 0) {
      err += 2 * z + 1;
    } else {
      x--;
      err += 2 * (z - x) + 1;
    }
  }

  return blocks;
}
