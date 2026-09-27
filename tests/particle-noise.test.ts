import assert from "node:assert/strict";
import test from "node:test";
import { advanceParticleNoise, createParticleNoise } from "../src/lib/particle-noise.ts";

test("seeded noise is independent per particle and consistent across frame partitions", () => {
  const noise = createParticleNoise(32, 147);
  const repeat = createParticleNoise(32, 147);
  const differentSeed = createParticleNoise(32, 148);
  for (const simulation of [noise, repeat, differentSeed]) advanceParticleNoise(simulation, 0.2);
  assert.deepEqual(noise, repeat);
  assert.notDeepEqual(noise.offsets, differentSeed.offsets);
  assert.equal(new Set(noise.offsets.map((offset) => JSON.stringify(offset))).size, 32);
  assert.ok(noise.offsets.every((offset) => offset.every((value) => value !== 0)));
  const zeroSeed = createParticleNoise(2, 0);
  const zeroRepeat = createParticleNoise(2, 0);
  advanceParticleNoise(zeroSeed, 0.2);
  advanceParticleNoise(zeroRepeat, 0.2);
  assert.deepEqual(zeroSeed, zeroRepeat);
  assert.ok(zeroSeed.offsets.every((offset) => offset.every((value) => Number.isFinite(value) && value !== 0)));

  const partitioned = createParticleNoise(32, 147);
  for (const elapsed of [0.08, 0.07, 0.05]) advanceParticleNoise(partitioned, elapsed);
  assert.deepEqual(partitioned.offsets, noise.offsets);
  assert.deepEqual(partitioned.velocities, noise.velocities);
  assert.equal(partitioned.rngState, noise.rngState);
  assert.ok(Math.abs(partitioned.accumulator - noise.accumulator) < 1e-12);

  const unchanged = structuredClone(noise);
  for (const elapsed of [NaN, Infinity, -Infinity, -1, 0]) advanceParticleNoise(noise, elapsed);
  assert.deepEqual(noise, unchanged, "invalid elapsed time must not advance or consume randomness");
  const capped = createParticleNoise(32, 147);
  const oneSecond = createParticleNoise(32, 147);
  const sixtyFrames = createParticleNoise(32, 147);
  advanceParticleNoise(capped, 10);
  advanceParticleNoise(oneSecond, 1);
  assert.deepEqual(capped, oneSecond, "long frames cap at one second");
  for (let frame = 0; frame < 60; frame++) advanceParticleNoise(sixtyFrames, 1 / 60);
  assert.deepEqual(sixtyFrames.offsets, oneSecond.offsets);
  assert.deepEqual(sixtyFrames.velocities, oneSecond.velocities);
  assert.equal(sixtyFrames.rngState, oneSecond.rngState);
  assert.ok(Math.abs(sixtyFrames.accumulator - oneSecond.accumulator) < 1e-12);
});

test("noise stays bounded and horizontal mode damps existing transverse motion", () => {
  const noise = createParticleNoise(32, 147);
  const horizontal = createParticleNoise(32, 147);
  for (let step = 0; step < 1000; step++) {
    advanceParticleNoise(noise, 1 / 60);
    advanceParticleNoise(horizontal, 1 / 60, "horizontal");
    for (const simulation of [noise, horizontal]) {
      assert.ok(simulation.offsets.every((offset) => offset.every((value) => Number.isFinite(value) && Math.abs(value) <= 1.5)));
      assert.ok(simulation.velocities.every((velocity) => velocity.every(Number.isFinite)));
    }
  }
  assert.ok(horizontal.offsets.some(([x]) => x !== 0));
  assert.ok(horizontal.offsets.every(([, y, z]) => y === 0 && z === 0));
  assert.ok(horizontal.velocities.every(([, y, z]) => y === 0 && z === 0));

  const transverseEnergy = () => [...noise.offsets, ...noise.velocities]
    .reduce((total, [, y, z]) => total + y * y + z * z, 0);
  const before = transverseEnergy();
  assert.ok(before > 0);
  for (let step = 0; step < 600; step++) advanceParticleNoise(noise, 1 / 60, "horizontal");
  assert.ok(transverseEnergy() < before * 0.001, "existing y/z displacement and velocity should decay");

  const boundary = createParticleNoise(2, 147);
  boundary.offsets[0][0] = 1.49;
  boundary.velocities[0][0] = 100;
  boundary.offsets[1][0] = -1.49;
  boundary.velocities[1][0] = -100;
  advanceParticleNoise(boundary, 1 / 60, "horizontal");
  assert.equal(boundary.offsets[0][0], 1.5);
  assert.equal(boundary.offsets[1][0], -1.5);
  assert.equal(boundary.velocities[0][0], 0);
  assert.equal(boundary.velocities[1][0], 0);
});
