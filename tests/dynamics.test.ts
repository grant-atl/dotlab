import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceSimulation,
  createSimulation,
  normalizeParameters,
  readSample,
  stepState,
  systemValue,
  SYSTEMS,
  type State,
  type SystemId,
} from "../src/lib/dynamics.ts";

test("flow integration and direct maps agree with numerical reference values", () => {
  const lorenz = normalizeParameters("lorenz");
  assert.deepEqual(systemValue("lorenz", [1, 1, 1], lorenz), [0, 26, 1 - 8 / 3]);
  // Exact rational arithmetic for one classical RK4 step, h = 0.01.
  const expected = [1.0125671910736112, 1.2599177989452743, 0.9848909717916053];
  stepState("lorenz", [1, 1, 1], lorenz).forEach((value, axis) => {
    assert.ok(Math.abs(value - expected[axis]) < 1e-12, `Lorenz axis ${axis}`);
  });

  const henon = stepState("henon", [0.2, 0.1, 0], normalizeParameters("henon"));
  assert.ok(Math.abs(henon[0] - 1.044) < 1e-12);
  assert.ok(Math.abs(henon[1] - 0.06) < 1e-12);
  const clifford = stepState("clifford", [0, 0, 0], normalizeParameters("clifford"));
  assert.equal(clifford[0], 1);
  assert.equal(clifford[1], 0.7);
});

test("default simulations reset deterministically, remain finite, and reject escapes", () => {
  assert.equal(SYSTEMS.length, 8);
  for (const { id, parameters } of SYSTEMS) {
    const defaults = normalizeParameters(id);
    for (const { key, min, max } of parameters) {
      assert.equal(normalizeParameters(id, { [key]: min - 100 })[key], min);
      assert.equal(normalizeParameters(id, { [key]: max + 100 })[key], max);
    }
    for (const invalid of [NaN, Infinity, -Infinity]) {
      const overrides = Object.fromEntries(Object.keys(defaults).map((key) => [key, invalid]));
      assert.deepEqual(normalizeParameters(id, overrides), defaults, `${id}: invalid parameters`);
    }
    const simulation = createSimulation(id, {}, 64);
    const initial = readSample(simulation);
    const initialPoints = simulation.points.map((point) => [...point]);
    assert.equal(simulation.points.length, 64);
    advanceSimulation(simulation, 1000);
    assert.equal(simulation.escaped, false, `${id}: default trajectory escaped`);
    assert.equal(simulation.iteration, initial.iteration + 1000);
    for (const point of [simulation.state, ...simulation.points]) {
      assert.ok(point.every((value) => Number.isFinite(value) && Math.abs(value) <= 1e4), `${id}: invalid point`);
    }
    const reset = createSimulation(id, {}, 64);
    assert.deepEqual(readSample(reset), initial, `${id}: reset sample`);
    assert.deepEqual(reset.points, initialPoints, `${id}: reset trajectory`);
  }

  const escaping = createSimulation("henon", {}, 64);
  escaping.state = escaping.points[0] = [100, 100, 0];
  advanceSimulation(escaping);
  assert.equal(escaping.escaped, true);
  assert.deepEqual(escaping.state, [100, 100, 0], "retain the last valid state on escape");
  assert.strictEqual(escaping.state, escaping.points[0]);
});

test("new flows match their derivatives and a finer independent midpoint integration", () => {
  const chua = normalizeParameters("chua");
  // Diode values on both outer segments, both breakpoints, and the central segment.
  for (const [x, diode] of [[-2, 13 / 7], [-1, 8 / 7], [-0.5, 4 / 7], [0, 0], [0.5, -4 / 7], [1, -8 / 7], [2, -13 / 7]]) {
    const expected = [15.6 * (0.3 - x - diode), x - 0.7, -9.3];
    systemValue("chua", [x, 0.3, -0.4], chua).forEach((value, axis) => {
      assert.ok(Math.abs(value - expected[axis]) < 1e-12, `Chua derivative at x=${x}, axis ${axis}`);
    });
  }
  const derivatives: [SystemId, State][] = [
    ["rucklidge", [5.4, 1, 1]],
    ["rabinovich-fabrikant", [6.87, 10.74, -18.6]],
  ];
  for (const [id, expected] of derivatives) {
    systemValue(id, [1, 2, 3], normalizeParameters(id)).forEach((value, axis) => {
      assert.ok(Math.abs(value - expected[axis]) < 1e-12, `${id}: derivative axis ${axis}`);
    });
  }

  const seeds: [SystemId, State][] = [
    ["chua", [0.7, 0, 0]],
    ["rucklidge", [0.1, 0.1, 0.1]],
    ["rabinovich-fabrikant", [-1, 0, 0.5]],
  ];
  for (const [id, seed] of seeds) {
    const parameters = normalizeParameters(id);
    let coarse: State = [...seed];
    let fine: State = [...seed];
    for (let step = 0; step < 50; step++) coarse = stepState(id, coarse, parameters);
    const h = 0.005 / 64;
    for (let step = 0; step < 50 * 64; step++) {
      const rate = systemValue(id, fine, parameters);
      const midpoint = fine.map((value, axis) => value + h / 2 * rate[axis]) as State;
      const middleRate = systemValue(id, midpoint, parameters);
      fine = fine.map((value, axis) => value + h * middleRate[axis]) as State;
    }
    // Chua crosses a diode kink during this quarter second, reducing RK4's local accuracy.
    const tolerance = id === "chua" ? 1e-5 : 1e-7;
    coarse.forEach((value, axis) => {
      assert.ok(Math.abs(value - fine[axis]) < tolerance, `${id}: integration axis ${axis}`);
    });
  }
});

test("new default flows remain bounded and spatially distributed over 25000 collective steps", () => {
  const minimumSpans: [SystemId, State][] = [
    ["chua", [0.5, 0.05, 0.5]],
    ["rucklidge", [2, 1, 2]],
    ["rabinovich-fabrikant", [0.3, 0.3, 0.1]],
  ];
  for (const [id, minimumSpan] of minimumSpans) {
    const simulation = createSimulation(id, {}, 64);
    const initialIteration = simulation.iteration;
    for (const steps of [10000, 10000, 5000]) {
      advanceSimulation(simulation, steps);
      assert.equal(simulation.escaped, false, `${id}: default flow escaped`);
      assert.equal(simulation.points.length, 64);
      assert.ok(simulation.points.every((point) => point.every((value) => Number.isFinite(value) && Math.abs(value) < 100)));
      for (const axis of [0, 1, 2]) {
        const values = simulation.points.map((point) => point[axis]);
        assert.ok(Math.max(...values) - Math.min(...values) > minimumSpan[axis], `${id}: collapsed axis ${axis}`);
      }
    }
    assert.equal(simulation.iteration, initialIteration + 25000);
  }
});

test("particles keep their identities, cover the attractor, and advance atomically", () => {
  for (const { id } of SYSTEMS) {
    const simulation = createSimulation(id, {}, 64);
    const before = simulation.points.map((point): State => [...point]);
    const dense = createSimulation(id, {}, 2400).points;
    assert.equal(new Set(before.map((point) => JSON.stringify(point))).size, 64, `${id}: duplicate seeds`);
    for (const axis of [0, 1, 2]) {
      const values = before.map((point) => point[axis]);
      const reference = dense.map((point) => point[axis]);
      assert.ok(values.every(Number.isFinite), `${id}: nonfinite seeds`);
      const span = Math.max(...values) - Math.min(...values);
      const referenceSpan = Math.max(...reference) - Math.min(...reference);
      assert.ok(span >= referenceSpan * 0.55, `${id}: sparse particles miss axis ${axis}`);
    }
    assert.strictEqual(simulation.state, simulation.points[0]);
    const { iteration } = simulation;
    advanceSimulation(simulation);
    assert.equal(simulation.iteration, iteration + 1);
    simulation.points.forEach((point, index) => {
      assert.deepEqual(point, stepState(id, before[index], simulation.parameters), `${id}: particle ${index}`);
      assert.notDeepEqual(point, before[index], `${id}: stationary particle ${index}`);
    });
    assert.strictEqual(simulation.state, simulation.points[0]);
    assert.deepEqual(readSample(simulation).state, simulation.points[0]);
    assert.deepEqual(readSample(simulation).next, systemValue(id, simulation.points[0], simulation.parameters));
  }

  const escaping = createSimulation("henon", {}, 64);
  escaping.points[63] = [100, 100, 0]; // Valid current position; its next Hénon step escapes.
  const before = escaping.points.map((point) => [...point]);
  const iteration = escaping.iteration;
  advanceSimulation(escaping);
  assert.equal(escaping.escaped, true);
  assert.equal(escaping.iteration, iteration);
  assert.deepEqual(escaping.points, before, "a failed particle must not partly advance the collective");
  assert.strictEqual(escaping.state, escaping.points[0]);
});
