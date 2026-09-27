import assert from "node:assert/strict";
import test from "node:test";
import { COMPLETE_DURATION, LOADER_STATES, sampleLoaderPoint, type LoaderState } from "../src/lib/loaders.ts";

test("all loader states preserve 27 finite particles across their controls", () => {
  assert.equal(LOADER_STATES.length, 9);
  assert.equal(new Set(LOADER_STATES.map(({ id }) => id)).size, 9);
  for (const { id: state } of LOADER_STATES) {
    for (const time of [0, 0.4, 0.85, 0.95, 1.2, 1.8, 3, 20]) {
      for (const intensity of [0, 0.65, 1]) {
        for (const level of [0, 0.5, 1]) {
          const positions = new Set<string>();
          for (let index = 0; index < 27; index++) {
            const point = sampleLoaderPoint(state, index, time, intensity, level);
            assert.ok(Object.values(point).every(Number.isFinite), `${state}: nonfinite particle ${index}`);
            assert.ok(point.alpha >= 0 && point.alpha <= 1, `${state}: invalid opacity`);
            assert.ok(point.scale > 0, `${state}: invalid particle scale`);
            positions.add(JSON.stringify([point.x, point.y, point.z]));
          }
          const centerHold = state === "complete" && time >= 0.85 && time <= 1.2;
          assert.equal(positions.size, centerHold ? 1 : 27, `${state}: unexpected coincident particles at t=${time}`);
        }
      }
    }
  }
});

test("states have distinct motion and listening responds to level", () => {
  const frame = (state: LoaderState, time: number, level = 0.5) =>
    Array.from({ length: 27 }, (_, index) => sampleLoaderPoint(state, index, time, 0.65, level));
  const signatures = new Set<string>();
  for (const { id: state } of LOADER_STATES) {
    const frames = [0, 0.37, 0.82].map((time) => frame(state, time));
    assert.ok(new Set(frames.map((points) => JSON.stringify(points))).size > 1, `${state}: no motion`);
    signatures.add(JSON.stringify(frames));
  }
  assert.equal(signatures.size, 9, "each state needs a distinct animation");
  const motionEnergy = (level: number) => {
    let previous = frame("listening", 0, level);
    let total = 0;
    for (const time of [0.17, 0.41, 0.83, 1.37]) {
      const next = frame("listening", time, level);
      next.forEach((point, index) => {
        total += (point.x - previous[index].x) ** 2
          + (point.y - previous[index].y) ** 2 + (point.z - previous[index].z) ** 2;
      });
      previous = next;
    }
    return total;
  };
  assert.ok(motionEnergy(1) > motionEnergy(0), "a higher listening level should increase motion amplitude");
});

test("completion gathers every dot, holds, and reforms smoothly into idle", () => {
  const epsilon = 0.00001;
  for (const intensity of [0, 0.65, 1]) {
    for (let index = 0; index < 27; index++) {
      for (const time of [0.85, 1, 1.2]) {
        const point = sampleLoaderPoint("complete", index, time, intensity);
        assert.deepEqual([point.x, point.y, point.z], [0, 0, 0], "all identities must meet the exact center, even at zero intensity");
      }
      const start = sampleLoaderPoint("complete", index, 0, intensity);
      const gathering = sampleLoaderPoint("complete", index, 0.4, intensity);
      const reforming = sampleLoaderPoint("complete", index, 1.8, intensity);
      const length = (point: typeof start) => Math.hypot(point.x, point.y, point.z);
      if (index !== 13) {
        assert.ok(length(gathering) > 0 && length(gathering) < length(start));
        assert.ok(length(reforming) > 0 && length(reforming) < length(start));
      }
      for (const time of [0, 0.1, 3, 100]) {
        assert.deepEqual(sampleLoaderPoint("complete", index, COMPLETE_DURATION + time, intensity),
          sampleLoaderPoint("idle", index, COMPLETE_DURATION + time - COMPLETE_DURATION, intensity));
      }
      for (const boundary of [0.85, 1.2, COMPLETE_DURATION]) {
        const before = sampleLoaderPoint("complete", index, boundary - epsilon, intensity);
        const at = sampleLoaderPoint("complete", index, boundary, intensity);
        const after = sampleLoaderPoint("complete", index, boundary + epsilon, intensity);
        for (const key of ["x", "y", "z", "alpha", "scale"] as const) {
          assert.ok(Math.abs(after[key] - before[key]) < epsilon * 2, `discontinuity in ${key} at ${boundary}`);
          const incoming = (at[key] - before[key]) / epsilon;
          const outgoing = (after[key] - at[key]) / epsilon;
          assert.ok(Math.abs(incoming - outgoing) < 0.001, `velocity discontinuity in ${key} at ${boundary}`);
        }
      }
    }
  }
});

test("processing makes exact layer quarter-turns and closes its sequence smoothly", () => {
  const coordinates = (index: number, time: number) => {
    const { x, y, z } = sampleLoaderPoint("processing", index, time);
    return [x || 0, y || 0, z || 0];
  };
  assert.deepEqual(coordinates(24, 0), [-1, 1, 1]);
  assert.deepEqual(coordinates(24, 1), [1, 1, 1], "the top row must turn 90 degrees");
  assert.deepEqual(coordinates(24, 2.28), [1, -1, 1], "the right column must then turn 90 degrees");
  assert.deepEqual(coordinates(0, 2.28), [-1, -1, -1], "unselected layers must stay still");

  for (let index = 0; index < 27; index++) {
    assert.deepEqual(coordinates(index, 10.24), coordinates(index, 0), "inverse turns must restore each identity");
    assert.deepEqual(coordinates(index, 20.48), coordinates(index, 0));
    for (let turn = 0; turn < 8; turn++) {
      const finished = 1 + turn * 1.28;
      assert.deepEqual(coordinates(index, finished + 0.1), coordinates(index, finished), "the cube must hold between turns");
      for (const boundary of [finished, (turn + 1) * 1.28]) {
        const before = sampleLoaderPoint("processing", index, boundary - 0.00001);
        const at = sampleLoaderPoint("processing", index, boundary);
        const after = sampleLoaderPoint("processing", index, boundary + 0.00001);
        for (const key of ["x", "y", "z", "alpha", "scale"] as const) {
          assert.ok(Math.abs(after[key] - before[key]) < 0.000001, `${key} jumps at turn boundary ${boundary}`);
          assert.ok(Math.abs(after[key] - 2 * at[key] + before[key]) / 0.00001 < 0.001, `${key} changes velocity at ${boundary}`);
        }
      }
    }
  }
});

test("generating builds distinct layers and streaming recirculates every dot without jumps", () => {
  const keys = ["x", "y", "z", "alpha", "scale"] as const;
  const epsilon = 0.00001;
  for (const intensity of [0, 0.65, 1]) {
    for (let index = 0; index < 27; index++) {
      const built = sampleLoaderPoint("generating", index, 2.4, intensity);
      assert.deepEqual([built.x, built.y, built.z], [index % 3 - 1, Math.floor(index / 3) % 3 - 1, Math.floor(index / 9) - 1]);
      for (const state of ["generating", "streaming"] as const) {
        const period = state === "generating" ? 5.2 : 4.8;
        const start = sampleLoaderPoint(state, index, 0, intensity);
        const end = sampleLoaderPoint(state, index, period, intensity);
        for (const key of keys) assert.ok(Math.abs(start[key] - end[key]) < 1e-12, `${state}: loop must retain particle identity`);
        for (const boundary of state === "generating" ? [0.55, 0.8, 1.1, 1.5, 2.05, 3.2, 4.8, period] : [period]) {
          const before = sampleLoaderPoint(state, index, boundary - epsilon, intensity);
          const at = sampleLoaderPoint(state, index, boundary, intensity);
          const after = sampleLoaderPoint(state, index, boundary + epsilon, intensity);
          for (const key of keys) {
            assert.ok(Math.abs(after[key] - before[key]) < epsilon * 4, `${state}: position discontinuity`);
            assert.ok(Math.abs(after[key] - 2 * at[key] + before[key]) / epsilon < 0.001, `${state}: velocity discontinuity`);
          }
        }
      }
      const stream = sampleLoaderPoint("streaming", index, 0, intensity);
      const forward = sampleLoaderPoint("streaming", index, 1.2, intensity);
      assert.ok(Math.hypot(stream.x - forward.x, stream.z - forward.z) > 0.3, "every streaming particle must travel along its lane");
    }
    for (let step = 0; step < 240; step++) {
      const time = step / 240;
      for (const [state, period] of [["generating", 5.2], ["streaming", 4.8]] as const) {
        const points = Array.from({ length: 27 }, (_, index) => sampleLoaderPoint(state, index, time * period, intensity));
        for (let i = 0; i < points.length; i++) {
          const point = points[i];
          assert.ok(Math.max(Math.abs(point.x), Math.abs(point.y), Math.abs(point.z)) <= 1.34);
          for (const other of points.slice(i + 1)) assert.ok(Math.hypot(point.x - other.x, point.y - other.y, point.z - other.z) > 0.15, `${state}: particles must remain separated`);
        }
      }
    }
  }
  const layerWidth = (index: number) => sampleLoaderPoint("generating", index, 0.8).x;
  assert.ok(layerWidth(8) > layerWidth(5) && layerWidth(5) > layerWidth(2), "the bottom layer builds before the middle and top layers");
});
