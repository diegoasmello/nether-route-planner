/**
 * Persistence for the route planner's browser-local state, mirroring its
 * two-level mental model: hub settings (one hub: center + radius) and a
 * list of paths (many portals radiating from that hub), each path carrying
 * everything specific to it — destination, tunnel width, route style, axis
 * order.
 *
 * Two separate localStorage records on purpose: hub settings apply to every
 * path, so they don't belong duplicated on each entry.
 */

import type { Point, RouteStyle } from "@/lib/minecraft/route";

export interface SavedPath {
  readonly id: string;
  readonly title: string;
  readonly destination: Point;
  readonly tunnelWidth: number;
  readonly routeStyle: RouteStyle;
  readonly invertAxisOrder: boolean;
  /** Whether this path is drawn on the canvas. Defaults to true (see loadSavedPaths). */
  readonly visible: boolean;
  readonly savedAt: string;
}

export interface HubSettings {
  readonly origin: Point;
  readonly hubRadius: number;
  /**
   * How many portals the hub is built to support, and the width (in
   * blocks) reserved for each one on the hub's perimeter. Both are
   * optional and independent of each other and of the paths list — not
   * every hub is built to its maximum portal capacity, and any leftover
   * perimeter space is left for the player to use freely. Painting the
   * portal slots on the canvas requires both to be set; either missing
   * (or non-positive) means the feature is off, not a fallback value.
   */
  readonly portalCount?: number;
  readonly portalWidth?: number;
}

/** Fallback for paths saved before `tunnelWidth` moved from shared settings onto each path. */
const DEFAULT_TUNNEL_WIDTH = 3;

const PATHS_KEY = "nether-route-planner:paths";
const SETTINGS_KEY = "nether-route-planner:settings";

function isPoint(value: unknown): value is Point {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Point).x === "number" &&
    typeof (value as Point).z === "number"
  );
}

function isRouteStyle(value: unknown): value is RouteStyle {
  return value === "diagonal" || value === "orthogonal";
}

// `visible` and `tunnelWidth` are checked separately (not required) so paths
// saved before they existed still load — they're normalized below.
function isSavedPathShape(
  value: unknown,
): value is Omit<SavedPath, "visible" | "tunnelWidth"> & { visible?: unknown; tunnelWidth?: unknown } {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    isPoint(v.destination) &&
    isRouteStyle(v.routeStyle) &&
    typeof v.invertAxisOrder === "boolean" &&
    typeof v.savedAt === "string"
  );
}

export function loadSavedPaths(): SavedPath[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PATHS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedPathShape).map((v) => ({
      ...v,
      visible: typeof v.visible === "boolean" ? v.visible : true,
      tunnelWidth: typeof v.tunnelWidth === "number" ? v.tunnelWidth : DEFAULT_TUNNEL_WIDTH,
    }));
  } catch {
    return [];
  }
}

export function persistSavedPaths(paths: readonly SavedPath[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PATHS_KEY, JSON.stringify(paths));
  } catch {
    // storage unavailable (private mode, quota, ...) — saved list stays in-memory only
  }
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function loadHubSettings(): HubSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!isPoint(parsed.origin) || typeof parsed.hubRadius !== "number") {
      return null;
    }
    return {
      origin: parsed.origin,
      hubRadius: parsed.hubRadius,
      portalCount: isPositiveNumber(parsed.portalCount) ? parsed.portalCount : undefined,
      portalWidth: isPositiveNumber(parsed.portalWidth) ? parsed.portalWidth : undefined,
    };
  } catch {
    return null;
  }
}

export function persistHubSettings(settings: HubSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable — settings just won't survive a reload
  }
}
