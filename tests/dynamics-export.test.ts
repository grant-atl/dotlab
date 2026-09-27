import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { buildAttractorSource, type AttractorPreset } from "../src/lib/dynamics-export.ts";
import { normalizeParameters, type SystemId } from "../src/lib/dynamics.ts";

const sources = {
  dynamics: readFileSync(new URL("../src/lib/dynamics.ts", import.meta.url), "utf8"),
  noise: readFileSync(new URL("../src/lib/particle-noise.ts", import.meta.url), "utf8"),
  field: readFileSync(new URL("../src/components/AttractorField.tsx", import.meta.url), "utf8"),
  license: readFileSync(new URL("../LICENSE", import.meta.url), "utf8"),
};
const preset: AttractorPreset = {
  system: "lorenz",
  parameters: { sigma: 12.3, rho: 31.2, beta: 8 / 3 },
  color: "#c5a3ff",
  speed: 1.7,
  fade: 0.35,
  drift: 0.25,
  randomness: 0.45,
  noiseDirection: "horizontal",
  noiseSeed: 91,
  density: 0.6,
  trails: 0.8,
  showMarker: false,
};

function loadExport(source: string) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exported: { default?: (props?: object) => { props: Record<string, unknown> }; AttractorField?: unknown } = {};
  runInNewContext(compiled, {
    exports: exported,
    require: (name: string) => {
      if (name === "react") return {};
      if (name === "react/jsx-runtime") return { jsx: (type: unknown, props: object) => ({ type, props }) };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exported;
}

test("the downloaded component typechecks independently with only React imports", () => {
  const multilineField = sources.field.replace(
    /import\s*\{([^}]+)\}\s*from\s*["']\.\.\/lib\/(dynamics|particle-noise)["'];?/g,
    (_match, names: string, module: string) => `import {\n${names.split(",").map((name) => `  ${name.trim()},`).join("\n")}\n} from "../lib/${module}";`,
  );
  const source = buildAttractorSource({ ...sources, field: multilineField }, preset);
  assert.ok(source.startsWith("'use client';"));
  assert.ok(source.includes(sources.license.trim()), "the MIT license must travel with the component");
  const filename = fileURLToPath(new URL("../Attractor.export-check.tsx", import.meta.url));
  const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const imports = parsed.statements.filter(ts.isImportDeclaration).map((statement) => (statement.moduleSpecifier as ts.StringLiteral).text);
  assert.ok(imports.length > 0);
  assert.ok(imports.every((name) => name === "react"), `unexpected exported dependency: ${imports.join(", ")}`);

  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    skipLibCheck: true,
    noEmit: true,
    types: ["react"],
  };
  const host = ts.createCompilerHost(options);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, ...args) => name === filename ? parsed : originalGetSourceFile(name, ...args);
  const program = ts.createProgram([filename], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.deepEqual(diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")), []);
});

test("the default export preserves the chosen preset and accepts independent overrides", () => {
  const exported = loadExport(buildAttractorSource(sources, preset));
  assert.equal(typeof exported.AttractorField, "function");
  assert.equal(typeof exported.default, "function");
  const result = exported.default!().props;
  assert.deepEqual(JSON.parse(JSON.stringify(result)), preset);
  assert.equal((result.parameters as Record<string, number>).beta, 8 / 3);
  assert.equal(result.trails, 0.8);
  assert.equal(result.speed, 1.7);
  assert.equal(result.fade, 0.35);
  assert.equal(result.drift, 0.25);
  assert.equal(result.randomness, 0.45);
  assert.equal(result.noiseDirection, "horizontal");
  assert.equal(result.noiseSeed, 91);
  assert.equal(result.showMarker, false);
  const modified = exported.default!({ parameters: { rho: 20 }, speed: 0.5, randomness: 0.8, noiseDirection: "all", noiseSeed: 123, showMarker: true, style: { height: 480 } }).props;
  assert.equal(modified.speed, 0.5);
  assert.equal(modified.showMarker, true);
  assert.equal(modified.randomness, 0.8);
  assert.equal(modified.noiseDirection, "all");
  assert.equal(modified.noiseSeed, 123);
  assert.deepEqual(JSON.parse(JSON.stringify(modified.parameters)), { ...preset.parameters, rho: 20 });
  assert.deepEqual(modified.style, { height: 480 });
  const switched = exported.default!({ system: "henon" }).props;
  assert.equal(switched.system, "henon");
  assert.equal(switched.parameters, undefined, "changing systems must use the new system's defaults");
});

test("new flow exports preserve coefficients and allow switching systems", () => {
  const additions: SystemId[] = ["chua", "rucklidge", "rabinovich-fabrikant"];
  for (const system of additions) {
    const parameters = normalizeParameters(system);
    const chosen = { ...preset, system, parameters };
    const exported = loadExport(buildAttractorSource(sources, chosen));
    assert.equal(typeof exported.AttractorField, "function");
    assert.deepEqual(JSON.parse(JSON.stringify(exported.default!().props)), chosen, system);
    const key = Object.keys(parameters)[0];
    const overrides = { [key]: parameters[key] + 0.01 };
    const changed = exported.default!({ parameters: overrides }).props;
    assert.deepEqual(JSON.parse(JSON.stringify(changed.parameters)), { ...parameters, ...overrides }, system);
    const switched = exported.default!({ system: "lorenz" }).props;
    assert.equal(switched.system, "lorenz");
    assert.equal(switched.parameters, undefined, `${system}: coefficients must not leak into another system`);
  }
});
