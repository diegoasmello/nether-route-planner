import { describe, expect, it } from "vitest";
import { planRoute } from "./route";

describe("planRoute", () => {
  it("matches the full worked example from the spec", () => {
    const result = planRoute({
      origin: { x: 100, z: -50 },
      destination: { x: 237, z: 184 },
      hubRadius: 20,
      tunnelWidth: 3,
      routeStyle: "diagonal",
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
  });

  it("handles origin === destination", () => {
    const result = planRoute({
      origin: { x: 5, z: 5 },
      destination: { x: 5, z: 5 },
      hubRadius: 20,
      tunnelWidth: 3,
      routeStyle: "diagonal",
    });

    expect(result.isSamePoint).toBe(true);
    expect(result.distance).toBe(0);
    expect(result.compassDirection).toBeNull();
    expect(result.tunnel.length).toBe(0);
    expect(result.tunnel.centerline).toEqual([]);
    expect(result.tunnel.corridorBlocks).toEqual([]);
    expect(result.tunnel.approxArea).toBe(0);
  });

  it("reports no tunnel needed when the portal is inside the hub radius", () => {
    const result = planRoute({
      origin: { x: 0, z: 0 },
      destination: { x: 5, z: 5 },
      hubRadius: 20,
      tunnelWidth: 3,
      routeStyle: "diagonal",
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
      routeStyle: "diagonal",
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
      routeStyle: "diagonal",
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
      routeStyle: "diagonal",
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
      routeStyle: "diagonal",
    });

    expect(result.distance).toBeCloseTo(1025.914, 2);
    expect(result.tunnel.centerline.length).toBeGreaterThan(0);
  });

  it("clamps non-integer/invalid width to a sane minimum", () => {
    const result = planRoute({
      origin: { x: 0, z: 0 },
      destination: { x: 10, z: 0 },
      hubRadius: 0,
      tunnelWidth: 0,
      routeStyle: "diagonal",
    });

    expect(result.tunnel.width).toBe(1);
  });

  describe("orthogonal route style", () => {
    it("builds an L-shaped path with the dominant axis traveled first", () => {
      const result = planRoute({
        origin: { x: 0, z: 0 },
        destination: { x: 100, z: 20 },
        hubRadius: 0,
        tunnelWidth: 3,
        routeStyle: "orthogonal",
      });

      // Dominant axis (X, |100| > |20|) travels first: the corner sits at
      // the destination's X but the start's Z.
      const corner = { x: 100, z: 0 };
      expect(result.tunnel.centerline[0]).toEqual({ x: 0, z: 0 });
      expect(result.tunnel.centerline).toContainEqual(corner);
      expect(result.tunnel.centerline.at(-1)).toEqual({ x: 100, z: 20 });
      expect(result.tunnel.centerline.every((b) => b.z === 0 || b.x === 100)).toBe(true);
    });

    it("travels the Z axis first when it is dominant", () => {
      const result = planRoute({
        origin: { x: 0, z: 0 },
        destination: { x: 20, z: 100 },
        hubRadius: 0,
        tunnelWidth: 3,
        routeStyle: "orthogonal",
      });

      const corner = { x: 0, z: 100 };
      expect(result.tunnel.centerline).toContainEqual(corner);
      expect(result.tunnel.centerline.every((b) => b.x === 0 || b.z === 100)).toBe(true);
    });

    it("degenerates to a single straight leg on an already axis-aligned route", () => {
      const result = planRoute({
        origin: { x: 0, z: 0 },
        destination: { x: 50, z: 0 },
        hubRadius: 0,
        tunnelWidth: 3,
        routeStyle: "orthogonal",
      });

      expect(result.tunnel.centerline).toEqual(
        planRoute({
          origin: { x: 0, z: 0 },
          destination: { x: 50, z: 0 },
          hubRadius: 0,
          tunnelWidth: 3,
          routeStyle: "diagonal",
        }).tunnel.centerline,
      );
    });

    it("produces a corridor with no duplicate blocks, including at the corner", () => {
      const result = planRoute({
        origin: { x: 0, z: 0 },
        destination: { x: 40, z: 15 },
        hubRadius: 0,
        tunnelWidth: 4,
        routeStyle: "orthogonal",
      });

      const seen = new Set(result.tunnel.corridorBlocks.map((b) => `${b.x},${b.z}`));
      expect(seen.size).toBe(result.tunnel.corridorBlocks.length);
      expect(result.tunnel.corridorBlocks.length).toBeGreaterThan(result.tunnel.centerline.length);
    });

    it("reports no tunnel when the portal is inside the hub radius", () => {
      const result = planRoute({
        origin: { x: 0, z: 0 },
        destination: { x: 5, z: 5 },
        hubRadius: 20,
        tunnelWidth: 3,
        routeStyle: "orthogonal",
      });

      expect(result.tunnel.length).toBe(0);
      expect(result.tunnel.centerline).toEqual([]);
      expect(result.tunnel.corridorBlocks).toEqual([]);
    });

    it("travels the minor axis first when invertAxisOrder is set", () => {
      const result = planRoute({
        origin: { x: 0, z: 0 },
        destination: { x: 100, z: 20 },
        hubRadius: 0,
        tunnelWidth: 3,
        routeStyle: "orthogonal",
        invertAxisOrder: true,
      });

      // Inverted: Z (minor axis) travels first, so the corner keeps the
      // start's X but reaches the destination's Z.
      const corner = { x: 0, z: 20 };
      expect(result.tunnel.centerline).toContainEqual(corner);
      expect(result.tunnel.centerline.every((b) => b.x === 0 || b.z === 20)).toBe(true);
    });

    it("ignores invertAxisOrder in diagonal mode", () => {
      const base = { x: 0, z: 0 };
      const dest = { x: 137, z: 234 };
      const normal = planRoute({
        origin: base,
        destination: dest,
        hubRadius: 0,
        tunnelWidth: 3,
        routeStyle: "diagonal",
      });
      const inverted = planRoute({
        origin: base,
        destination: dest,
        hubRadius: 0,
        tunnelWidth: 3,
        routeStyle: "diagonal",
        invertAxisOrder: true,
      });

      expect(inverted.tunnel.centerline).toEqual(normal.tunnel.centerline);
    });
  });
});
