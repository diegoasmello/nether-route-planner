import { describe, expect, it } from "vitest";
import { buildTunnelCorridor, estimateTunnelArea, estimateTunnelVolume, widthOffsets } from "./tunnel";
import { rasterizeLine } from "./line-rasterization";

describe("widthOffsets", () => {
  it("centers odd widths exactly", () => {
    expect(widthOffsets(1)).toEqual([0]);
    expect(widthOffsets(3)).toEqual([-1, 0, 1]);
    expect(widthOffsets(5)).toEqual([-2, -1, 0, 1, 2]);
  });

  it("places the extra block on the positive side for even widths", () => {
    expect(widthOffsets(2)).toEqual([0, 1]);
    expect(widthOffsets(4)).toEqual([-1, 0, 1, 2]);
    expect(widthOffsets(6)).toEqual([-2, -1, 0, 1, 2, 3]);
  });

  it("clamps widths below 1 up to a single-block-wide corridor", () => {
    expect(widthOffsets(0)).toEqual([0]);
    expect(widthOffsets(-3)).toEqual([0]);
  });

  it("floors fractional widths", () => {
    expect(widthOffsets(3.9)).toEqual([-1, 0, 1]);
  });
});

describe("buildTunnelCorridor", () => {
  it("returns an empty corridor for an empty centerline", () => {
    expect(buildTunnelCorridor([], { x: 1, z: 0 }, 3)).toEqual([]);
  });

  it("widens a horizontal line across Z for odd width", () => {
    const centerline = rasterizeLine({ x: 0, z: 0 }, { x: 5, z: 0 });
    const corridor = buildTunnelCorridor(centerline, { x: 5, z: 0 }, 3);

    // Every centerline block should have neighbors one block above/below in Z.
    for (const block of centerline) {
      expect(corridor).toContainEqual({ x: block.x, z: block.z - 1 });
      expect(corridor).toContainEqual({ x: block.x, z: block.z });
      expect(corridor).toContainEqual({ x: block.x, z: block.z + 1 });
    }
  });

  it("widens a vertical line across X for odd width", () => {
    const centerline = rasterizeLine({ x: 0, z: 0 }, { x: 0, z: 5 });
    const corridor = buildTunnelCorridor(centerline, { x: 0, z: 5 }, 3);

    for (const block of centerline) {
      expect(corridor).toContainEqual({ x: block.x - 1, z: block.z });
      expect(corridor).toContainEqual({ x: block.x, z: block.z });
      expect(corridor).toContainEqual({ x: block.x + 1, z: block.z });
    }
  });

  it("produces exactly `width` distinct offsets per centerline block on an axis-aligned route", () => {
    const centerline = rasterizeLine({ x: 0, z: 0 }, { x: 10, z: 0 });
    const corridor = buildTunnelCorridor(centerline, { x: 10, z: 0 }, 4);
    // Axis-aligned corridor has no overlap between columns, so the count is exact.
    expect(corridor.length).toBe(centerline.length * 4);
  });

  it("deduplicates overlapping blocks on a diagonal route", () => {
    const centerline = rasterizeLine({ x: 0, z: 0 }, { x: 20, z: 20 });
    const corridor = buildTunnelCorridor(centerline, { x: 20, z: 20 }, 3);
    const seen = new Set(corridor.map((b) => `${b.x},${b.z}`));
    expect(seen.size).toBe(corridor.length);
  });

  it("falls back to a default perpendicular when direction is zero (same point)", () => {
    const centerline = [{ x: 5, z: 5 }];
    const corridor = buildTunnelCorridor(centerline, { x: 0, z: 0 }, 3);
    expect(corridor.length).toBe(3);
  });

  it("keeps a width-1 corridor identical to the centerline", () => {
    const centerline = rasterizeLine({ x: 0, z: 0 }, { x: 5, z: 2 });
    const corridor = buildTunnelCorridor(centerline, { x: 5, z: 2 }, 1);
    expect(corridor).toEqual(centerline);
  });
});

describe("area/volume estimates", () => {
  it("multiplies length by width for area", () => {
    expect(estimateTunnelArea(100, 3)).toBe(300);
  });

  it("multiplies length by width by height for volume", () => {
    expect(estimateTunnelVolume(100, 3, 4)).toBe(1200);
  });

  it("is zero for zero length", () => {
    expect(estimateTunnelArea(0, 5)).toBe(0);
    expect(estimateTunnelVolume(0, 5, 5)).toBe(0);
  });
});
