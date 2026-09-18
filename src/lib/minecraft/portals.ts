/**
 * Distributes a hub's portal capacity evenly around its already-pixelated
 * perimeter (see `rasterizeCircle`), independent of the paths list — this
 * is purely a "how many slots fit" visualization, not tied to any actual
 * configured destination. A hub doesn't need to use every slot; leftover
 * perimeter space is left for the player to place portals freely.
 */

import { angleFromXAxis, type Point } from "./geometry";
import { rasterizeCircle, type BlockCoord } from "./line-rasterization";
import { widthOffsets } from "./tunnel";

export interface PortalSlot {
  readonly index: number;
  readonly blocks: BlockCoord[];
}

/**
 * Portal #0 is fixed at angle 0 (East, +X — the same reference as
 * `angleFromXAxis`); the rest are spaced evenly by position around the
 * perimeter ring, not by exact angle, since the ring's block density from
 * `rasterizeCircle` isn't perfectly uniform. Each slot is a contiguous run
 * of `portalWidth` perimeter blocks, using the same even/odd centering
 * convention as tunnel width (`widthOffsets`). Slots can overlap when
 * `portalCount * portalWidth` exceeds the perimeter length — this is left
 * visible rather than validated against, so the player sees the problem
 * directly in the drawing.
 *
 * Returns `[]` when the hub has no radius, or when either count or width
 * isn't a positive number (the feature is opt-in — see `HubSettings`).
 */
export function distributePortalsOnHub(
  center: Point,
  radius: number,
  portalCount: number,
  portalWidth: number,
): PortalSlot[] {
  if (radius <= 0 || portalCount <= 0 || portalWidth <= 0) return [];

  const perimeter = rasterizeCircle(center, radius);
  const n = perimeter.length;
  if (n === 0) return [];

  // `angleFromXAxis` is already normalized to [0, 360), 0 = East (+X), so
  // sorting by it puts the block closest to that reference at index 0.
  const ordered = [...perimeter].sort(
    (a, b) => angleFromXAxis(center, a) - angleFromXAxis(center, b),
  );

  const count = Math.floor(portalCount);
  const offsets = widthOffsets(portalWidth);

  const slots: PortalSlot[] = [];
  for (let i = 0; i < count; i++) {
    const centerIndex = Math.round((i * n) / count);
    const blocks = offsets.map((offset) => ordered[((centerIndex + offset) % n + n) % n]);
    slots.push({ index: i, blocks });
  }
  return slots;
}
