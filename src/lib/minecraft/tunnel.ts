/**
 * Widens a rasterized centerline into the full corridor of blocks that must
 * be opened to build a tunnel of a given width, keeping it centered on the
 * route direction (not on each individual Bresenham step, which would
 * produce a jagged corridor).
 */

import type { Point } from "./geometry";
import type { BlockCoord } from "./line-rasterization";

/**
 * Per-axis offsets (in blocks, perpendicular to the route) that make up a
 * corridor of the given width, centered on the trajectory.
 *
 * Odd widths are perfectly centered (e.g. width 3 -> [-1, 0, 1]).
 * Even widths cannot be centered exactly on a block grid, so the extra
 * block is placed on the positive side of the perpendicular direction
 * (e.g. width 4 -> [-1, 0, 1, 2]).
 */
export function widthOffsets(width: number): number[] {
  const w = Math.max(1, Math.floor(width));
  const before = Math.floor((w - 1) / 2);
  const after = Math.ceil((w - 1) / 2);
  const offsets: number[] = [];
  // `+ 0` normalizes -0 (produced by negating a `before` of 0) to +0.
  for (let i = -before; i <= after; i++) offsets.push(i + 0);
  return offsets;
}

/**
 * Builds the set of blocks forming the tunnel corridor: every centerline
 * block, offset perpendicular to the overall route direction by each of
 * `widthOffsets(width)`. Duplicate blocks (which can occur where the
 * discrete centerline steps overlap) are removed.
 */
export function buildTunnelCorridor(
  centerline: readonly BlockCoord[],
  direction: Point,
  width: number,
): BlockCoord[] {
  if (centerline.length === 0) return [];

  const offsets = widthOffsets(width);
  const length = Math.hypot(direction.x, direction.z);
  const perpendicular = length === 0 ? { x: 1, z: 0 } : { x: -direction.z / length, z: direction.x / length };

  const seen = new Set<string>();
  const corridor: BlockCoord[] = [];

  for (const block of centerline) {
    for (const offset of offsets) {
      const bx = Math.round(block.x + perpendicular.x * offset);
      const bz = Math.round(block.z + perpendicular.z * offset);
      const key = `${bx},${bz}`;
      if (!seen.has(key)) {
        seen.add(key);
        corridor.push({ x: bx, z: bz });
      }
    }
  }

  return corridor;
}

/**
 * Rough estimate only: the discrete corridor can overlap itself and does
 * not equal width * length exactly, especially on diagonal routes. Use this
 * purely as an order-of-magnitude figure, not a precise block count.
 */
export function estimateTunnelArea(length: number, width: number): number {
  return length * width;
}
