import { describe, expect, it } from "vitest";
import { rasterizeCircle, rasterizeLine, rasterizeOrthogonalPath } from "./line-rasterization";

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

describe("rasterizeOrthogonalPath", () => {
  it("travels the dominant axis (X) first, bending at the destination's X", () => {
    const path = rasterizeOrthogonalPath({ x: 0, z: 0 }, { x: 100, z: 20 });
    expect(path.corner).toEqual({ x: 100, z: 0 });
    expect(path.legs).toHaveLength(2);
    expect(path.legs[0].direction).toEqual({ x: 100, z: 0 });
    expect(path.legs[1].direction).toEqual({ x: 0, z: 20 });
    expect(path.centerline[0]).toEqual({ x: 0, z: 0 });
    expect(path.centerline.at(-1)).toEqual({ x: 100, z: 20 });
  });

  it("travels the dominant axis (Z) first, bending at the destination's Z", () => {
    const path = rasterizeOrthogonalPath({ x: 0, z: 0 }, { x: 20, z: 100 });
    expect(path.corner).toEqual({ x: 0, z: 100 });
    expect(path.legs[0].direction).toEqual({ x: 0, z: 100 });
    expect(path.legs[1].direction).toEqual({ x: 20, z: 0 });
  });

  it("breaks ties (equal |dx| and |dz|) toward X first", () => {
    const path = rasterizeOrthogonalPath({ x: 0, z: 0 }, { x: 30, z: 30 });
    expect(path.corner).toEqual({ x: 30, z: 0 });
  });

  it("does not duplicate the corner block between legs in the merged centerline", () => {
    const path = rasterizeOrthogonalPath({ x: 0, z: 0 }, { x: 10, z: 4 });
    const seen = new Set(path.centerline.map((b) => `${b.x},${b.z}`));
    expect(seen.size).toBe(path.centerline.length);
    expect(path.centerline).toContainEqual(path.corner);
  });

  it("collapses to a single leg when already axis-aligned", () => {
    const path = rasterizeOrthogonalPath({ x: 0, z: 0 }, { x: 10, z: 0 });
    expect(path.legs).toHaveLength(1);
    expect(path.centerline).toEqual(rasterizeLine({ x: 0, z: 0 }, { x: 10, z: 0 }));
  });

  it("handles start === end as a single degenerate leg", () => {
    const path = rasterizeOrthogonalPath({ x: 5, z: 5 }, { x: 5, z: 5 });
    expect(path.legs).toHaveLength(1);
    expect(path.legs[0].direction).toEqual({ x: 0, z: 0 });
    expect(path.centerline).toEqual([{ x: 5, z: 5 }]);
  });

  describe("invert", () => {
    it("travels the minor axis (Z) first when inverted, opposite of the default", () => {
      const path = rasterizeOrthogonalPath({ x: 0, z: 0 }, { x: 100, z: 20 }, true);
      expect(path.corner).toEqual({ x: 0, z: 20 });
      expect(path.legs[0].direction).toEqual({ x: 0, z: 20 });
      expect(path.legs[1].direction).toEqual({ x: 100, z: 0 });
    });

    it("travels the minor axis (X) first when inverted, opposite of the default", () => {
      const path = rasterizeOrthogonalPath({ x: 0, z: 0 }, { x: 20, z: 100 }, true);
      expect(path.corner).toEqual({ x: 20, z: 0 });
    });

    it("breaks the tie toward Z first when inverted", () => {
      const path = rasterizeOrthogonalPath({ x: 0, z: 0 }, { x: 30, z: 30 }, true);
      expect(path.corner).toEqual({ x: 0, z: 30 });
    });

    it("has no effect when the route is already axis-aligned", () => {
      const normal = rasterizeOrthogonalPath({ x: 0, z: 0 }, { x: 10, z: 0 }, false);
      const inverted = rasterizeOrthogonalPath({ x: 0, z: 0 }, { x: 10, z: 0 }, true);
      expect(inverted.centerline).toEqual(normal.centerline);
    });
  });
});

describe("rasterizeCircle", () => {
  it("returns nothing for radius 0 or negative", () => {
    expect(rasterizeCircle({ x: 0, z: 0 }, 0)).toEqual([]);
    expect(rasterizeCircle({ x: 0, z: 0 }, -5)).toEqual([]);
  });

  it("rasterizes a radius-1 circle as the 4 orthogonal neighbors (a diamond)", () => {
    const blocks = rasterizeCircle({ x: 0, z: 0 }, 1);
    expect(blocks).toHaveLength(4);
    expect(blocks).toEqual(
      expect.arrayContaining([
        { x: 1, z: 0 },
        { x: -1, z: 0 },
        { x: 0, z: 1 },
        { x: 0, z: -1 },
      ]),
    );
  });

  it("produces no duplicate blocks", () => {
    const blocks = rasterizeCircle({ x: 0, z: 0 }, 12);
    const seen = new Set(blocks.map((b) => `${b.x},${b.z}`));
    expect(seen.size).toBe(blocks.length);
  });

  it("is symmetric on both axes around the center", () => {
    const center = { x: 5, z: -3 };
    const radius = 8;
    const blocks = rasterizeCircle(center, radius);
    const seen = new Set(blocks.map((b) => `${b.x},${b.z}`));
    for (const block of blocks) {
      const dx = block.x - center.x;
      const dz = block.z - center.z;
      expect(seen.has(`${center.x - dx},${center.z + dz}`)).toBe(true);
      expect(seen.has(`${center.x + dx},${center.z - dz}`)).toBe(true);
      expect(seen.has(`${center.x - dx},${center.z - dz}`)).toBe(true);
    }
  });

  it("keeps every block within rounding distance of the true radius (no spikes or holes)", () => {
    const radius = 20;
    const blocks = rasterizeCircle({ x: 0, z: 0 }, radius);
    for (const block of blocks) {
      const dist = Math.sqrt(block.x * block.x + block.z * block.z);
      expect(Math.abs(dist - radius)).toBeLessThan(1.5);
    }
  });

  it("rounds a fractional center and radius to the nearest block", () => {
    const blocks = rasterizeCircle({ x: 0.4, z: 0.4 }, 1.4);
    expect(blocks).toEqual(rasterizeCircle({ x: 0, z: 0 }, 1));
  });
});
