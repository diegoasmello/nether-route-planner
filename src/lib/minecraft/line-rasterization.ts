/**
 * Turns the continuous origin->destination line into the discrete sequence
 * of Minecraft blocks a player would actually place, using a symmetric
 * integer Bresenham line algorithm (handles every octant, including
 * vertical/horizontal lines and the degenerate single-point case).
 */

import type { Point } from "./geometry";

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
