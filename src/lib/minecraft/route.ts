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
import { rasterizeLine, type BlockCoord } from "./lineRasterization";
import { buildTunnelCorridor, estimateTunnelArea, estimateTunnelVolume } from "./tunnel";

export interface RoutePlanInput {
  readonly origin: Point;
  readonly destination: Point;
  readonly hubRadius: number;
  readonly tunnelWidth: number;
  readonly tunnelHeight: number;
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
    readonly height: number;
    readonly centerline: BlockCoord[];
    readonly corridorBlocks: BlockCoord[];
    readonly approxArea: number;
    readonly approxVolume: number;
  };
}

export function planRoute(input: RoutePlanInput): RoutePlanResult {
  const { origin, destination, hubRadius, tunnelWidth, tunnelHeight } = input;

  const hubExit = findHubExit(origin, destination, hubRadius);
  const tunnelStart = hubExit.exitPoint;
  const tunnelEnd = destination;
  const tunnelLength = distance(tunnelStart, tunnelEnd);

  const centerline = tunnelLength === 0 ? [] : rasterizeLine(tunnelStart, tunnelEnd);
  const routeDelta = delta(origin, destination);
  const routeDirection: Point = { x: routeDelta.dx, z: routeDelta.dz };
  const corridorBlocks =
    centerline.length === 0 ? [] : buildTunnelCorridor(centerline, routeDirection, tunnelWidth);

  return {
    origin,
    destination,
    delta: routeDelta,
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
      height: Math.max(1, Math.floor(tunnelHeight)),
      centerline,
      corridorBlocks,
      approxArea: estimateTunnelArea(tunnelLength, tunnelWidth),
      approxVolume: estimateTunnelVolume(tunnelLength, tunnelWidth, tunnelHeight),
    },
  };
}

export type { Point, Delta, CompassDirection } from "./geometry";
export type { BlockCoord } from "./lineRasterization";
