export type NoiseDirection = "all" | "horizontal";
export type NoisePoint = [number, number, number];
export type ParticleNoise = {
  offsets: NoisePoint[];
  velocities: NoisePoint[];
  rngState: number;
  accumulator: number;
};

export function createParticleNoise(count: number, seed: number): ParticleNoise {
  const size = Number.isFinite(count) ? Math.max(0, Math.min(6500, Math.floor(count))) : 0;
  return {
    offsets: Array.from({ length: size }, (): NoisePoint => [0, 0, 0]),
    velocities: Array.from({ length: size }, (): NoisePoint => [0, 0, 0]),
    rngState: Number.isFinite(seed) ? seed >>> 0 : 42,
    accumulator: 0,
  };
}

function noiseUniform(noise: ParticleNoise): number {
  // Mulberry32 accepts every unsigned seed, including zero.
  noise.rngState = (noise.rngState + 0x6d2b79f5) >>> 0;
  let value = noise.rngState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function noiseGaussian(noise: ParticleNoise): number {
  return Math.sqrt(-2 * Math.log(1 - noiseUniform(noise))) * Math.cos(2 * Math.PI * noiseUniform(noise));
}

export function advanceParticleNoise(noise: ParticleNoise, elapsedSeconds: number, direction: NoiseDirection = "all"): void {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return;
  const dt = 1 / 60;
  const elapsed = noise.accumulator + Math.min(1, elapsedSeconds);
  const steps = Math.floor((elapsed + 1e-12) / dt);
  noise.accumulator = Math.max(0, elapsed - steps * dt);
  const force = 0.8 * Math.sqrt(dt);
  for (let step = 0; step < steps; step++) {
    for (let i = 0; i < noise.offsets.length; i++) {
      const offset = noise.offsets[i];
      const velocity = noise.velocities[i];
      for (let axis = 0; axis < 3; axis++) {
        // Consume every axis so changing direction does not scramble the x trajectory.
        const gaussian = noiseGaussian(noise);
        const acceleration = axis === 0 || direction === "all" ? force * gaussian : 0;
        velocity[axis] += (-2.2 * velocity[axis] - 1.8 * offset[axis]) * dt + acceleration;
        offset[axis] += velocity[axis] * dt;
        if (Math.abs(offset[axis]) > 1.5) {
          offset[axis] = Math.sign(offset[axis]) * 1.5;
          if (Math.sign(velocity[axis]) === Math.sign(offset[axis])) velocity[axis] = 0;
        }
      }
    }
  }
}
