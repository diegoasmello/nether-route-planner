import { describe, expect, it } from "vitest";
import { rasterizeLine } from "./lineRasterization";

describe("rasterizeLine", () => {
  it("returns a single block when start equals end", () => {
    expect(rasterizeLine({ x: 5, z: 5 }, { x: 5, z: 5 })).toEqual([{ x: 5, z: 5 }]);
  });

  it("rasterizes a horizontal line", () => {
    const blocks = rasterizeLine({ x: 0, z: 0 }, { x: 5, z: 0 });
    expect(blocks).toEqual([
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 2, z: 0 },
      { x: 3, z: 0 },
      { x: 4, z: 0 },
      { x: 5, z: 0 },
    ]);
  });

  it("rasterizes a vertical line", () => {
    const blocks = rasterizeLine({ x: 0, z: 0 }, { x: 0, z: 5 });
    expect(blocks).toEqual([
      { x: 0, z: 0 },
      { x: 0, z: 1 },
      { x: 0, z: 2 },
      { x: 0, z: 3 },
      { x: 0, z: 4 },
      { x: 0, z: 5 },
    ]);
  });

  it("rasterizes a perfect 45-degree diagonal", () => {
    const blocks = rasterizeLine({ x: 0, z: 0 }, { x: 3, z: 3 });
    expect(blocks).toEqual([
      { x: 0, z: 0 },
      { x: 1, z: 1 },
      { x: 2, z: 2 },
      { x: 3, z: 3 },
    ]);
  });

  it("handles a shallow-slope diagonal without gaps or repeats beyond consecutive steps", () => {
    const blocks = rasterizeLine({ x: 0, z: 0 }, { x: 10, z: 3 });
    // Each consecutive pair must move by at most 1 in X and 1 in Z (8-connected, no jumps).
    for (let i = 1; i < blocks.length; i++) {
      const dx = Math.abs(blocks[i].x - blocks[i - 1].x);
      const dz = Math.abs(blocks[i].z - blocks[i - 1].z);
      expect(dx).toBeLessThanOrEqual(1);
      expect(dz).toBeLessThanOrEqual(1);
      expect(dx + dz).toBeGreaterThan(0);
    }
    expect(blocks[0]).toEqual({ x: 0, z: 0 });
    expect(blocks[blocks.length - 1]).toEqual({ x: 10, z: 3 });
  });

  it("handles a steep-slope diagonal symmetric to the shallow case", () => {
    const blocks = rasterizeLine({ x: 0, z: 0 }, { x: 3, z: 10 });
    expect(blocks[0]).toEqual({ x: 0, z: 0 });
    expect(blocks[blocks.length - 1]).toEqual({ x: 3, z: 10 });
    for (let i = 1; i < blocks.length; i++) {
      const dx = Math.abs(blocks[i].x - blocks[i - 1].x);
      const dz = Math.abs(blocks[i].z - blocks[i - 1].z);
      expect(dx).toBeLessThanOrEqual(1);
      expect(dz).toBeLessThanOrEqual(1);
    }
  });

  it("handles negative direction on both axes", () => {
    const blocks = rasterizeLine({ x: 5, z: 5 }, { x: 0, z: 0 });
    expect(blocks[0]).toEqual({ x: 5, z: 5 });
    expect(blocks[blocks.length - 1]).toEqual({ x: 0, z: 0 });
  });

  it("handles mixed-sign direction (moving -X, +Z)", () => {
    const blocks = rasterizeLine({ x: 5, z: -5 }, { x: -5, z: 5 });
    expect(blocks[0]).toEqual({ x: 5, z: -5 });
    expect(blocks[blocks.length - 1]).toEqual({ x: -5, z: 5 });
    for (let i = 1; i < blocks.length; i++) {
      const dx = Math.abs(blocks[i].x - blocks[i - 1].x);
      const dz = Math.abs(blocks[i].z - blocks[i - 1].z);
      expect(dx).toBeLessThanOrEqual(1);
      expect(dz).toBeLessThanOrEqual(1);
    }
  });

  it("rounds fractional endpoints (e.g. a hub exit point) to the nearest block", () => {
    const blocks = rasterizeLine({ x: 12.7, z: -3.2 }, { x: 20, z: 0 });
    expect(blocks[0]).toEqual({ x: 13, z: -3 });
  });

  it("never produces duplicate consecutive points", () => {
    const blocks = rasterizeLine({ x: -20, z: 7 }, { x: 33, z: -18 });
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i]).not.toEqual(blocks[i - 1]);
    }
  });
});
