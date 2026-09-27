import type { SystemId } from "./dynamics";

export type AttractorPreset = {
  system: SystemId;
  parameters: Record<string, number>;
  color: string;
  speed: number;
  fade?: number;
  drift?: number;
  randomness?: number;
  noiseDirection?: "all" | "horizontal";
  noiseSeed?: number;
  showMarker?: boolean;
  density: number;
  trails?: number;
};

export function buildAttractorSource(
  sources: { dynamics: string; noise: string; field: string; license: string },
  preset: AttractorPreset,
) {
  const field = sources.field.replace(
    /^import\s+(?:type\s+)?\{[^}]*\}\s+from\s*["']\.\.\/lib\/(?:dynamics|particle-noise)(?:\.ts)?["'];?[ \t]*\r?\n?/gm,
    "",
  );
  const settings = JSON.stringify(preset, null, 2);
  return `'use client';\n\n/*\n${sources.license.trim()}\n*/\n\n${sources.dynamics.trim()}\n\n${sources.noise.trim()}\n\n${field.trim()}\n\nconst savedAttractorSettings = ${settings} satisfies AttractorFieldProps;\n\nexport default function Attractor(props: AttractorFieldProps = {}) {\n  const system = props.system ?? savedAttractorSettings.system;\n  const parameters = system === savedAttractorSettings.system\n    ? { ...savedAttractorSettings.parameters, ...props.parameters }\n    : props.parameters;\n  return <AttractorField {...savedAttractorSettings} {...props} system={system} parameters={parameters} />;\n}\n`;
}

export const attractorUsage = `import Attractor from './Attractor';

export default function Hero() {
  return (
    <div style={{ background: '#111310' }}>
      <Attractor style={{ width: '100%', height: 480 }} />
    </div>
  );
}`;
