import { describe, expect, it } from "vitest";
import { distributePortalsOnHub } from "./portals";
import { rasterizeCircle } from "./line-rasterization";

describe("distributePortalsOnHub", () => {
  it("returns nothing when the hub has no radius", () => {
    expect(distributePortalsOnHub({ x: 0, z: 0 }, 0, 4, 3)).toEqual([]);
  });

  it("returns nothing when portal count is missing/non-positive", () => {
    expect(distributePortalsOnHub({ x: 0, z: 0 }, 20, 0, 3)).toEqual([]);
    expect(distributePortalsOnHub({ x: 0, z: 0 }, 20, -1, 3)).toEqual([]);
  });

  it("returns nothing when portal width is missing/non-positive", () => {
    expect(distributePortalsOnHub({ x: 0, z: 0 }, 20, 4, 0)).toEqual([]);
    expect(distributePortalsOnHub({ x: 0, z: 0 }, 20, 4, -2)).toEqual([]);
  });

  it("produces exactly one slot per requested portal", () => {
    const slots = distributePortalsOnHub({ x: 0, z: 0 }, 20, 6, 3);
    expect(slots).toHaveLength(6);
    expect(slots.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("gives every slot exactly `portalWidth` blocks, all on the hub's perimeter", () => {
    const center = { x: 5, z: -10 };
    const radius = 25;
    const perimeter = new Set(rasterizeCircle(center, radius).map((b) => `${b.x},${b.z}`));
    const slots = distributePortalsOnHub(center, radius, 5, 4);
    for (const slot of slots) {
      expect(slot.blocks).toHaveLength(4);
      for (const block of slot.blocks) {
        expect(perimeter.has(`${block.x},${block.z}`)).toBe(true);
      }
    }
  });

  it("anchors portal #0 at angle 0 (East, +X) from the center", () => {
    const center = { x: 0, z: 0 };
    const radius = 30;
    const slots = distributePortalsOnHub(center, radius, 4, 1);
    const first = slots[0].blocks[0];
    expect(first.x).toBeGreaterThan(0);
    expect(Math.abs(first.z)).toBeLessThanOrEqual(1);
  });

  it("spreads slots roughly evenly around the perimeter (opposite-ish for 2 portals)", () => {
    const center = { x: 0, z: 0 };
    const radius = 40;
    const slots = distributePortalsOnHub(center, radius, 2, 1);
    const a = slots[0].blocks[0];
    const b = slots[1].blocks[0];
    // Roughly opposite sides of the center.
    expect(Math.sign(a.x)).not.toBe(Math.sign(b.x) === 0 ? Math.sign(a.x) : Math.sign(b.x));
  });

  it("still returns a slot per portal even when demand exceeds the perimeter (overlap allowed)", () => {
    const slots = distributePortalsOnHub({ x: 0, z: 0 }, 2, 20, 5);
    expect(slots).toHaveLength(20);
    for (const slot of slots) {
      expect(slot.blocks.length).toBe(5);
    }
  });

  it("is deterministic for the same inputs", () => {
    const a = distributePortalsOnHub({ x: 3, z: 3 }, 15, 5, 3);
    const b = distributePortalsOnHub({ x: 3, z: 3 }, 15, 5, 3);
    expect(a).toEqual(b);
  });
});
