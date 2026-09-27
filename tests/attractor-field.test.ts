import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as dynamics from "../src/lib/dynamics.ts";
import * as particleNoise from "../src/lib/particle-noise.ts";

test("particles visibly move while pause, single-step, and visibility controls preserve the simulation", () => {
  let frame: ((time: number) => void) | undefined;
  let frameId = 0;
  let requests = 0;
  let cancellations = 0;
  let effectIndex = 0;
  let pendingEffects: number[] = [];
  const effects: { effect: () => void | (() => void); deps?: unknown[]; cleanup?: () => void }[] = [];
  let intersection: (entries: { isIntersecting: boolean }[]) => void;
  let sample: dynamics.LiveSample;
  let sampleCount = 0;
  let refIndex = 0;
  let now = 2000;
  let dots: number[][] = [];
  let arcs: number[][] = [];
  let alphas: number[] = [];
  const refs: { current: unknown }[] = [];
  const media = Object.assign(new EventTarget(), { matches: false });
  const document = Object.assign(new EventTarget(), { hidden: false });
  const context = {
    clearRect() { dots = []; arcs = []; alphas = []; },
    arc(x: number, y: number, radius: number) {
      arcs.push([x, y, radius]);
      if (radius < 2.2) { dots.push([x, y]); alphas.push(context.globalAlpha); }
    },
    beginPath() {}, fill() {}, fillRect() {}, fillText() {}, setTransform() {},
    moveTo() {}, lineTo() {}, stroke() {}, lineCap: "round", globalAlpha: 1,
  };
  const canvas = { getContext: () => context };
  const modules = {
    react: {
      useRef: (current: unknown) => refs[refIndex++] ?? (refs[refIndex - 1] = { current }),
      useEffect: (effect: () => void | (() => void), deps?: unknown[]) => {
        const index = effectIndex++;
        const previous = effects[index];
        if (!previous || !deps || deps.some((value, i) => !Object.is(value, previous.deps?.[i]))) {
          effects[index] = { effect, deps, cleanup: previous?.cleanup };
          pendingEffects.push(index);
        }
      },
    },
    "react/jsx-runtime": { jsx: (_tag: string, props: { ref: { current: unknown } }) => { props.ref.current = canvas; } },
    "../lib/dynamics": dynamics,
    "../lib/particle-noise": particleNoise,
  };
  const exports: { AttractorField?: (props: object) => void } = {};
  const source = readFileSync(new URL("../src/components/AttractorField.tsx", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, require: (name: keyof typeof modules) => modules[name], document,
    window: {
      devicePixelRatio: 1, matchMedia: () => media,
      requestAnimationFrame: (callback: typeof frame) => { frame = callback; requests++; return ++frameId; },
      cancelAnimationFrame: (id: number) => { if (id === frameId && frame) { frame = undefined; cancellations++; } },
    },
    ResizeObserver: function (callback: (entries: object[]) => void) {
      return { observe: () => callback([{ contentRect: { width: 600, height: 280 } }]), disconnect() {} };
    },
    IntersectionObserver: function (callback: typeof intersection) {
      intersection = callback;
      return { observe: () => callback([{ isIntersecting: true }]), disconnect() {} };
    },
  });
  function render(props: object = {}) {
    refIndex = 0;
    effectIndex = 0;
    pendingEffects = [];
    exports.AttractorField!({ onSample: (value: dynamics.LiveSample) => { sample = value; sampleCount++; }, ...props });
    for (const index of pendingEffects) effects[index].cleanup?.();
    for (const index of pendingEffects) {
      const cleanup = effects[index].effect();
      effects[index].cleanup = typeof cleanup === "function" ? cleanup : undefined;
    }
  }
  function advance(milliseconds: number) {
    now += milliseconds;
    assert.ok(frame, "playing must schedule animation frames");
    frame(now);
  }
  render();
  try {
    const initial = sample!;
    frame!(1000);
    frame!(1050);
    frame!(1100);
    frame!(1150);
    const playing = sample!;
    assert.ok(playing.iteration > initial.iteration, "the trajectory must actually advance");
    assert.notDeepEqual(playing.state, initial.state);
    const playingDots = dots;
    render({ paused: true, color: "#ffffff", speed: 2 });
    assert.deepEqual(dots, playingDots, "pausing or changing appearance must not snap positions");
    render({ paused: true, color: "#ffffff", speed: 2, density: 0.5 });
    assert.deepEqual(sample!, playing, "presentation controls must preserve state and iteration");
    assert.equal(frame, undefined);
    render({ paused: true, step: 1 });
    assert.equal(sample!.iteration, playing.iteration + 1);
    assert.deepEqual(sample!.state, dynamics.stepState("lorenz", playing.state, dynamics.normalizeParameters("lorenz")));
    render({ paused: true, step: 1 });
    assert.equal(sample!.iteration, playing.iteration + 1, "rerender must not replay a step");
    media.matches = true;
    render({ step: 2 });
    assert.equal(sample!.iteration, playing.iteration + 2, "reduced motion permits explicit single steps");
    assert.equal(frame, undefined);
    media.matches = false;
    media.dispatchEvent(new Event("change"));
    assert.ok(frame);
    intersection!([{ isIntersecting: false }]);
    assert.equal(frame, undefined, "offscreen animation must stop");
    intersection!([{ isIntersecting: true }]);
    assert.ok(frame);
    document.hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
    assert.equal(frame, undefined, "hidden-tab animation must stop");
    document.hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    assert.ok(frame);
    const stoppedSample = sample!;
    render({ speed: 0, step: 2 });
    assert.equal(frame, undefined, "zero speed must stop the frame loop");
    assert.deepEqual(sample!, stoppedSample);
    render({ resetKey: 1 });
    assert.deepEqual(sample!, initial, "reset must reproduce the original trajectory");

    for (const { id: system, kind } of dynamics.SYSTEMS) {
      render({ system, density: 0.6, drift: 0 });
      for (let i = 0; i < (kind === "map" ? 61 : 17); i++) advance(50);
      const before = dots;
      advance(20);
      assert.equal(dots.length, before.length, `${system}: particle count must remain stable`);
      const visible = before.map((point, index) => ({ point, next: dots[index] })).filter(({ point, next }) =>
        [point, next].every(([x, y]) => x >= 0 && x <= 600 && y >= 0 && y <= 280),
      );
      assert.ok(visible.length > 100, `${system}: enough particles must be visible to check motion`);
      const moving = visible.filter(({ point, next }) => Math.hypot(next[0] - point[0], next[1] - point[1]) > 0.001);
      assert.ok(moving.length / visible.length > 0.9, `${system}: more than 90% of visible dots must move`);
      const positions = new Set(dots.map(([x, y]) => `${x.toFixed(5)},${y.toFixed(5)}`));
      const vacated = visible.filter(({ point: [x, y] }) => !positions.has(`${x.toFixed(5)},${y.toFixed(5)}`));
      assert.ok(vacated.length / visible.length > 0.9, `${system}: changing draw order must not pass as particle motion`);
    }

    const appearance = { system: "henon", drift: 0, fade: 0, density: 0.6 };
    render(appearance);
    for (let i = 0; i < 61; i++) advance(50);
    const unfaded = alphas;
    advance(20);
    assert.deepEqual(alphas, unfaded, "fade zero must disable time fading when depth is unchanged");
    const activeFrame = frame;
    const activeRequests = requests;
    const activeCancellations = cancellations;
    const beforeAppearance = dots;
    render({ ...appearance, speed: 1.5, fade: 0.5 });
    assert.equal(frame, activeFrame, "nonzero speed and fade changes must preserve the active callback");
    assert.equal(requests, activeRequests);
    assert.equal(cancellations, activeCancellations);
    assert.deepEqual(dots, beforeAppearance, "presentation updates must not reset animation position");
    advance(16);
    assert.notDeepEqual(dots, beforeAppearance, "the next frame must advance without a clock restart");
    render({ ...appearance, fade: 1 });
    advance(16);
    const beforeFade = alphas;
    advance(50);
    const changes = alphas.map((alpha, index) => alpha - beforeFade[index]);
    assert.ok(changes.filter((change) => Math.abs(change) > 1e-6).length / changes.length > 0.9, "individual dots must fade over time");
    assert.ok(changes.some((change) => change > 0) && changes.some((change) => change < 0), "dots must brighten and dim independently");

    const pausedDots = dots;
    const pausedAlphas = alphas;
    render({ ...appearance, paused: true, fade: 1 });
    assert.deepEqual(dots, pausedDots);
    assert.deepEqual(alphas, pausedAlphas);
    now += 10_000;
    render({ ...appearance, paused: true, color: "#ffffff", speed: 2, fade: 0.2 });
    assert.deepEqual(dots, pausedDots, "appearance changes must preserve paused geometry");
    render({ ...appearance, paused: true, fade: 1 });
    assert.deepEqual(alphas, pausedAlphas, "paused appearance changes must preserve the fading clock");
    render({ ...appearance, fade: 1 });
    advance(16);
    assert.deepEqual(dots, pausedDots, "resuming must not catch up hidden wall-clock time");
    assert.deepEqual(alphas, pausedAlphas);

    render({ ...appearance, paused: true, step: 1 });
    const stationary = dots;
    const tracked = sample!;
    const scale = Math.min(600 * 0.42, 280 * 0.43);
    assert.ok(Math.abs(dots[0][0] - (300 + tracked.state[0] / 1.4 * scale)) < 1e-9);
    assert.ok(Math.abs(dots[0][1] - (140 - tracked.state[1] / 1.4 * scale)) < 1e-9, "drift zero must preserve the fixed Hénon projection");
    render({ ...appearance, paused: true, step: 1, drift: 1 });
    assert.notDeepEqual(dots, stationary, "drift must affect the view");
    assert.deepEqual(sample!, tracked, "camera drift must not perturb numerical state");
    render({ ...appearance, paused: true, step: 1 });
    assert.deepEqual(dots, stationary, "turning drift off must restore the fixed view");

    render({ resetKey: 10 });
    const defaultStart = sample!.iteration;
    advance(1);
    for (let i = 0; i < 20; i++) advance(50);
    render({ resetKey: 10, paused: true });
    const defaultSteps = sample!.iteration - defaultStart;
    const defaultDrift = dots;
    render({ resetKey: 10, paused: true, drift: 0.6 });
    assert.deepEqual(dots, defaultDrift, "default drift must match the stronger 0.6 setting");
    render({ resetKey: 11, speed: 1 });
    const normalStart = sample!.iteration;
    advance(1);
    for (let i = 0; i < 20; i++) advance(50);
    render({ resetKey: 11, speed: 1, paused: true });
    assert.ok(defaultSteps > 0);
    assert.equal(sample!.iteration - normalStart, defaultSteps * 2, "default playback must advance at half the explicit 1× speed");

    render({ system: "henon", resetKey: 12, speed: 1, drift: 0 });
    const henonStart = sample!.iteration;
    advance(1);
    for (let i = 0; i < 40; i++) advance(50);
    render({ system: "henon", resetKey: 12, speed: 1, drift: 0, paused: true });
    assert.equal(sample!.iteration - henonStart, 2, "Hénon at 1× must advance one iteration per second");

    const markerSettings = { system: "henon", resetKey: 12, speed: 1, drift: 0 };
    render(markerSettings);
    const defaultArcs = arcs;
    render({ ...markerSettings, showMarker: true });
    assert.equal(arcs.length, defaultArcs.length + 2, "the marker must be hidden by default and appear only when enabled");
    assert.deepEqual(arcs.slice(0, -2), defaultArcs);
    const markedArcs = arcs;
    const markedDots = dots;
    const markedSample = sample!;
    const markerFrame = frame;
    const markerCancellations = cancellations;
    const markerRequests = requests;
    render({ ...markerSettings, showMarker: false });
    assert.deepEqual(arcs, markedArcs.slice(0, -2), "hiding the marker must remove only its head and halo");
    assert.deepEqual(dots, markedDots, "ordinary particles must not change when the marker is hidden");
    assert.deepEqual(sample!, markedSample);
    assert.equal(frame, markerFrame);
    assert.equal(cancellations, markerCancellations);
    assert.equal(requests, markerRequests, "marker visibility must not restart playback");
    const hiddenSamples = sampleCount;
    for (let i = 0; i < 4; i++) advance(50);
    assert.ok(sampleCount > hiddenSamples, "live values must continue while the marker is hidden");
    const hiddenArcs = arcs;
    render({ ...markerSettings, showMarker: true });
    assert.equal(arcs.length, hiddenArcs.length + 2);
    assert.deepEqual(arcs.slice(0, -2), hiddenArcs);

    const noiseSettings = { system: "henon", drift: 0, fade: 0, speed: 1, density: 0.6, noiseDirection: "horizontal", noiseSeed: 42 };
    function noiseScene(randomness: number, resetKey: number) {
      const props = { ...noiseSettings, randomness, resetKey };
      render(props);
      advance(1);
      for (let i = 0; i < 20; i++) advance(50);
      render({ ...props, paused: true });
      return { dots, sample: sample! };
    }
    const baseScene = noiseScene(0, 20);
    const noisyScene = noiseScene(0.8, 21);
    assert.deepEqual(noisyScene.sample, baseScene.sample, "particle noise must leave the base numerical state unchanged");
    assert.equal(noisyScene.dots.length, baseScene.dots.length);
    const wandered = noisyScene.dots.filter(([x], index) => Math.abs(x - baseScene.dots[index][0]) > 0.001);
    assert.ok(wandered.length / noisyScene.dots.length > 0.9, "independent noise must move almost every particle without camera drift");
    assert.deepEqual(noisyScene.dots.map((point) => point[1]), baseScene.dots.map((point) => point[1]), "horizontal noise must not move particles vertically");
    const resetScene = noiseScene(0.8, 22);
    assert.deepEqual(resetScene, noisyScene, "resetting the same seed must reproduce particle wandering");
    render({ ...noiseSettings, randomness: 0, resetKey: 22, paused: true });
    assert.deepEqual(dots, baseScene.dots, "zero randomness must restore the exact unperturbed geometry");
    render({ ...noiseSettings, randomness: 0.8, resetKey: 22, paused: true });
    assert.deepEqual(dots, noisyScene.dots, "amount changes must preserve the existing noise state");
    render({ ...noiseSettings, randomness: 0.8, resetKey: 22, paused: true, noiseSeed: 7 });
    assert.deepEqual(sample!, resetScene.sample, "changing the noise seed must preserve the base orbit");
    assert.deepEqual(dots, baseScene.dots, "a newly seeded noise layer starts with zero offsets");
  } finally { for (const effect of effects) effect.cleanup?.(); }
  assert.equal(frame, undefined, "unmount must cancel the animation");
});
