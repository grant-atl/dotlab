import { advanceSimulation, createSimulation, SYSTEMS, type SystemId } from "./dynamics.ts";

export function acceptDynamicsParameters(
  system: SystemId,
  current: Record<string, number>,
  candidate: Record<string, number>,
) {
  const metadata = SYSTEMS.find((item) => item.id === system)!;
  if (!metadata.parameters.every(({ key, min, max }) => (
    Number.isFinite(candidate[key]) && candidate[key] >= min && candidate[key] <= max
  ))) return current;

  // One particle covers the full seeding history without advancing a whole ensemble.
  const trial = createSimulation(system, candidate, 1);
  advanceSimulation(trial, 1000);
  return trial.escaped ? current : candidate;
}
