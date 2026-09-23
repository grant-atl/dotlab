import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { samplePoint } from "../src/lib/patterns.ts";

test("the field ignores pointer movement and morphs continuously without bypassing motion preferences", () => {
  let dots: number[][] = [];
  let frame: ((time: number) => void) | undefined;
  let mount: () => () => void;
  let cleanup: (() => void) | undefined;
  let refIndex = 0;
  let now = 1000;
  const refs: { current: unknown }[] = [];
  const media = Object.assign(new EventTarget(), { matches: false });
  const context = {
    clearRect: () => { dots = []; },
    arc: (x: number, y: number, radius: number) => dots.push([x, y, radius]),
    beginPath() {}, fill() {}, setTransform() {},
  };
  const canvas = Object.assign(new EventTarget(), {
    getContext: () => context,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 400 }),
  });
  const modules = {
    react: {
      useRef: (current: unknown) => refs[refIndex++] ?? (refs[refIndex - 1] = { current }),
      useEffect: (effect: typeof mount) => { mount = effect; },
    },
    "react/jsx-runtime": {
      jsx: (_tag: string, props: { ref: { current: unknown } }) => {
        props.ref.current = canvas;
      },
    },
    "../lib/patterns": { samplePoint },
  };
  const exports: { DotField?: (props: object) => void } = {};
  const source = readFileSync(new URL("../src/components/DotField.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(compiled, {
    exports,
    require: (name: keyof typeof modules) => modules[name],
    window: {
      devicePixelRatio: 1,
      matchMedia: () => media,
      requestAnimationFrame: (callback: typeof frame) => { frame = callback; return 1; },
      cancelAnimationFrame: () => { frame = undefined; },
    },
    document: Object.assign(new EventTarget(), { hidden: false }),
    ResizeObserver: function (callback: (entries: object[]) => void) {
      return { observe: () => callback([{ contentRect: { width: 600, height: 400 } }]), disconnect() {} };
    },
    IntersectionObserver: function (callback: (entries: object[]) => void) {
      return { observe: () => callback([{ isIntersecting: true }]), disconnect() {} };
    },
  });
  function render(props: object = {}) {
    cleanup?.();
    refIndex = 0;
    exports.DotField!({ density: 0.4, morph: true, ...props });
    cleanup = mount!();
  }
  function advance(frames: number) {
    for (let i = 0; i < frames; i++) {
      now += 50;
      assert.ok(frame, "an active field must schedule frames");
      frame(now);
    }
  }
  render();
  try {
    frame!(1000);
    const initial = dots;
    assert.ok(initial.length > 0);
    canvas.dispatchEvent(Object.assign(new Event("pointermove"), { clientX: 580, clientY: 20 }));
    frame!(1000);
    assert.deepEqual(dots, initial, "moving the pointer must not rotate the field");
    canvas.dispatchEvent(new Event("pointerleave"));
    frame!(1000);
    assert.deepEqual(dots, initial, "leaving the canvas must not snap the field");
    frame!(1050);
    assert.notDeepEqual(dots, initial, "the field must still animate as time advances");
    now = 1050;

    const sphere = dots;
    render({ pattern: "torus" });
    assert.deepEqual(dots, sphere, "a morph must start at the exact last rendered positions");
    advance(12);
    const intermediate = dots;
    assert.notDeepEqual(intermediate, sphere, "dots must travel toward the target");
    render({ pattern: "wave" });
    assert.deepEqual(dots, intermediate, "rapid selection must continue from the current shape");
    advance(32);
    const wave = dots;
    render({ pattern: "wave", morph: false, paused: true });
    assert.deepEqual(dots, wave, "the settled morph must match the actual target shape");

    render({ pattern: "torus" });
    advance(10);
    const midway = dots;
    render({ pattern: "torus", paused: true });
    assert.deepEqual(dots, midway, "pausing midway must freeze the shape");
    assert.equal(frame, undefined);
    render({ pattern: "sphere", paused: true });
    const pausedSelection = dots;
    assert.notDeepEqual(dots, midway, "explicit selection while paused must show its target");
    render({ pattern: "sphere", morph: false, paused: true });
    assert.deepEqual(dots, pausedSelection);

    render({ pattern: "wave", speed: 0 });
    const stillSelection = dots;
    assert.equal(frame, undefined);
    render({ pattern: "wave", speed: 0, morph: false });
    assert.deepEqual(dots, stillSelection, "zero speed must show the selected target immediately");
    render({ pattern: "torus" });
    advance(8);
    media.matches = true;
    media.dispatchEvent(new Event("change"));
    assert.equal(frame, undefined, "reduced motion must stop the frame loop");
    render({ pattern: "sphere" });
    const reducedSelection = dots;
    render({ pattern: "sphere", morph: false });
    assert.deepEqual(dots, reducedSelection, "reduced motion must skip spatial transitions");
  } finally {
    cleanup?.();
  }
});
