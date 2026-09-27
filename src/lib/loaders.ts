export const COMPLETE_DURATION = 2.4;

export const LOADER_STATES = [
  { id: "idle", name: "Idle", description: "A quiet, breathing cube." },
  { id: "connecting", name: "Connecting", description: "Sliding layers align as a signal links the dots." },
  { id: "listening", name: "Listening", description: "Columns respond to an input level." },
  { id: "searching", name: "Searching", description: "A light sweeps across the lattice." },
  { id: "retrieving", name: "Retrieving", description: "Layers draw information toward the front." },
  { id: "processing", name: "Processing", description: "Rows and columns take turns rotating through the cube." },
  { id: "generating", name: "Generating", description: "The cube builds upward, one layer at a time." },
  { id: "streaming", name: "Streaming", description: "Dots flow forward and loop back through nine lanes." },
  { id: "complete", name: "Complete", description: "Dots gather at the center, then unfold into idle breathing." },
] as const;

export type LoaderState = (typeof LOADER_STATES)[number]["id"];
export type LoaderPoint = { x: number; y: number; z: number; alpha: number; scale: number };

const LOADER_TURNS = [
  ["y", 1, 1], ["x", 1, 1], ["y", -1, -1], ["x", -1, -1],
  ["x", -1, 1], ["y", -1, 1], ["x", 1, -1], ["y", 1, -1],
] as const;

export function sampleLoaderPoint(state: LoaderState, index: number, time: number, intensity = 0.65, level = 0.5): LoaderPoint {
  const t = Number.isFinite(time) ? Math.max(0, time) : 0;
  const amount = Number.isFinite(intensity) ? Math.max(0, Math.min(1, intensity)) : 0.65;
  const input = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0.5;
  const x = index % 3 - 1;
  const y = Math.floor(index / 3) % 3 - 1;
  const z = Math.floor(index / 9) - 1;
  const point: LoaderPoint = { x, y, z, alpha: 0.78, scale: 1 };
  switch (state) {
    case "idle": {
      const breath = Math.sin(t * 0.85);
      const expand = 1 + amount * 0.045 * breath;
      point.x *= expand; point.y *= expand; point.z *= expand;
      point.alpha = 0.76 + amount * 0.12 * breath;
      break;
    }
    case "connecting": {
      const order = (z + 1) * 9 + (y + 1) * 3 + ((y + z) % 2 === 0 ? x + 1 : 1 - x);
      const signal = Math.max(0, Math.cos(order * 0.4 - t * 1.6)) ** 6;
      const separate = 0.5 + 0.5 * Math.cos(t * 1.05);
      point.x += amount * z * separate * 0.55;
      point.y += amount * z * separate * 0.1;
      point.z *= 1 + amount * separate * 0.12;
      point.alpha = 0.48 + 0.5 * signal;
      point.scale = 0.88 + amount * 0.34 * signal;
      break;
    }
    case "listening": {
      const wave = 0.5 + 0.5 * Math.sin(t * 2.2 + x * 1.1 + z * 0.8);
      point.y *= 0.68 + amount * input * (0.32 + 0.5 * wave);
      point.alpha = 0.55 + input * (0.18 + 0.25 * wave);
      point.scale = 0.92 + amount * input * wave * 0.2;
      break;
    }
    case "searching": {
      const scan = Math.sin(t * 0.95) * 1.25;
      const light = Math.exp(-((x - scan) ** 2) * 3.4);
      point.x += amount * light * 0.09;
      point.alpha = 0.35 + light * 0.65;
      point.scale = 0.88 + amount * light * 0.26;
      break;
    }
    case "retrieving": {
      const wave = Math.sin(t * 1.5 - z * 1.5);
      point.z += amount * wave * 0.2;
      point.y -= amount * (0.5 + 0.5 * wave) * 0.07;
      point.alpha = 0.52 + 0.44 * (0.5 + 0.5 * wave);
      point.scale = 0.9 + amount * (0.5 + 0.5 * wave) * 0.23;
      break;
    }
    case "processing": {
      const phase = t % (LOADER_TURNS.length * 1.28);
      const current = Math.floor(phase / 1.28);
      for (let turn = 0; turn <= current; turn++) {
        const [axis, layer, direction] = LOADER_TURNS[turn];
        if (point[axis] !== layer) continue;
        const localTime = phase - current * 1.28;
        const progress = turn < current || localTime >= 1 - 1e-12 ? 1 : localTime;
        const eased = progress ** 3 * (progress * (progress * 6 - 15) + 10);
        const angle = eased * direction * Math.PI / 2;
        const cosine = progress === 1 ? 0 : Math.cos(angle);
        const sine = progress === 1 ? direction : Math.sin(angle);
        const first = axis === "y" ? point.x : point.y;
        const second = point.z;
        if (axis === "y") {
          point.x = first * cosine + second * sine;
          point.z = second * cosine - first * sine;
        } else {
          point.y = first * cosine - second * sine;
          point.z = first * sine + second * cosine;
        }
        if (turn === current) {
          const accent = Math.sin(progress * Math.PI) ** 2;
          point.alpha = 0.78 + amount * accent * 0.2;
          point.scale = 1 + amount * accent * 0.06;
        }
      }
      break;
    }
    case "generating": {
      const phase = t % 5.2;
      const ease = (value: number) => {
        const progress = Math.max(0, Math.min(1, value));
        return progress ** 3 * (progress * (progress * 6 - 15) + 10);
      };
      const unfold = 1 - ease((phase - 3.2) / 1.6);
      const bottom = ease(phase / 0.8) * unfold;
      const middle = ease((phase - 0.55) / 0.95) * unfold;
      const top = ease((phase - 1.1) / 0.95) * unfold;
      const build = y === 1 ? bottom : y === 0 ? middle : top;
      // Grow the gaps in order so the stacked layers never pass through each other.
      const height = 1 - (y <= 0 ? 0.16 + 0.84 * middle : 0) - (y < 0 ? 0.16 + 0.84 * top : 0);
      point.y += amount * (height - y);
      point.x *= 1 - amount * 0.55 * (1 - build);
      point.z *= 1 - amount * 0.55 * (1 - build);
      point.alpha = 0.78 - amount * 0.32 * (1 - build) + amount * 0.15 * Math.sin(build * Math.PI) ** 2;
      point.scale = 1 - amount * 0.3 * (1 - build);
      break;
    }
    case "streaming": {
      const phase = t * Math.PI * 2 / 4.8 + (z + 1) * Math.PI * 2 / 3 + (x + y) * 0.14;
      point.x = x + (0.23 + amount * 0.11) * Math.cos(phase);
      point.z = (1.08 + amount * 0.12) * Math.sin(phase);
      point.alpha = 0.75 + 0.18 * (0.5 + 0.5 * Math.cos(phase));
      break;
    }
    case "complete": {
      if (t >= COMPLETE_DURATION) return sampleLoaderPoint("idle", index, t - COMPLETE_DURATION, amount, input);
      const ease = (progress: number) => progress ** 3 * (progress * (progress * 6 - 15) + 10);
      let radius = 0;
      let gathered = 1;
      if (t < 0.85) {
        gathered = ease(t / 0.85);
        radius = 1 - gathered;
        point.alpha = 0.76 + 0.24 * gathered;
      } else if (t <= 1.2) {
        point.alpha = 1;
      } else {
        const expand = ease((t - 1.2) / (COMPLETE_DURATION - 1.2));
        const breath = Math.sin((t - COMPLETE_DURATION) * 0.85);
        radius = expand * (1 + amount * 0.045 * breath);
        gathered = 1 - expand;
        point.alpha = 1 + (0.76 + amount * 0.12 * breath - 1) * expand;
      }
      point.x = radius === 0 ? 0 : x * radius;
      point.y = radius === 0 ? 0 : y * radius;
      point.z = radius === 0 ? 0 : z * radius;
      point.scale = 1 + amount * gathered * 0.12;
      break;
    }
  }
  return point;
}
