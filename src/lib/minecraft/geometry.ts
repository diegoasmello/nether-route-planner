/**
 * Core geometry for the Nether Hub route planner.
 *
 * All coordinates are real-valued (not yet snapped to a block grid) so that
 * distances, angles and hub-circle intersections stay mathematically exact.
 * Snapping to integer blocks only happens in `lineRasterization.ts`.
 */

export interface Point {
  readonly x: number;
  readonly z: number;
}

export interface Delta {
  readonly dx: number;
  readonly dz: number;
}

export type CompassDirection =
  | "Norte"
  | "Nordeste"
  | "Leste"
  | "Sudeste"
  | "Sul"
  | "Sudoeste"
  | "Oeste"
  | "Noroeste";

export function delta(origin: Point, destination: Point): Delta {
  return { dx: destination.x - origin.x, dz: destination.z - origin.z };
}

export function distance(origin: Point, destination: Point): number {
  const { dx, dz } = delta(origin, destination);
  return Math.sqrt(dx * dx + dz * dz);
}

export function isSamePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.z === b.z;
}

/**
 * Angle of the origin->destination vector measured from the positive X
 * axis, counterclockwise, in the plot's X/Z plane (Z increases "up" like a
 * standard Cartesian chart, matching how the route is drawn on screen).
 * Range: [0, 360). Returns 0 when origin === destination.
 */
export function angleFromXAxis(origin: Point, destination: Point): number {
  const { dx, dz } = delta(origin, destination);
  if (dx === 0 && dz === 0) return 0;
  const raw = Math.atan2(dz, dx) * (180 / Math.PI);
  return raw < 0 ? raw + 360 : raw;
}

/**
 * In-game Minecraft compass bearing of the origin->destination vector:
 * 0 = North (-Z), 90 = East (+X), 180 = South (+Z), 270 = West (-X).
 * Range: [0, 360). Returns 0 when origin === destination.
 */
export function compassBearing(origin: Point, destination: Point): number {
  const { dx, dz } = delta(origin, destination);
  if (dx === 0 && dz === 0) return 0;
  const raw = Math.atan2(dx, -dz) * (180 / Math.PI);
  return raw < 0 ? raw + 360 : raw;
}

const COMPASS_DIRECTIONS: readonly CompassDirection[] = [
  "Norte",
  "Nordeste",
  "Leste",
  "Sudeste",
  "Sul",
  "Sudoeste",
  "Oeste",
  "Noroeste",
];

/** Nearest of the 8 Minecraft compass directions, or null if the points coincide. */
export function compassDirection(origin: Point, destination: Point): CompassDirection | null {
  if (isSamePoint(origin, destination)) return null;
  const bearing = compassBearing(origin, destination);
  const index = Math.round(bearing / 45) % 8;
  return COMPASS_DIRECTIONS[index];
}

export interface HubExitResult {
  /** True if the destination itself lies within (or exactly on) the hub radius. */
  readonly withinHub: boolean;
  /**
   * Point where the straight route leaves the hub's circular area — the
   * effective start of the tunnel. Always lies on the same origin->destination
   * ray; the route's direction is never altered by the hub margin.
   */
  readonly exitPoint: Point;
}

/**
 * Finds where the origin->destination line crosses the hub boundary, a
 * circle of `hubRadius` centered on the origin (the hub center never moves).
 */
export function findHubExit(origin: Point, destination: Point, hubRadius: number): HubExitResult {
  const radius = Math.max(0, hubRadius);
  const totalDistance = distance(origin, destination);

  if (radius === 0 || totalDistance === 0) {
    return { withinHub: totalDistance <= radius, exitPoint: origin };
  }

  if (totalDistance <= radius) {
    return { withinHub: true, exitPoint: destination };
  }

  const { dx, dz } = delta(origin, destination);
  const t = radius / totalDistance;
  return {
    withinHub: false,
    exitPoint: { x: origin.x + dx * t, z: origin.z + dz * t },
  };
}
