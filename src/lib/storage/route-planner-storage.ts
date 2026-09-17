/**
 * Persistence for the route planner's browser-local state: the list of
 * saved paths (portal + style, one per destination) and the shared hub
 * settings (center, radius, tunnel width/height) that apply to all of them.
 *
 * Two separate localStorage records on purpose: hub settings are shared
 * across every saved path, so they don't belong duplicated on each entry.
 */

import type { Point, RouteStyle } from "@/lib/minecraft/route";

export interface SavedPath {
  readonly id: string;
  readonly title: string;
  readonly destination: Point;
  readonly routeStyle: RouteStyle;
  readonly invertAxisOrder: boolean;
  /** Whether this path is drawn on the canvas. Defaults to true (see loadSavedPaths). */
  readonly visible: boolean;
  readonly savedAt: string;
}

export interface SharedRouteSettings {
  readonly origin: Point;
  readonly hubRadius: number;
  readonly tunnelWidth: number;
  readonly tunnelHeight: number;
}

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

// `visible` is checked separately (not required) so paths saved before it
// existed still load — they're normalized to `visible: true` below.
function isSavedPathShape(value: unknown): value is Omit<SavedPath, "visible"> & { visible?: unknown } {
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
    return parsed.filter(isSavedPathShape).map((v) => ({ ...v, visible: typeof v.visible === "boolean" ? v.visible : true }));
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

export function loadSharedSettings(): SharedRouteSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      !isPoint(parsed.origin) ||
      typeof parsed.hubRadius !== "number" ||
      typeof parsed.tunnelWidth !== "number" ||
      typeof parsed.tunnelHeight !== "number"
    ) {
      return null;
    }
    return {
      origin: parsed.origin,
      hubRadius: parsed.hubRadius,
      tunnelWidth: parsed.tunnelWidth,
      tunnelHeight: parsed.tunnelHeight,
    };
  } catch {
    return null;
  }
}

export function persistSharedSettings(settings: SharedRouteSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable — settings just won't survive a reload
  }
}
