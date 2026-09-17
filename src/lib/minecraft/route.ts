/**
 * Composes geometry, hub-margin, rasterization and tunnel-corridor
 * calculations into a single route plan — the one function the UI needs.
 */

import {
  angleFromXAxis,
  compassBearing,
  compassDirection,
  delta,
  distance,
  findHubExit,
  isSamePoint,
  type CompassDirection,
  type Delta,
  type Point,
} from "./geometry";
import { rasterizeLine, rasterizeOrthogonalPath, type BlockCoord } from "./line-rasterization";
import { buildTunnelCorridor, estimateTunnelArea } from "./tunnel";

/**
 * "diagonal": follow the ideal line exactly (Bresenham), producing the
 * jagged block staircase a true diagonal requires.
 * "orthogonal": two straight, axis-aligned legs (see `rasterizeOrthogonalPath`)
 * — easier to build, at the cost of no longer following the ideal line.
 */
export type RouteStyle = "diagonal" | "orthogonal";

export interface RoutePlanInput {
  readonly origin: Point;
  readonly destination: Point;
  readonly hubRadius: number;
  readonly tunnelWidth: number;
  readonly routeStyle: RouteStyle;
  /**
   * Only meaningful when `routeStyle === "orthogonal"`: swaps which axis is
   * traveled first (the minor axis instead of the dominant one). Ignored
   * for "diagonal", which has no such split to invert.
   */
  readonly invertAxisOrder?: boolean;
}

export interface RoutePlanResult {
  readonly origin: Point;
  readonly destination: Point;
  readonly delta: Delta;
  readonly distance: number;
  readonly angleFromXAxis: number;
  readonly compassBearing: number;
  readonly compassDirection: CompassDirection | null;
  readonly isSamePoint: boolean;
  readonly hub: {
    readonly radius: number;
    readonly withinHub: boolean;
    readonly exitPoint: Point;
  };
  readonly tunnel: {
    readonly start: Point;
    readonly end: Point;
    readonly length: number;
    readonly width: number;
    readonly style: RouteStyle;
    readonly centerline: BlockCoord[];
    readonly corridorBlocks: BlockCoord[];
    readonly approxArea: number;
  };
}

function dedupeBlocks(blocks: readonly BlockCoord[]): BlockCoord[] {
  const seen = new Set<string>();
  const result: BlockCoord[] = [];
  for (const block of blocks) {
    const key = `${block.x},${block.z}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(block);
    }
  }
  return result;
}

export function planRoute(input: RoutePlanInput): RoutePlanResult {
  const { origin, destination, hubRadius, tunnelWidth, routeStyle, invertAxisOrder = false } = input;

  const hubExit = findHubExit(origin, destination, hubRadius);
  const tunnelStart = hubExit.exitPoint;
  const tunnelEnd = destination;
  const tunnelLength = distance(tunnelStart, tunnelEnd);

  let centerline: BlockCoord[] = [];
  let corridorBlocks: BlockCoord[] = [];

  if (tunnelLength > 0) {
    if (routeStyle === "orthogonal") {
      const path = rasterizeOrthogonalPath(tunnelStart, tunnelEnd, invertAxisOrder);
      centerline = path.centerline;
      corridorBlocks = dedupeBlocks(
        path.legs
          .filter((leg) => leg.direction.x !== 0 || leg.direction.z !== 0)
          .flatMap((leg) => buildTunnelCorridor(leg.centerline, leg.direction, tunnelWidth)),
      );
    } else {
      centerline = rasterizeLine(tunnelStart, tunnelEnd);
      const routeDelta = delta(origin, destination);
      corridorBlocks = buildTunnelCorridor(centerline, { x: routeDelta.dx, z: routeDelta.dz }, tunnelWidth);
    }
  }

  return {
    origin,
    destination,
    delta: delta(origin, destination),
    distance: distance(origin, destination),
    angleFromXAxis: angleFromXAxis(origin, destination),
    compassBearing: compassBearing(origin, destination),
    compassDirection: compassDirection(origin, destination),
    isSamePoint: isSamePoint(origin, destination),
    hub: {
      radius: Math.max(0, hubRadius),
      withinHub: hubExit.withinHub,
      exitPoint: hubExit.exitPoint,
    },
    tunnel: {
      start: tunnelStart,
      end: tunnelEnd,
      length: tunnelLength,
      width: Math.max(1, Math.floor(tunnelWidth)),
      style: routeStyle,
      centerline,
      corridorBlocks,
      approxArea: estimateTunnelArea(tunnelLength, tunnelWidth),
    },
  };
}

export type { Point, Delta, CompassDirection } from "./geometry";
export type { BlockCoord } from "./line-rasterization";
