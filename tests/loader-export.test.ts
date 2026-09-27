import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { buildLoaderSource, loaderUsage, type LoaderPreset } from "../src/lib/loader-export.ts";

const sources = {
  loaders: readFileSync(new URL("../src/lib/loaders.ts", import.meta.url), "utf8"),
  field: readFileSync(new URL("../src/components/DotLoader.tsx", import.meta.url), "utf8"),
  license: readFileSync(new URL("../LICENSE", import.meta.url), "utf8"),
};
const preset: LoaderPreset = {
  state: "listening", size: 32, color: "#c5a3ff", speed: 0.45, intensity: 0.8,
  spacing: 0.9, dotSize: 1.25, depth: 0.35, yaw: 57, pitch: -13, level: 0.7, paused: true,
};

test("downloaded loader and usage typecheck independently with only React imports", () => {
  const multilineField = sources.field.replace(
    /import\s*\{([^}]+)\}\s*from\s*["']\.\.\/lib\/loaders["'];?/g,
    (_match, names: string) => `import {\n${names.split(",").map((name) => `  ${name.trim()},`).join("\n")}\n} from "../lib/loaders";`,
  );
  const source = buildLoaderSource({ ...sources, field: multilineField }, preset);
  assert.ok(source.startsWith("'use client';"));
  assert.ok(source.includes(sources.license.trim()));
  const filename = fileURLToPath(new URL("../DotLoader.export-check.tsx", import.meta.url));
  const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const imports = parsed.statements.filter(ts.isImportDeclaration).map((statement) => (statement.moduleSpecifier as ts.StringLiteral).text);
  assert.ok(imports.length > 0);
  assert.ok(imports.every((name) => name === "react"), `Unexpected dependencies: ${imports.join(", ")}`);
  const usageFilename = fileURLToPath(new URL("../LoaderUsage.export-check.tsx", import.meta.url));
  const usage = ts.createSourceFile(usageFilename, loaderUsage.replace("'./DotLoader'", "'./DotLoader.export-check'"), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX, strict: true, noUnusedLocals: true, noUnusedParameters: true,
    skipLibCheck: true, noEmit: true, types: ["react"],
  };
  const host = ts.createCompilerHost(options);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  const originalFileExists = host.fileExists.bind(host);
  host.fileExists = (name) => name === filename || name === usageFilename || originalFileExists(name);
  host.getSourceFile = (name, ...args) => name === filename ? parsed : name === usageFilename ? usage : originalGetSourceFile(name, ...args);
  const program = ts.createProgram([filename, usageFilename], options, host);
  assert.deepEqual(ts.getPreEmitDiagnostics(program).map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")), []);
});

test("loader exports preserve all settings and allow live state and appearance overrides", () => {
  const compiled = ts.transpileModule(buildLoaderSource(sources, preset), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exported: { default?: (props?: object) => { type: unknown; props: Record<string, unknown> }; DotLoader?: unknown } = {};
  runInNewContext(compiled, {
    exports: exported,
    require: (name: string) => {
      if (name === "react") return {};
      if (name === "react/jsx-runtime") return { jsx: (type: unknown, props: object) => ({ type, props }) };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  assert.equal(typeof exported.DotLoader, "function");
  assert.equal(typeof exported.default, "function");
  assert.equal(exported.default!().type, exported.DotLoader);
  assert.deepEqual(JSON.parse(JSON.stringify(exported.default!().props)), preset);
  const override = { state: "streaming", size: 20, color: "#355d19", paused: false, level: 0.2, style: { verticalAlign: "middle" }, label: "Writing response" };
  const changed = exported.default!(override).props;
  assert.deepEqual(JSON.parse(JSON.stringify(changed)), { ...preset, ...override });
});
