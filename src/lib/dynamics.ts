export const SYSTEMS = [
  {
    id: "lorenz", name: "Lorenz", kind: "flow", description: "A convection model with two lobes and sensitive dependence on initial conditions.",
    equations: ["dx/dt = σ(y − x)", "dy/dt = x(ρ − z) − y", "dz/dt = xy − βz"],
    source: "https://doi.org/10.1175/1520-0469(1963)020<0130:DNF>2.0.CO;2",
    parameters: [{ key: "sigma", label: "σ", min: 1, max: 30, step: 0.1, value: 10 }, { key: "rho", label: "ρ", min: 0, max: 50, step: 0.1, value: 28 }, { key: "beta", label: "β", min: 0.5, max: 5, step: 0.01, value: 8 / 3 }],
  },
  {
    id: "rossler", name: "Rössler", kind: "flow", description: "A spiral stretches, folds, and returns through a single nonlinear interaction.",
    equations: ["dx/dt = −y − z", "dy/dt = x + ay", "dz/dt = b + z(x − c)"],
    source: "https://www.scholarpedia.org/article/Rossler_attractor",
    parameters: [{ key: "a", label: "a", min: 0.05, max: 0.4, step: 0.005, value: 0.2 }, { key: "b", label: "b", min: 0.05, max: 0.4, step: 0.005, value: 0.2 }, { key: "c", label: "c", min: 3, max: 10, step: 0.1, value: 5.7 }],
  },
  {
    id: "thomas", name: "Thomas", kind: "flow", description: "Three sine-driven coordinates form a cyclically symmetric flow.",
    equations: ["dx/dt = sin(y) − bx", "dy/dt = sin(z) − by", "dz/dt = sin(x) − bz"],
    source: "https://sprott.physics.wisc.edu/pubs/paper302.pdf",
    parameters: [{ key: "b", label: "b", min: 0.05, max: 0.4, step: 0.005, value: 0.1 }],
  },
  {
    id: "chua", name: "Chua", kind: "flow", description: "A nonlinear circuit folds a double scroll around two centers.",
    equations: ["dx/dt = α(y − x − g(x))", "dy/dt = x − y + z", "dz/dt = −βy", "g(x) = m₁x + ½(m₀ − m₁)(|x + 1| − |x − 1|)"],
    source: "https://www.scholarpedia.org/article/Chua_circuit",
    parameters: [{ key: "alpha", label: "α", min: 12, max: 18, step: 0.1, value: 15.6 }, { key: "beta", label: "β", min: 25, max: 35, step: 0.1, value: 31 }, { key: "m0", label: "m₀", min: -1.3, max: -1.01, step: 0.001, value: -8 / 7 }, { key: "m1", label: "m₁", min: -0.9, max: -0.5, step: 0.001, value: -5 / 7 }],
  },
  {
    id: "rucklidge", name: "Rucklidge", kind: "flow", description: "A convection model winds around two wings through quadratic feedback.",
    equations: ["dx/dt = −κx + λy − yz", "dy/dt = x", "dz/dt = −z + y²"],
    source: "https://doi.org/10.1017/S0022112092003392",
    parameters: [{ key: "kappa", label: "κ", min: 1, max: 3, step: 0.01, value: 2 }, { key: "lambda", label: "λ", min: 4, max: 8, step: 0.01, value: 6.7 }],
  },
  {
    id: "rabinovich-fabrikant", name: "Rabinovich–Fabrikant", kind: "flow", description: "Coupled nonlinear waves curl into a folded, twisting attractor.",
    equations: ["dx/dt = y(z − 1 + x²) + ax", "dy/dt = x(3z + 1 − x²) + ay", "dz/dt = −2z(b + xy)"],
    source: "https://jetp.ras.ru/cgi-bin/dn/e_050_02_0311.pdf",
    parameters: [{ key: "a", label: "a", min: 0.5, max: 1, step: 0.005, value: 0.87 }, { key: "b", label: "b", min: 0.8, max: 1.4, step: 0.005, value: 1.1 }],
  },
  {
    id: "henon", name: "Hénon", kind: "map", description: "Repeated stretching and folding leaves a thin family of curved filaments.",
    equations: ["xₙ₊₁ = 1 − axₙ² + yₙ", "yₙ₊₁ = bxₙ"],
    source: "https://doi.org/10.1007/BF01608556",
    parameters: [{ key: "a", label: "a", min: 0.5, max: 1.5, step: 0.01, value: 1.4 }, { key: "b", label: "b", min: 0.1, max: 0.4, step: 0.01, value: 0.3 }],
  },
  {
    id: "clifford", name: "Clifford", kind: "map", description: "Sine and cosine feedback builds a layered distribution of visits.",
    equations: ["xₙ₊₁ = sin(ayₙ) + c cos(axₙ)", "yₙ₊₁ = sin(bxₙ) + d cos(byₙ)"],
    source: "https://www.paulbourke.net/fractals/clifford/",
    parameters: [{ key: "a", label: "a", min: -2, max: 2, step: 0.05, value: -1.4 }, { key: "b", label: "b", min: -2, max: 2, step: 0.05, value: 1.6 }, { key: "c", label: "c", min: -2, max: 2, step: 0.05, value: 1 }, { key: "d", label: "d", min: -2, max: 2, step: 0.05, value: 0.7 }],
  },
] as const;

export type SystemId = (typeof SYSTEMS)[number]["id"];
export type State = [number, number, number];
export type LiveSample = { state: State; next: State; iteration: number; escaped: boolean };
export type Simulation = { system: SystemId; parameters: Record<string, number>; state: State; iteration: number; escaped: boolean; points: State[] };

export function normalizeParameters(system: SystemId, overrides: Record<string, number> = {}): Record<string, number> {
  return Object.fromEntries(SYSTEMS.find((item) => item.id === system)!.parameters.map(({ key, min, max, value }) => [key, Number.isFinite(overrides[key]) ? Math.max(min, Math.min(max, overrides[key])) : value]));
}

/** Flows return instantaneous rates; maps return the next state, using the old coordinates together. */
export function systemValue(system: SystemId, [x, y, z]: State, p: Record<string, number>): State {
  switch (system) {
    case "lorenz": return [p.sigma * (y - x), x * (p.rho - z) - y, x * y - p.beta * z];
    case "rossler": return [-y - z, x + p.a * y, p.b + z * (x - p.c)];
    case "thomas": return [Math.sin(y) - p.b * x, Math.sin(z) - p.b * y, Math.sin(x) - p.b * z];
    case "chua": {
      const g = p.m1 * x + (p.m0 - p.m1) / 2 * (Math.abs(x + 1) - Math.abs(x - 1));
      return [p.alpha * (y - x - g), x - y + z, -p.beta * y];
    }
    case "rucklidge": return [-p.kappa * x + p.lambda * y - y * z, x, -z + y * y];
    case "rabinovich-fabrikant": return [y * (z - 1 + x * x) + p.a * x, x * (3 * z + 1 - x * x) + p.a * y, -2 * z * (p.b + x * y)];
    case "henon": return [1 - p.a * x * x + y, p.b * x, 0];
    case "clifford": return [Math.sin(p.a * y) + p.c * Math.cos(p.a * x), Math.sin(p.b * x) + p.d * Math.cos(p.b * y), 0];
  }
}

export function stepState(system: SystemId, state: State, parameters: Record<string, number>): State {
  const h = system === "lorenz" ? 0.01 : system === "rossler" ? 0.02 : system === "thomas" ? 0.04 : system === "henon" || system === "clifford" ? 0 : 0.005;
  const a = systemValue(system, state, parameters);
  if (!h) return a;
  const [x, y, z] = state;
  const half = h / 2;
  const b = systemValue(system, [x + a[0] * half, y + a[1] * half, z + a[2] * half], parameters);
  const c = systemValue(system, [x + b[0] * half, y + b[1] * half, z + b[2] * half], parameters);
  const d = systemValue(system, [x + c[0] * h, y + c[1] * h, z + c[2] * h], parameters);
  return [
    x + h / 6 * (a[0] + 2 * b[0] + 2 * c[0] + d[0]),
    y + h / 6 * (a[1] + 2 * b[1] + 2 * c[1] + d[1]),
    z + h / 6 * (a[2] + 2 * b[2] + 2 * c[2] + d[2]),
  ];
}

const finiteState = (state: State) => state.every((value) => Number.isFinite(value) && Math.abs(value) <= 10_000);

export function advanceSimulation(simulation: Simulation, steps = 1): void {
  const count = Number.isFinite(steps) ? Math.max(0, Math.min(10_000, Math.floor(steps))) : 0;
  for (let i = 0; i < count && !simulation.escaped; i++) {
    if (!finiteState(simulation.state)) { simulation.escaped = true; break; }
    if (simulation.points.length) {
      const nextPoints: State[] = [];
      for (const point of simulation.points) {
        if (!finiteState(point)) { simulation.escaped = true; break; }
        const next = stepState(simulation.system, point, simulation.parameters);
        if (!finiteState(next)) { simulation.escaped = true; break; }
        nextPoints.push(next);
      }
      if (simulation.escaped) break;
      simulation.points = nextPoints;
      simulation.state = nextPoints[0];
      simulation.iteration++;
      continue;
    }
    const next = stepState(simulation.system, simulation.state, simulation.parameters);
    if (!finiteState(next)) { simulation.escaped = true; break; }
    simulation.state = next;
    simulation.iteration++;
  }
}

export function createSimulation(system: SystemId, overrides: Record<string, number> = {}, capacity = 2400): Simulation {
  const state: State = system === "lorenz" ? [1, 1, 1] : system === "chua" ? [0.7, 0, 0] : system === "rucklidge" ? [0.1, 0.1, 0.1] : system === "rabinovich-fabrikant" ? [-1, 0, 0.5] : [0.1, 0.2, 0.3];
  const simulation: Simulation = { system, parameters: normalizeParameters(system, overrides), state, iteration: 0, escaped: false, points: [] };
  const longFlow = system === "chua" || system === "rucklidge" || system === "rabinovich-fabrikant";
  advanceSimulation(simulation, system === "thomas" || longFlow ? 6000 : 1500);
  const count = Number.isFinite(capacity) ? Math.max(1, Math.min(6500, Math.floor(capacity))) : 2400;
  const span = Math.max(longFlow ? 12000 : system === "thomas" ? 6000 : 3600, count);
  const history: State[] = [];
  // Seed the full shape even at small capacities; each retained state then evolves independently.
  for (let i = 0; i < span && !simulation.escaped; i++) {
    advanceSimulation(simulation);
    if (!simulation.escaped && i === Math.floor((history.length + 1) * span / count) - 1) history.push(simulation.state);
  }
  if (!simulation.escaped) {
    simulation.points = history.reverse();
    simulation.state = simulation.points[0];
  }
  return simulation;
}

export function readSample(simulation: Simulation): LiveSample {
  return { state: [...simulation.state], next: systemValue(simulation.system, simulation.state, simulation.parameters), iteration: simulation.iteration, escaped: simulation.escaped };
}
