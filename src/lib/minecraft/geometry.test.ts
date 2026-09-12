import { describe, expect, it } from "vitest";
import {
  angleFromXAxis,
  compassBearing,
  compassDirection,
  delta,
  distance,
  findHubExit,
  isSamePoint,
} from "./geometry";

describe("delta", () => {
  it("computes signed differences", () => {
    expect(delta({ x: 100, z: -50 }, { x: 237, z: 184 })).toEqual({ dx: 137, dz: 234 });
  });

  it("handles negative coordinates in both quadrant directions", () => {
    expect(delta({ x: -500, z: -300 }, { x: 200, z: 450 })).toEqual({ dx: 700, dz: 750 });
  });
});

describe("distance", () => {
  it("computes euclidean distance", () => {
    expect(distance({ x: 0, z: 0 }, { x: 3, z: 4 })).toBe(5);
  });

  it("is zero when origin equals destination", () => {
    expect(distance({ x: 10, z: 10 }, { x: 10, z: 10 })).toBe(0);
  });

  it("matches the worked example from the spec", () => {
    const d = distance({ x: 100, z: -50 }, { x: 237, z: 184 });
    expect(d).toBeCloseTo(271.155, 2);
  });

  it("handles a horizontal line (same Z)", () => {
    expect(distance({ x: -10, z: 5 }, { x: 20, z: 5 })).toBe(30);
  });

  it("handles a vertical line (same X)", () => {
    expect(distance({ x: 5, z: -10 }, { x: 5, z: 20 })).toBe(30);
  });

  it("handles negative coordinates", () => {
    expect(distance({ x: -500, z: -300 }, { x: 200, z: 450 })).toBeCloseTo(1025.914, 2);
  });
});

describe("isSamePoint", () => {
  it("detects identical points", () => {
    expect(isSamePoint({ x: 1, z: 2 }, { x: 1, z: 2 })).toBe(true);
  });

  it("detects differing points", () => {
    expect(isSamePoint({ x: 1, z: 2 }, { x: 1, z: 3 })).toBe(false);
  });
});

describe("angleFromXAxis", () => {
  it("is 0 for a same point", () => {
    expect(angleFromXAxis({ x: 1, z: 1 }, { x: 1, z: 1 })).toBe(0);
  });

  it("is 0 along positive X", () => {
    expect(angleFromXAxis({ x: 0, z: 0 }, { x: 10, z: 0 })).toBe(0);
  });

  it("is 90 along positive Z", () => {
    expect(angleFromXAxis({ x: 0, z: 0 }, { x: 0, z: 10 })).toBe(90);
  });

  it("is 180 along negative X", () => {
    expect(angleFromXAxis({ x: 0, z: 0 }, { x: -10, z: 0 })).toBe(180);
  });

  it("is 270 along negative Z", () => {
    expect(angleFromXAxis({ x: 0, z: 0 }, { x: 0, z: -10 })).toBe(270);
  });

  it("matches the spec's worked example (~59.65 degrees)", () => {
    expect(angleFromXAxis({ x: 100, z: -50 }, { x: 237, z: 184 })).toBeCloseTo(59.65, 1);
  });

  it("stays within [0, 360)", () => {
    const angle = angleFromXAxis({ x: 0, z: 0 }, { x: -5, z: -5 });
    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThan(360);
  });
});

describe("compassBearing", () => {
  it("is 0 (North) toward -Z", () => {
    expect(compassBearing({ x: 0, z: 0 }, { x: 0, z: -10 })).toBe(0);
  });

  it("is 90 (East) toward +X", () => {
    expect(compassBearing({ x: 0, z: 0 }, { x: 10, z: 0 })).toBe(90);
  });

  it("is 180 (South) toward +Z", () => {
    expect(compassBearing({ x: 0, z: 0 }, { x: 0, z: 10 })).toBe(180);
  });

  it("is 270 (West) toward -X", () => {
    expect(compassBearing({ x: 0, z: 0 }, { x: -10, z: 0 })).toBe(270);
  });
});

describe("compassDirection", () => {
  it("returns null for a same point", () => {
    expect(compassDirection({ x: 1, z: 1 }, { x: 1, z: 1 })).toBeNull();
  });

  it("returns Nordeste for a NE-ish vector", () => {
    expect(compassDirection({ x: 0, z: 0 }, { x: 10, z: -10 })).toBe("Nordeste");
  });

  it("returns Sudoeste for a SW-ish vector", () => {
    expect(compassDirection({ x: 0, z: 0 }, { x: -10, z: 10 })).toBe("Sudoeste");
  });
});

describe("findHubExit", () => {
  it("returns the origin itself when radius is 0", () => {
    const result = findHubExit({ x: 0, z: 0 }, { x: 100, z: 0 }, 0);
    expect(result.exitPoint).toEqual({ x: 0, z: 0 });
    expect(result.withinHub).toBe(false);
  });

  it("finds the exit point along a horizontal ray", () => {
    const result = findHubExit({ x: 0, z: 0 }, { x: 100, z: 0 }, 20);
    expect(result.exitPoint).toEqual({ x: 20, z: 0 });
    expect(result.withinHub).toBe(false);
  });

  it("finds the exit point along a vertical ray", () => {
    const result = findHubExit({ x: 0, z: 0 }, { x: 0, z: 100 }, 20);
    expect(result.exitPoint).toEqual({ x: 0, z: 20 });
  });

  it("finds the exit point along a diagonal ray, preserving direction", () => {
    const origin = { x: 100, z: -50 };
    const destination = { x: 237, z: 184 };
    const result = findHubExit(origin, destination, 20);

    expect(result.withinHub).toBe(false);
    // Exit point must sit exactly `radius` blocks from the origin.
    const dx = result.exitPoint.x - origin.x;
    const dz = result.exitPoint.z - origin.z;
    expect(Math.hypot(dx, dz)).toBeCloseTo(20, 6);

    // Exit point must lie on the same ray (same normalized direction) as destination.
    const totalDx = destination.x - origin.x;
    const totalDz = destination.z - origin.z;
    const angleToExit = Math.atan2(dz, dx);
    const angleToDestination = Math.atan2(totalDz, totalDx);
    expect(angleToExit).toBeCloseTo(angleToDestination, 6);
  });

  it("reports withinHub when the destination is inside the hub radius", () => {
    const result = findHubExit({ x: 0, z: 0 }, { x: 5, z: 0 }, 20);
    expect(result.withinHub).toBe(true);
    expect(result.exitPoint).toEqual({ x: 5, z: 0 });
  });

  it("reports withinHub when the destination sits exactly on the boundary", () => {
    const result = findHubExit({ x: 0, z: 0 }, { x: 20, z: 0 }, 20);
    expect(result.withinHub).toBe(true);
  });

  it("treats origin === destination as within any positive-radius hub", () => {
    const result = findHubExit({ x: 5, z: 5 }, { x: 5, z: 5 }, 20);
    expect(result.withinHub).toBe(true);
    expect(result.exitPoint).toEqual({ x: 5, z: 5 });
  });
});
