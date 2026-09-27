import { useEffect, useRef, type CSSProperties } from "react";
import { advanceSimulation, createSimulation, normalizeParameters, readSample, type LiveSample, type Simulation, type State, type SystemId } from "../lib/dynamics";
import { advanceParticleNoise, createParticleNoise, type NoiseDirection, type ParticleNoise } from "../lib/particle-noise";

export type AttractorFieldProps = {
  system?: SystemId;
  parameters?: Record<string, number>;
  color?: string;
  speed?: number;
  paused?: boolean;
  density?: number;
  trails?: number;
  fade?: number;
  drift?: number;
  showMarker?: boolean;
  randomness?: number;
  noiseDirection?: NoiseDirection;
  noiseSeed?: number;
  step?: number;
  resetKey?: number;
  onSample?: (sample: LiveSample) => void;
  className?: string;
  style?: CSSProperties;
};

export function AttractorField({
  system = "lorenz", parameters, color = "#baff66", speed = 0.5,
  paused = false, density = 1, trails = 0.55, fade = 0.7, drift = 0.6, showMarker = false, step = 0, resetKey = 0, onSample, className, style,
  randomness = 0, noiseDirection = "all", noiseSeed = 42,
}: AttractorFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<{ key: string; simulation: Simulation; lastStep: number; history: State[][]; previousPoints: State[]; phase: number; time: number; noise: ParticleNoise; noiseSeed: number } | null>(null);
  const sampleRef = useRef(onSample);
  sampleRef.current = onSample;
  const settingsRef = useRef({ color, speed, density, trails, fade, drift, showMarker, randomness, noiseDirection, noiseSeed });
  settingsRef.current = { color, speed, density, trails, fade, drift, showMarker, randomness, noiseDirection, noiseSeed };
  const refreshRef = useRef<(() => void) | null>(null);
  const parameterKey = JSON.stringify(normalizeParameters(system, parameters));

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const playbackSpeed = () => {
      const value = settingsRef.current.speed;
      return Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0.5;
    };
    const key = `${system}:${parameterKey}:${resetKey}`;
    const stepCounter = Number.isFinite(step) ? Math.max(0, Math.floor(step)) : 0;
    const currentNoiseSeed = () => Number.isFinite(settingsRef.current.noiseSeed) ? Math.floor(settingsRef.current.noiseSeed) >>> 0 : 42;
    if (engineRef.current?.key !== key) {
      const simulation = createSimulation(system, JSON.parse(parameterKey), 1800);
      engineRef.current = {
        key,
        simulation,
        lastStep: stepCounter,
        history: [],
        previousPoints: [],
        phase: 0,
        time: 0,
        noise: createParticleNoise(simulation.points.length, currentNoiseSeed()),
        noiseSeed: currentNoiseSeed(),
      };
    }
    const engine = engineRef.current;
    const simulation = engine.simulation;
    const noiseAmount = () => {
      const value = settingsRef.current.randomness;
      return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    };
    const rate = { lorenz: 90, rossler: 120, thomas: 160, henon: 1, clifford: 1, chua: 80, rucklidge: 80, "rabinovich-fabrikant": 80 }[system];
    const isMap = system === "henon" || system === "clifford";
    function advance(steps: number) {
      if (!steps || simulation.escaped) return;
      for (let i = 0; i < steps && !simulation.escaped; i++) {
        engine.history.unshift(simulation.points);
        engine.history.length = Math.min(engine.history.length, 6);
        engine.previousPoints = simulation.points;
        advanceSimulation(simulation, 1);
      }
    }
    if (isMap && !paused && !reducedMotion.matches && playbackSpeed() > 0 &&
      (!engine.previousPoints.length || engine.previousPoints === simulation.points)) {
      advance(1);
    }
    if ((paused || reducedMotion.matches || playbackSpeed() === 0) && stepCounter > engine.lastStep) {
      advance(stepCounter - engine.lastStep);
      if (noiseAmount() > 0) advanceParticleNoise(engine.noise, (stepCounter - engine.lastStep) / rate, settingsRef.current.noiseDirection);
      engine.phase = 0;
      engine.previousPoints = simulation.points;
      engine.history = [];
    }
    engine.lastStep = stepCounter;
    sampleRef.current?.(readSample(simulation));

    let width = 0;
    let height = 0;
    let frame = 0;
    let previous = 0;
    let lastSample = 0;
    let inView = false;
    let yaw = 0, pitch = 0, roll = 0, panX = 0, panY = 0;
    let cosYaw = 1, sinYaw = 0, cosPitch = 1, sinPitch = 0, cosRoll = 1, sinRoll = 0;
    let fadeAmount = 0.7;
    let randomAmount = 0;

    function wander(offset: number) {
      const time = engine.time * 0.16 + offset;
      const segment = Math.floor(time);
      const fraction = time - segment;
      const eased = fraction * fraction * (3 - 2 * fraction);
      const random = (seed: number) => {
        const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
        return (value - Math.floor(value)) * 2 - 1;
      };
      return random(segment) * (1 - eased) + random(segment + 1) * eased;
    }

    function opacity(index: number) {
      const variation = (index * 0.61803398875) % 1;
      const phase = engine.time / (2.4 + variation * 3.1) + variation;
      const envelope = Math.sin(Math.PI * phase) ** 2;
      return 1 - fadeAmount * (1 - envelope);
    }

    function project([x, y, z]: State): State {
      switch (system) {
        case "lorenz": return [x / 21, (z - 25) / 24, y / 30];
        case "rossler": return [(x - 1) / 13, (y * 0.58 + z * 0.65 - 3) / 13, (y * 0.8 - z * 0.4) / 18];
        case "thomas": return [(x - z * 0.45) / 7, (y * 0.8 + (x + z) * 0.23) / 7, (z * 0.8 - x * 0.3) / 8];
        case "chua": return [x / 2.6, y / 0.48, z / 4.2];
        case "rucklidge": return [y / 6, x / 11.5, (z - 7.7) / 8.5];
        case "rabinovich-fabrikant": return [(x + 1.1) / 1.05, (y - 1.05) / 1.65, (z - 0.7) / 0.9];
        case "henon": return [x / 1.4, y / 1.4, 0];
        case "clifford": {
          const extent = Math.max(1 + Math.abs(simulation.parameters.c), 1 + Math.abs(simulation.parameters.d));
          return [x / extent, y / extent, 0];
        }
      }
    }

    function screen(point: State, index: number): State {
      const [px, py, pz] = project(point);
      const offset = engine.noise.offsets[index];
      const turnedX = px * cosYaw + pz * sinYaw;
      const turnedZ = pz * cosYaw - px * sinYaw;
      const turnedY = py * cosPitch - turnedZ * sinPitch;
      const depth = py * sinPitch + turnedZ * cosPitch + (offset?.[2] ?? 0) * randomAmount;
      const x = turnedX * cosRoll - turnedY * sinRoll + panX + (offset?.[0] ?? 0) * randomAmount;
      const y = turnedX * sinRoll + turnedY * cosRoll + panY + (offset?.[1] ?? 0) * randomAmount;
      const scale = Math.min(width * 0.42, height * 0.43);
      const perspective = 1 / (1 + Math.max(-2, Math.min(2, depth)) * 0.12);
      return [
        width / 2 + x * scale * perspective,
        height / 2 - y * scale * perspective,
        perspective,
      ];
    }

    function dot([x, y, perspective]: State, radius: number, alpha: number) {
      if (!context || !Number.isFinite(x) || !Number.isFinite(y)) return;
      context.globalAlpha = alpha;
      context.beginPath();
      context.arc(x, y, radius * perspective, 0, Math.PI * 2);
      context.fill();
    }

    function position(index: number, phase: number): State {
      const to = simulation.points[index];
      const from = engine.previousPoints[index] ?? to;
      const eased = isMap ? phase * phase * (3 - 2 * phase) : phase;
      return [from[0] + (to[0] - from[0]) * eased, from[1] + (to[1] - from[1]) * eased, from[2] + (to[2] - from[2]) * eased];
    }

    function draw() {
      if (!context || !width || !height) return;
      const { color, density, trails, fade, drift, showMarker } = settingsRef.current;
      const dotDensity = Number.isFinite(density) ? Math.max(0.2, Math.min(2, density)) : 1;
      const trailLength = Number.isFinite(trails) ? Math.max(0, Math.min(1, trails)) : 0.55;
      const driftAmount = Number.isFinite(drift) ? Math.max(0, Math.min(1, drift)) : 0.6;
      fadeAmount = Number.isFinite(fade) ? Math.max(0, Math.min(1, fade)) : 0.7;
      randomAmount = noiseAmount();
      context.clearRect(0, 0, width, height);
      context.fillStyle = color;
      context.strokeStyle = color;
      context.lineCap = "round";
      yaw = isMap ? 0 : wander(0) * driftAmount * 0.45;
      pitch = isMap ? 0 : wander(13.7) * driftAmount * 0.3;
      roll = wander(29.3) * driftAmount * 0.08;
      panX = wander(43.1) * driftAmount * (system === "thomas" ? 0.22 : 0.06);
      panY = wander(59.8) * driftAmount * 0.06;
      cosYaw = Math.cos(yaw); sinYaw = Math.sin(yaw);
      cosPitch = Math.cos(pitch); sinPitch = Math.sin(pitch);
      cosRoll = Math.cos(roll); sinRoll = Math.sin(roll);
      const count = simulation.points.length;
      const dotSize = Math.max(0.85, Math.min(1.5, width / 450));
      const visibleCount = Math.min(count, Math.round(1000 * dotDensity));
      const tailCount = Math.min(engine.history.length, Math.ceil(trailLength * 6));
      if (trailLength > 0) {
        context.beginPath();
        context.lineWidth = Math.max(0.65, dotSize * 0.65);
        context.globalAlpha = 0.16 + trailLength * 0.16;
        for (let i = 0; i < visibleCount; i++) {
          const index = Math.floor(i * count / visibleCount);
          const [x, y] = screen(position(index, engine.phase), index);
          context.moveTo(x, y);
          if (isMap) {
            const [tx, ty] = screen(position(index, Math.max(0, engine.phase - 0.18 * trailLength)), index);
            context.lineTo(tx, ty);
          } else {
            for (let age = 0; age < tailCount; age++) {
              const [tx, ty] = screen(engine.history[age][index], index);
              context.lineTo(tx, ty);
            }
          }
        }
        context.stroke();
      }
      for (let i = 0; i < visibleCount; i++) {
        const index = Math.floor(i * count / visibleCount);
        const point = screen(position(index, engine.phase), index);
        const depth = Math.max(0, Math.min(1, (point[2] - 0.75) * 2));
        const variation = (index * 0.61803398875) % 1;
        dot(point, dotSize * (0.7 + variation * 0.4), (0.4 + depth * 0.35 + variation * 0.2) * opacity(index));
      }
      if (showMarker) {
        // Track the sampled particle through the same view and noise offset as the cloud.
        const head = screen(simulation.state, 0);
        dot(head, 4.5, 0.1 * opacity(0));
        dot(head, 2.3, 0.95 * opacity(0));
      }
      context.globalAlpha = 1;
    }

    function tick(now: number) {
      frame = 0;
      if (previous) {
        const elapsed = Math.max(0, Math.min((now - previous) / 1000, 0.05)) * playbackSpeed();
        if (noiseAmount() > 0) advanceParticleNoise(engine.noise, elapsed, settingsRef.current.noiseDirection);
        engine.time += elapsed;
        engine.phase += elapsed * rate;
        const steps = Math.floor(engine.phase);
        engine.phase -= steps;
        advance(steps);
      }
      previous = now;
      draw();
      if (now - lastSample >= 125 || simulation.escaped) {
        sampleRef.current?.(readSample(simulation));
        lastSample = now;
      }
      if (!simulation.escaped) frame = window.requestAnimationFrame(tick);
    }

    function sync() {
      window.cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      draw();
      if (inView && !document.hidden && !paused && !reducedMotion.matches && playbackSpeed() > 0 && !simulation.escaped) {
        frame = window.requestAnimationFrame(tick);
      }
    }
    refreshRef.current = () => {
      const seed = currentNoiseSeed();
      if (seed !== engine.noiseSeed) {
        engine.noise = createParticleNoise(simulation.points.length, seed);
        engine.noiseSeed = seed;
      }
      if (!frame || playbackSpeed() === 0) sync();
      else draw();
    };

    const resizeObserver = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    });
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    reducedMotion.addEventListener("change", sync);
    return () => {
      refreshRef.current = null;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reducedMotion.removeEventListener("change", sync);
    };
  }, [system, parameterKey, resetKey, paused, step]);

  useEffect(() => { refreshRef.current?.(); }, [color, speed, density, trails, fade, drift, showMarker, randomness, noiseDirection, noiseSeed]);

  return <canvas ref={canvasRef} className={className} style={{ width: "100%", height: "100%", display: "block", ...style }} aria-hidden="true" />;
}
