import { describe, expect, it } from "vitest";
import { clampScale, fitViewport, screenToWorld, worldToScreen } from "./coordinates";

describe("worldToScreen / screenToWorld", () => {
  const viewport = { center: { x: 100, z: -50 }, scale: 2 };

  it("places the viewport center at the canvas center", () => {
    const screen = worldToScreen(viewport.center, viewport, 800, 600);
    expect(screen).toEqual({ x: 400, y: 300 });
  });

  it("moves +X to the right", () => {
    const screen = worldToScreen({ x: 110, z: -50 }, viewport, 800, 600);
    expect(screen.x).toBeGreaterThan(400);
    expect(screen.y).toBe(300);
  });

  it("moves +Z downward on screen (screen-up = North = -Z)", () => {
    const screen = worldToScreen({ x: 100, z: -40 }, viewport, 800, 600);
    expect(screen.y).toBeGreaterThan(300);
    expect(screen.x).toBe(400);
  });

  it("round-trips world -> screen -> world", () => {
    const original = { x: 237, z: 184 };
    const screen = worldToScreen(original, viewport, 800, 600);
    const back = screenToWorld(screen, viewport, 800, 600);
    expect(back.x).toBeCloseTo(original.x, 6);
    expect(back.z).toBeCloseTo(original.z, 6);
  });

  it("round-trips with negative coordinates", () => {
    const original = { x: -500, z: -300 };
    const screen = worldToScreen(original, viewport, 800, 600);
    const back = screenToWorld(screen, viewport, 800, 600);
    expect(back.x).toBeCloseTo(original.x, 6);
    expect(back.z).toBeCloseTo(original.z, 6);
  });
});

describe("clampScale", () => {
  it("keeps values within range untouched", () => {
    expect(clampScale(5)).toBe(5);
  });

  it("clamps values below the minimum", () => {
    expect(clampScale(0)).toBeGreaterThan(0);
  });

  it("clamps values above the maximum", () => {
    expect(clampScale(1000)).toBeLessThan(1000);
  });
});

describe("fitViewport", () => {
  it("returns a default viewport for an empty point list", () => {
    expect(fitViewport([], 800, 600)).toEqual({ center: { x: 0, z: 0 }, scale: 1 });
  });

  it("centers on the midpoint of the given points", () => {
    const viewport = fitViewport([{ x: 0, z: 0 }, { x: 100, z: 200 }], 800, 600);
    expect(viewport.center).toEqual({ x: 50, z: 100 });
  });

  it("produces a scale that fits both points within the canvas", () => {
    const points = [{ x: 0, z: 0 }, { x: 1000, z: 0 }];
    const viewport = fitViewport(points, 800, 600, 20);
    for (const point of points) {
      const screen = worldToScreen(point, viewport, 800, 600);
      expect(screen.x).toBeGreaterThanOrEqual(-1);
      expect(screen.x).toBeLessThanOrEqual(801);
    }
  });

  it("handles a single point without collapsing to a degenerate scale", () => {
    const viewport = fitViewport([{ x: 42, z: 42 }], 800, 600);
    expect(viewport.center).toEqual({ x: 42, z: 42 });
    expect(Number.isFinite(viewport.scale)).toBe(true);
    expect(viewport.scale).toBeGreaterThan(0);
  });
});
