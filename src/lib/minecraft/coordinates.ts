/**
 * Pure world<->screen coordinate transforms for the pan/zoom canvas.
 *
 * "World" coordinates are real Minecraft X/Z. "Screen" coordinates are
 * pixels within the canvas element. Z is drawn increasing *downward* (screen
 * up = -Z = North), matching Minecraft's own map conventions (F3 debug
 * screen, in-game maps, third-party map viewers) so a route's on-screen
 * direction always matches the compass direction reported in the results.
 */

import type { Point } from "./geometry";

export interface Viewport {
  /** World point currently rendered at the center of the canvas. */
  readonly center: Point;
  /** Pixels per block. */
  readonly scale: number;
}

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export function worldToScreen(
  point: Point,
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number,
): ScreenPoint {
  return {
    x: canvasWidth / 2 + (point.x - viewport.center.x) * viewport.scale,
    y: canvasHeight / 2 + (point.z - viewport.center.z) * viewport.scale,
  };
}

export function screenToWorld(
  screen: ScreenPoint,
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number,
): Point {
  return {
    x: viewport.center.x + (screen.x - canvasWidth / 2) / viewport.scale,
    z: viewport.center.z + (screen.y - canvasHeight / 2) / viewport.scale,
  };
}

/** Clamps zoom scale to a sane, always-visible range (pixels per block). */
export function clampScale(scale: number): number {
  const MIN_SCALE = 0.05;
  const MAX_SCALE = 64;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Smallest viewport (center + scale) that fits every given point with a pixel margin. */
export function fitViewport(
  points: readonly Point[],
  canvasWidth: number,
  canvasHeight: number,
  paddingPx = 48,
): Viewport {
  if (points.length === 0) {
    return { center: { x: 0, z: 0 }, scale: 1 };
  }

  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);

  const center = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
  const spanX = Math.max(1, maxX - minX);
  const spanZ = Math.max(1, maxZ - minZ);

  const availableWidth = Math.max(1, canvasWidth - paddingPx * 2);
  const availableHeight = Math.max(1, canvasHeight - paddingPx * 2);

  const scale = clampScale(Math.min(availableWidth / spanX, availableHeight / spanZ));

  return { center, scale };
}
