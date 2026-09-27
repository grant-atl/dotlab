import type { LoaderState } from "./loaders";

export type LoaderPreset = {
  state: LoaderState;
  size: number;
  color: string;
  speed: number;
  intensity: number;
  spacing: number;
  dotSize: number;
  depth: number;
  yaw: number;
  pitch: number;
  level: number;
  paused: boolean;
};

export function buildLoaderSource(
  sources: { loaders: string; field: string; license: string },
  preset: LoaderPreset,
) {
  const field = sources.field.replace(
    /^import\s+(?:type\s+)?\{[^}]*\}\s+from\s*["']\.\.\/lib\/loaders(?:\.ts)?["'];?[ \t]*\r?\n?/gm,
    "",
  );
  return `'use client';\n\n/*\n${sources.license.trim()}\n*/\n\n${sources.loaders.trim()}\n\n${field.trim()}\n\nconst savedLoaderSettings = ${JSON.stringify(preset, null, 2)} satisfies DotLoaderProps;\n\nexport default function SavedDotLoader(props: DotLoaderProps = {}) {\n  return <DotLoader {...savedLoaderSettings} {...props} />;\n}\n`;
}

export const loaderUsage = `import DotLoader, { type LoaderState } from './DotLoader';

export default function AssistantStatus({ state }: { state: LoaderState }) {
  return <DotLoader state={state} label={state} />;
}`;
