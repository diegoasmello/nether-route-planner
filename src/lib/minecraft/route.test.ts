import { describe, expect, it } from "vitest";
import { planRoute } from "./route";

describe("planRoute", () => {
  it("matches the full worked example from the spec", () => {
    const result = planRoute({
      origin: { x: 100, z: -50 },
      destination: { x: 237, z: 184 },
      hubRadius: 20,
      tunnelWidth: 3,
      tunnelHeight: 3,
    });

    expect(result.delta).toEqual({ dx: 137, dz: 234 });
    expect(result.distance).toBeCloseTo(271.155, 2);
    expect(result.angleFromXAxis).toBeCloseTo(59.65, 1);
    expect(result.isSamePoint).toBe(false);
    expect(result.hub.withinHub).toBe(false);

    // The hub exit point must be exactly 20 blocks from the origin.
    const dx = result.hub.exitPoint.x - result.origin.x;
    const dz = result.hub.exitPoint.z - result.origin.z;
    expect(Math.hypot(dx, dz)).toBeCloseTo(20, 6);

    expect(result.tunnel.start).toEqual(result.hub.exitPoint);
    expect(result.tunnel.end).toEqual(result.destination);
    expect(result.tunnel.centerline.length).toBeGreaterThan(0);
    expect(result.tunnel.corridorBlocks.length).toBeGreaterThanOrEqual(result.tunnel.centerline.length);
    expect(result.tunnel.width).toBe(3);
    expect(result.tunnel.height).toBe(3);
  });

  it("handles origin === destination", () => {
    const result = planRoute({
      origin: { x: 5, z: 5 },
      destination: { x: 5, z: 5 },
      hubRadius: 20,
      tunnelWidth: 3,
      tunnelHeight: 3,
    });

    expect(result.isSamePoint).toBe(true);
    expect(result.distance).toBe(0);
    expect(result.compassDirection).toBeNull();
    expect(result.tunnel.length).toBe(0);
    expect(result.tunnel.centerline).toEqual([]);
    expect(result.tunnel.corridorBlocks).toEqual([]);
    expect(result.tunnel.approxArea).toBe(0);
    expect(result.tunnel.approxVolume).toBe(0);
  });

  it("reports no tunnel needed when the portal is inside the hub radius", () => {
    const result = planRoute({
      origin: { x: 0, z: 0 },
      destination: { x: 5, z: 5 },
      hubRadius: 20,
      tunnelWidth: 3,
      tunnelHeight: 3,
    });

    expect(result.hub.withinHub).toBe(true);
    expect(result.tunnel.length).toBe(0);
    expect(result.tunnel.centerline).toEqual([]);
  });

  it("handles a hub radius of zero (tunnel starts at the hub center)", () => {
    const result = planRoute({
      origin: { x: 0, z: 0 },
      destination: { x: 50, z: 0 },
      hubRadius: 0,
      tunnelWidth: 3,
      tunnelHeight: 3,
    });

    expect(result.hub.exitPoint).toEqual({ x: 0, z: 0 });
    expect(result.tunnel.length).toBe(50);
  });

  it("handles a purely horizontal route (same Z)", () => {
    const result = planRoute({
      origin: { x: -10, z: 5 },
      destination: { x: 20, z: 5 },
      hubRadius: 0,
      tunnelWidth: 3,
      tunnelHeight: 3,
    });

    expect(result.compassDirection).toBe("Leste");
    expect(result.tunnel.centerline.every((b) => b.z === 5)).toBe(true);
  });

  it("handles a purely vertical route (same X)", () => {
    const result = planRoute({
      origin: { x: 5, z: -10 },
      destination: { x: 5, z: 20 },
      hubRadius: 0,
      tunnelWidth: 3,
      tunnelHeight: 3,
    });

    expect(result.compassDirection).toBe("Sul");
    expect(result.tunnel.centerline.every((b) => b.x === 5)).toBe(true);
  });

  it("handles negative coordinates across quadrants", () => {
    const result = planRoute({
      origin: { x: -500, z: -300 },
      destination: { x: 200, z: 450 },
      hubRadius: 20,
      tunnelWidth: 3,
      tunnelHeight: 3,
    });

    expect(result.distance).toBeCloseTo(1025.914, 2);
    expect(result.tunnel.centerline.length).toBeGreaterThan(0);
  });

  it("clamps non-integer/invalid width and height to sane minimums", () => {
    const result = planRoute({
      origin: { x: 0, z: 0 },
      destination: { x: 10, z: 0 },
      hubRadius: 0,
      tunnelWidth: 0,
      tunnelHeight: -2,
    });

    expect(result.tunnel.width).toBe(1);
    expect(result.tunnel.height).toBe(1);
  });
});
