import assert from "node:assert/strict";
import test from "node:test";
import { PATTERNS, samplePoint } from "../src/lib/patterns.ts";

test("all 20 patterns have distinct, finite, deterministic geometry", () => {
  assert.equal(PATTERNS.length, 20);
  assert.equal(new Set(PATTERNS.map(({ id }) => id)).size, 20);
  const signatures = new Set<string>();
  for (const { id } of PATTERNS) {
    const signature: number[] = [];
    for (const count of [160, 1150, 2200]) {
      for (const time of [0, 1.5, 120]) {
        for (let i = 0; i < count; i++) {
          const point = samplePoint(id, i, count, time);
          for (const value of Object.values(point)) {
            assert.ok(Number.isFinite(value), `${id}: non-finite coordinate`);
            assert.ok(
              Math.abs(value) < 2.5,
              `${id}: geometry exceeds the viewport bounds`,
            );
          }
          if (count === 160 && time === 1.5 && i < 8)
            signature.push(point.x, point.y, point.z);
        }
      }
    }
    assert.deepEqual(
      samplePoint(id, 37, 1150, 2),
      samplePoint(id, 37, 1150, 2),
    );
    signatures.add(signature.map((value) => value.toFixed(4)).join(","));
  }
  assert.equal(signatures.size, 20);
});
