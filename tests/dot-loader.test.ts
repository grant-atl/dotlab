import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as loaders from "../src/lib/loaders.ts";

test("cube loaders preserve 27 dots through interruptions, motion preferences, and compact sizes", () => {
  let frame: ((time: number) => void) | undefined;
  let frameId = 0, refIndex = 0, effectIndex = 0, now = 1000;
  let pending: number[] = [];
  const refs: { current: unknown }[] = [];
  const effects: { effect: () => void | (() => void); deps: unknown[]; cleanup?: () => void }[] = [];
  let dots: number[][] = [];
  let width = 64, height = 64, zoom = 1;
  let resize: (entries: object[]) => void;
  let intersect: (entries: { isIntersecting: boolean }[]) => void;
  let canvasProps: Record<string, unknown>;
  const media = Object.assign(new EventTarget(), { matches: false });
  const document = Object.assign(new EventTarget(), { hidden: false });
  const context = {
    globalAlpha: 1,
    clearRect() { dots = []; },
    arc(x: number, y: number, radius: number) { dots.push([x, y, radius, context.globalAlpha]); },
    beginPath() {}, fill() {}, setTransform() {},
  };
  const canvas = { width: 0, height: 0, getContext: () => context, getBoundingClientRect: () => ({ width: width * zoom, height: height * zoom }) };
  const modules = {
    react: {
      useRef: (current: unknown) => refs[refIndex++] ?? (refs[refIndex - 1] = { current }),
      useEffect: (effect: () => void | (() => void), deps: unknown[]) => {
        const index = effectIndex++;
        const previous = effects[index];
        if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
          effects[index] = { effect, deps, cleanup: previous?.cleanup };
          pending.push(index);
        }
      },
    },
    "react/jsx-runtime": {
      jsx: (_tag: string, props: { ref: { current: unknown }; style: { width: number; height: number } }) => {
        props.ref.current = canvas;
        canvasProps = props;
        width = props.style.width; height = props.style.height;
      },
    },
    "../lib/loaders": loaders,
  };
  const exported: { DotLoader?: (props: object) => void } = {};
  const source = readFileSync(new URL("../src/components/DotLoader.tsx", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports: exported, require: (name: keyof typeof modules) => modules[name], document,
    window: {
      devicePixelRatio: 2, matchMedia: () => media,
      requestAnimationFrame: (callback: typeof frame) => { frame = callback; return ++frameId; },
      cancelAnimationFrame: (id: number) => { if (id === frameId) frame = undefined; },
    },
    ResizeObserver: function (callback: typeof resize) {
      resize = callback;
      return { observe: () => callback([{ contentRect: { width, height } }]), disconnect() {} };
    },
    IntersectionObserver: function (callback: typeof intersect) {
      intersect = callback;
      return { observe: () => callback([{ isIntersecting: true }]), disconnect() {} };
    },
  });
  function render(props: object = {}) {
    const oldWidth = width, oldHeight = height;
    refIndex = 0; effectIndex = 0; pending = [];
    exported.DotLoader!(props);
    for (const index of pending) effects[index].cleanup?.();
    for (const index of pending) {
      const cleanup = effects[index].effect();
      effects[index].cleanup = typeof cleanup === "function" ? cleanup : undefined;
    }
    if (oldWidth !== width || oldHeight !== height) resize!([{ contentRect: { width, height } }]);
  }
  function advance(count: number) {
    for (let i = 0; i < count; i++) {
      now += 50;
      assert.ok(frame, "an active loader must schedule frames");
      const next = frame; frame = undefined; next(now);
    }
  }
  render();
  try {
    assert.equal(dots.length, 27);
    assert.equal(canvasProps!["aria-hidden"], true);
    advance(5);
    const original = dots;
    const activeFrame = frame;
    render({ speed: 0.9, color: "#ffffff" });
    assert.equal(frame, activeFrame, "presentation changes must not restart the frame loop");
    assert.deepEqual(dots, original);
    render({ state: "connecting" });
    assert.deepEqual(dots, original, "a new state must start at the exact current arrangement");
    advance(6);
    const midway = dots;
    assert.notDeepEqual(midway, original);
    render({ state: "generating" });
    assert.deepEqual(dots, midway, "interrupting a transition must preserve current positions and opacity");
    advance(4);
    const frozen = dots;
    render({ state: "generating", paused: true });
    assert.equal(frame, undefined);
    assert.deepEqual(dots, frozen, "pausing must freeze an unfinished morph");
    now += 5000;
    render({ state: "generating" });
    advance(1);
    assert.deepEqual(dots, frozen, "resume must not catch up elapsed wall time");
    advance(14);
    render({ state: "complete", speed: 1 });
    advance(32);
    assert.equal(dots.length, 27);
    assert.ok(dots.every(([x, y]) => x === 32 && y === 32), "all particles must gather at the center");
    const gathered = dots;
    render({ state: "complete", speed: 1, paused: true });
    assert.equal(frame, undefined);
    render({ state: "complete", speed: 1 });
    advance(1);
    assert.deepEqual(dots, gathered, "resuming completion must preserve the gathered pose");
    advance(40);
    assert.ok(dots.some(([x, y]) => Math.abs(x - 32) > 5 || Math.abs(y - 32) > 5), "completion must reform the cube");
    const returned = dots;
    advance(20);
    assert.notDeepEqual(dots, returned, "completion must continue as idle breathing without repeating the gather");
    const completed = dots;
    render({ state: "complete", speed: 1, color: "#ffffff" });
    assert.deepEqual(dots, completed);

    render({ state: "processing", speed: 4 });
    advance(14);
    render({ state: "complete", speed: 4 });
    advance(17);
    assert.ok(dots.every(([x, y]) => x === 32 && y === 32), "fast completion must not skip the gather during its entrance morph");

    render({ state: "searching", speed: 0 });
    assert.equal(frame, undefined);
    assert.notDeepEqual(dots, completed, "zero-speed state selection must still show a representative shape");
    media.matches = true;
    media.dispatchEvent(new Event("change"));
    render({ state: "complete" });
    assert.ok(dots.some(([x, y]) => Math.abs(x - 32) > 5 || Math.abs(y - 32) > 5), "reduced motion must show the final cube, not a collapsed intermediate pose");
    render({ state: "listening" });
    const listening = dots;
    render({ state: "streaming" });
    assert.notDeepEqual(dots, listening, "reduced motion must update the state immediately");
    assert.equal(frame, undefined);
    media.matches = false;
    media.dispatchEvent(new Event("change"));
    assert.ok(frame);
    intersect!([{ isIntersecting: false }]);
    assert.equal(frame, undefined);
    intersect!([{ isIntersecting: true }]);
    document.hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
    assert.equal(frame, undefined);
    document.hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    assert.ok(frame);

    for (const { id } of loaders.LOADER_STATES) {
      for (const size of [20, 32, 64, 224]) {
        for (const [yaw, pitch] of [[-180, -80], [45, 80], [180, 22]]) {
          render({ state: id, size, paused: true, intensity: 1, level: 1, spacing: 1.4, dotSize: 1.8, depth: 1, yaw, pitch });
          assert.equal(dots.length, 27, `${id}: every size must retain every particle`);
          for (const [x, y, radius, alpha] of dots) {
            assert.ok([x, y, radius, alpha].every(Number.isFinite));
            assert.ok(x - radius >= 0 && x + radius <= size && y - radius >= 0 && y + radius <= size, `${id} at ${size}px: clipped dot`);
            if (size <= 32) assert.ok(alpha >= 0.58, "compact dots must remain readable");
          }
        }
      }
    }
    zoom = 2;
    render({ size: 64, paused: true });
    assert.equal(canvas.width, 256, "magnified previews need a sharper backing store");
    render({ label: "Processing request", paused: true });
    assert.equal(canvasProps!["role"], "img");
    assert.equal(canvasProps!["aria-label"], "Processing request");
    render({ label: "", paused: true });
    assert.equal(canvasProps!["aria-hidden"], true);
  } finally { for (const effect of effects) effect.cleanup?.(); }
  assert.equal(frame, undefined);
});
