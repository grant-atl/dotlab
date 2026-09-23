export const PATTERNS = [
  {
    id: "sphere",
    name: "Living sphere",
    category: "Orb",
    description: "A quiet world of particles, turning in place.",
  },
  {
    id: "torus",
    name: "Soft torus",
    category: "Orb",
    description: "An endless loop with a gentle, organic pulse.",
  },
  {
    id: "wave",
    name: "Wave field",
    category: "Wave",
    description: "A rolling surface that stretches to the horizon.",
  },
  {
    id: "vortex",
    name: "Vortex",
    category: "Flow",
    description: "Seven spiraling currents finding their center.",
  },
  {
    id: "helix",
    name: "Helix",
    category: "Structure",
    description: "A continuous coil with room to breathe.",
  },
  {
    id: "ripple",
    name: "Ripple",
    category: "Wave",
    description: "Soft concentric waves across a particle pool.",
  },
  {
    id: "galaxy",
    name: "Spiral galaxy",
    category: "Flow",
    description: "Four arms of stardust in a slow cosmic drift.",
  },
  {
    id: "cube",
    name: "Floating cube",
    category: "Structure",
    description: "Six dotted planes, suspended in space.",
  },
  {
    id: "infinity",
    name: "Infinity",
    category: "Flow",
    description: "A figure eight that never finds an ending.",
  },
  {
    id: "aurora",
    name: "Aurora",
    category: "Wave",
    description: "Layers of light folding like weightless fabric.",
  },
  {
    id: "dna",
    name: "Double helix",
    category: "Structure",
    description: "Two intertwined strands with a shared rhythm.",
  },
  {
    id: "bloom",
    name: "Particle bloom",
    category: "Orb",
    description: "Six soft petals opening from a common center.",
  },
  {
    id: "tunnel",
    name: "Wormhole",
    category: "Flow",
    description: "An unhurried journey through rings of light.",
  },
  {
    id: "orbit",
    name: "Orbital",
    category: "Orb",
    description: "Three particle rings orbiting a tiny world.",
  },
  {
    id: "terrain",
    name: "Terrain",
    category: "Wave",
    description: "A dotted landscape shaped by flowing contours.",
  },
  {
    id: "knot",
    name: "Trefoil knot",
    category: "Structure",
    description: "One continuous thread, woven through itself.",
  },
  {
    id: "rain",
    name: "Digital rain",
    category: "Flow",
    description: "A steady shower of light with layers of depth.",
  },
  {
    id: "constellation",
    name: "Constellation",
    category: "Orb",
    description: "Small particle worlds drifting together.",
  },
  {
    id: "pulse",
    name: "Resonance",
    category: "Orb",
    description: "Nested shells expanding in a measured rhythm.",
  },
  {
    id: "lattice",
    name: "Living lattice",
    category: "Structure",
    description: "An ordered grid with a subtle wave of motion.",
  },
] as const;

export type PatternId = (typeof PATTERNS)[number]["id"];
export type Point = { x: number; y: number; z: number };

const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const noise = (n: number) =>
  (((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1) + 1) % 1;

function globe(i: number, count: number, radius = 1): Point {
  const y = 1 - (2 * (i + 0.5)) / count;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  return {
    x: Math.cos(i * GOLDEN) * r * radius,
    y: y * radius,
    z: Math.sin(i * GOLDEN) * r * radius,
  };
}

/** Deterministic geometry in world coordinates. Time is measured in seconds. */
export function samplePoint(
  pattern: PatternId,
  i: number,
  count: number,
  t: number,
): Point {
  const u = i / Math.max(1, count - 1);
  const angle = i * GOLDEN;

  switch (pattern) {
    case "sphere": {
      const p = globe(i, count);
      const r =
        1 +
        0.045 * Math.sin(p.y * 5 + t * 0.8) * Math.cos(angle * 2 + t * 0.25);
      return { x: p.x * r, y: p.y * r, z: p.z * r };
    }
    case "torus": {
      const columns = Math.ceil(Math.sqrt(count * 3));
      const a = ((i % columns) / columns) * TAU;
      const b = (Math.floor(i / columns) / Math.ceil(count / columns)) * TAU;
      const tube = 0.31 + 0.035 * Math.sin(a * 3 + t);
      const r = 0.89 + tube * Math.cos(b);
      return { x: r * Math.cos(a), y: r * Math.sin(a), z: tube * Math.sin(b) };
    }
    case "wave":
    case "terrain": {
      const columns = Math.ceil(Math.sqrt(count * 1.8));
      const x = ((i % columns) / (columns - 1) - 0.5) * 3.2;
      const z =
        (Math.floor(i / columns) / Math.max(1, Math.ceil(count / columns) - 1) -
          0.5) *
        2.1;
      const y =
        pattern === "wave"
          ? 0.3 * Math.sin(x * 2.5 + t * 0.7) + 0.12 * Math.cos(z * 3 - t * 0.5)
          : 0.3 * Math.sin(x * 2.4 + t * 0.2) * Math.cos(z * 2.8 - t * 0.25) +
            0.16 * Math.sin(z * 4 + x * 2);
      return { x, y, z };
    }
    case "vortex": {
      const a = u * TAU * 2.1 + ((i % 7) * TAU) / 7 + t * 0.3;
      const r = 0.13 + u * 1.13;
      return { x: Math.cos(a) * r, y: (u - 0.5) * 1.8, z: Math.sin(a) * r };
    }
    case "helix": {
      const along = Math.floor(i / 8) / Math.max(1, Math.ceil(count / 8) - 1);
      const a = along * TAU * 2.3 + t * 0.35;
      const b = ((i % 8) * TAU) / 8;
      const r = 0.68 + 0.11 * Math.cos(b);
      return {
        x: Math.cos(a) * r,
        y: (along - 0.5) * 2.7 + 0.11 * Math.sin(b),
        z: Math.sin(a) * r,
      };
    }
    case "ripple": {
      const r = Math.sqrt(u) * 1.42;
      return {
        x: Math.cos(angle) * r,
        y: Math.sin(r * 9 - t * 1.5) * 0.16,
        z: Math.sin(angle) * r,
      };
    }
    case "galaxy": {
      const r = Math.sqrt(u) * 1.45;
      const a =
        ((i % 4) * TAU) / 4 + r * 2.8 - t * 0.18 + (noise(i) - 0.5) * 0.65;
      return {
        x: Math.cos(a) * r,
        y: (noise(i + 41) - 0.5) * 0.2,
        z: Math.sin(a) * r,
      };
    }
    case "cube": {
      const side = Math.ceil(Math.sqrt(count / 6));
      const cell = Math.floor(i / 6);
      const a = ((cell % side) / Math.max(1, side - 1)) * 1.8 - 0.9;
      const b = (Math.floor(cell / side) / Math.max(1, side - 1)) * 1.8 - 0.9;
      const edge = 0.91 + Math.sin(t * 0.65) * 0.035;
      switch (i % 6) {
        case 0:
          return { x: edge, y: a, z: b };
        case 1:
          return { x: -edge, y: a, z: b };
        case 2:
          return { x: a, y: edge, z: b };
        case 3:
          return { x: a, y: -edge, z: b };
        case 4:
          return { x: a, y: b, z: edge };
        default:
          return { x: a, y: b, z: -edge };
      }
    }
    case "infinity": {
      const a = (Math.floor(i / 8) / Math.ceil(count / 8)) * TAU;
      const b = ((i % 8) * TAU) / 8 + t * 0.35;
      const d = 1 + Math.sin(a) ** 2;
      return {
        x: (1.6 * Math.cos(a)) / d,
        y: (1.5 * Math.sin(a) * Math.cos(a)) / d + 0.12 * Math.cos(b),
        z: 0.3 * Math.sin(a) + 0.12 * Math.sin(b),
      };
    }
    case "aurora": {
      const columns = Math.ceil(Math.sqrt(count));
      const cell = Math.floor(i / 3);
      const x = ((cell % columns) / (columns - 1) - 0.5) * 3.1;
      const ribbon = (i % 3) - 1;
      const row =
        Math.floor(cell / columns) /
          Math.max(1, Math.ceil(count / (columns * 3)) - 1) -
        0.5;
      return {
        x,
        y: Math.sin(x * 1.9 + t * 0.4 + ribbon * 0.6) * 0.45 + row * 0.65,
        z: Math.cos(x * 1.6 + t * 0.3) * 0.35 + ribbon * 0.45,
      };
    }
    case "dna": {
      const strandCount = Math.floor(count * 0.7);
      if (i < strandCount) {
        const along =
          Math.floor(i / 8) / Math.max(1, Math.ceil(strandCount / 8) - 1);
        const a = along * TAU * 1.65 + t * 0.3 + (i % 2) * Math.PI;
        const b = (Math.floor((i % 8) / 2) * TAU) / 4;
        return {
          x: Math.cos(a) * (0.65 + Math.cos(b) * 0.065),
          y: (along - 0.5) * 2.7 + Math.sin(b) * 0.065,
          z: Math.sin(a) * (0.65 + Math.cos(b) * 0.065),
        };
      }
      const columns = Math.ceil((count - strandCount) / 18);
      const cell = i - strandCount;
      const along = Math.floor(cell / columns) / 17;
      const across = ((cell % columns) / Math.max(1, columns - 1)) * 2 - 1;
      const a = along * TAU * 1.65 + t * 0.3;
      return {
        x: Math.cos(a) * across * 0.65,
        y: (along - 0.5) * 2.7,
        z: Math.sin(a) * across * 0.65,
      };
    }
    case "bloom": {
      const a = angle + t * 0.05;
      const r = Math.sqrt(u) * (0.92 + 0.3 * Math.cos(a * 6));
      return {
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        z: 0.3 * Math.cos(r * 3 - t * 0.6) + 0.12 * Math.sin(a * 6),
      };
    }
    case "tunnel": {
      const columns = Math.ceil(count / 22);
      const a = ((i % columns) / columns) * TAU;
      const depth = (Math.floor(i / columns) / 22 + t * 0.035) % 1;
      const r = 0.85 + 0.04 * Math.sin(a * 6 + t * 0.4);
      return { x: Math.cos(a) * r, y: Math.sin(a) * r, z: (depth - 0.5) * 3.2 };
    }
    case "orbit": {
      const centerCount = Math.floor(count * 0.23);
      if (i < centerCount) return globe(i, centerCount, 0.34);
      const cell = i - centerCount;
      const a = (cell / (count - centerCount)) * TAU * 3 + t * 0.2;
      const tilt = ((cell % 3) * Math.PI) / 3 + 0.3;
      const x = Math.cos(a) * 1.18;
      const y = Math.sin(a) * 1.18;
      return {
        x,
        y: y * Math.cos(tilt),
        z: y * Math.sin(tilt) + (noise(i) - 0.5) * 0.05,
      };
    }
    case "knot": {
      const a = (Math.floor(i / 8) / Math.ceil(count / 8)) * TAU;
      const b = ((i % 8) * TAU) / 8 + t * 0.2;
      return {
        x: (Math.sin(a) + 2 * Math.sin(2 * a)) * 0.43 + 0.1 * Math.cos(b),
        y: (Math.cos(a) - 2 * Math.cos(2 * a)) * 0.43 + 0.1 * Math.sin(b),
        z: -Math.sin(3 * a) * 0.43 + 0.08 * Math.cos(b),
      };
    }
    case "rain": {
      const y =
        ((noise(i + 83) * 2.8 + t * (0.25 + noise(i % 43) * 0.4)) % 2.8) - 1.4;
      return {
        x: (noise(i % 43) - 0.5) * 2.8 + y * 0.12,
        y,
        z: (noise((i % 43) + 92) - 0.5) * 1.4,
      };
    }
    case "constellation": {
      const cluster = i % 7;
      const a = cluster * GOLDEN + t * 0.08;
      const p = globe(
        Math.floor(i / 7),
        Math.ceil(count / 7),
        0.24 + 0.04 * Math.sin(t + cluster),
      );
      return {
        x: Math.cos(a) * 0.95 + p.x,
        y: Math.sin(cluster * 2.1 + t * 0.12) * 0.75 + p.y,
        z: Math.sin(a) * 0.75 + p.z,
      };
    }
    case "pulse": {
      const shell = i % 3;
      return globe(
        Math.floor(i / 3),
        Math.ceil(count / 3),
        0.44 + shell * 0.3 + Math.sin(t * 1.1 - shell * 0.8) * 0.09,
      );
    }
    case "lattice": {
      const side = Math.ceil(Math.cbrt(count));
      const cell = Math.floor((i * side ** 3) / count);
      const x = ((cell % side) / Math.max(1, side - 1)) * 1.8 - 0.9;
      const y =
        ((Math.floor(cell / side) % side) / Math.max(1, side - 1)) * 1.8 - 0.9;
      const z =
        (Math.floor(cell / side ** 2) / Math.max(1, side - 1)) * 1.8 - 0.9;
      return { x, y: y + 0.07 * Math.sin(x * 3 + z * 4 + t), z };
    }
  }
}
