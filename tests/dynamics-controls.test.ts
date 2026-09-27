import assert from "node:assert/strict";
import test from "node:test";
import { acceptDynamicsParameters } from "../src/lib/dynamics-controls.ts";
import { normalizeParameters } from "../src/lib/dynamics.ts";

test("divergent or invalid coefficient changes retain the exact previous parameters", () => {
  const current = normalizeParameters("henon");
  const previous = { ...current };
  for (const candidate of [
    { a: 1.5, b: 0.4 },
    { a: 1.6, b: 0.3 },
    { a: 1.4, b: 0.01 },
    { a: NaN, b: 0.3 },
    { a: 1.4, b: Infinity },
  ]) {
    assert.equal(acceptDynamicsParameters("henon", current, candidate), current);
    assert.deepEqual(current, previous, "a rejected change must not mutate the current coefficients");
  }
});

test("accepted coefficients retain their exact values, including fractional defaults", () => {
  const current = normalizeParameters("lorenz");
  const candidate = { sigma: 12.3, rho: 31.2, beta: 8 / 3 };
  assert.equal(acceptDynamicsParameters("lorenz", current, candidate), candidate);
  assert.equal(candidate.beta, 8 / 3);
  assert.deepEqual(current, normalizeParameters("lorenz"));

  const boundary = { ...current, rho: 0 };
  assert.equal(acceptDynamicsParameters("lorenz", current, boundary), boundary, "bounded settings at the slider boundary remain selectable");

  for (const system of ["chua", "rucklidge", "rabinovich-fabrikant"] as const) {
    const preset = normalizeParameters(system);
    assert.strictEqual(acceptDynamicsParameters(system, preset, preset), preset, `${system}: verified preset must remain selectable`);
  }
  const rf = normalizeParameters("rabinovich-fabrikant");
  assert.strictEqual(acceptDynamicsParameters("rabinovich-fabrikant", rf, { ...rf, b: 0.8 }), rf, "an escaping flow must preserve the last working coefficients");
});
