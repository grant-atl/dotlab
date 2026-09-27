import { useCallback, useRef, useState } from "react";
import { AttractorField } from "./AttractorField";
import { COLORS, Icon, Toast, useDialog, type CopyHandler } from "./ui";
import { SYSTEMS, type LiveSample, type SystemId } from "../lib/dynamics";
import { attractorUsage, buildAttractorSource } from "../lib/dynamics-export";
import { acceptDynamicsParameters } from "../lib/dynamics-controls";
import dynamicsSource from "../lib/dynamics.ts?raw";
import noiseSource from "../lib/particle-noise.ts?raw";
import fieldSource from "./AttractorField.tsx?raw";
import license from "../../LICENSE?raw";
import "./dynamics-playground.css";

function defaultParameters(system: SystemId) {
  return Object.fromEntries(
    SYSTEMS.find((item) => item.id === system)!.parameters.map((parameter) => [
      parameter.key,
      parameter.value,
    ]),
  );
}

function formatValue(value: number | undefined) {
  if (value === undefined) return "—";
  if (!Number.isFinite(value)) return "escaped";
  if (Math.abs(value) >= 10000) return value.toExponential(3);
  return value.toFixed(4);
}

function formatCoefficient(value: number) {
  return String(Number(value.toPrecision(4)));
}

export function DynamicsPlayground({
  initialSystem,
  reducedMotion,
  message,
  onClose,
  onCopy,
}: {
  initialSystem: SystemId;
  reducedMotion: boolean;
  message: string;
  onClose: () => void;
  onCopy: CopyHandler;
}) {
  const [system, setSystem] = useState(initialSystem);
  const [parameters, setParameters] = useState(() => defaultParameters(initialSystem));
  const [color, setColor] = useState(COLORS[0]);
  const [speed, setSpeed] = useState(0.5);
  const [fade, setFade] = useState(0.7);
  const [drift, setDrift] = useState(0.6);
  const [randomness, setRandomness] = useState(0);
  const [noiseDirection, setNoiseDirection] = useState<"all" | "horizontal">("all");
  const [noiseSeed, setNoiseSeed] = useState(42);
  const [showMarker, setShowMarker] = useState(false);
  const [density, setDensity] = useState(1);
  const [trails, setTrails] = useState(0.55);
  const [paused, setPaused] = useState(false);
  const [step, setStep] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [sample, setSample] = useState<LiveSample | null>(null);
  const [parameterNotice, setParameterNotice] = useState("");
  const failedParameters = useRef<string | null>(null);
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const dialog = useDialog(onClose, reducedMotion);
  const metadata = SYSTEMS.find((item) => item.id === system)!;
  const stopped = paused || reducedMotion;
  const coordinates = metadata.kind === "flow" ? ["x", "y", "z"] : ["x", "y"];

  const source = () => buildAttractorSource(
    { dynamics: dynamicsSource, noise: noiseSource, field: fieldSource, license },
    { system, parameters, color, speed, fade, drift, randomness, noiseDirection, noiseSeed, showMarker, density, trails },
  );
  const download = () => {
    const url = URL.createObjectURL(new Blob([source()], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "Attractor.tsx";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const reset = () => {
    failedParameters.current = null;
    setParameterNotice("");
    setSample(null);
    setResetKey((value) => value + 1);
  };
  const changeParameter = (key: string, value: number) => {
    const candidate = { ...parameters, [key]: value };
    const accepted = acceptDynamicsParameters(system, parameters, candidate);
    if (accepted === parameters) {
      setParameterNotice("That setting diverges. Kept the previous values.");
      return;
    }
    failedParameters.current = null;
    setParameterNotice("");
    setSample(null);
    setParameters(accepted);
  };
  const updateSample = useCallback((next: LiveSample) => {
    if (!next.escaped) {
      setSample(next);
      return;
    }
    const signature = JSON.stringify([system, parameters]);
    if (failedParameters.current === signature) return;
    failedParameters.current = signature;
    const defaults = defaultParameters(system);
    if (Object.keys(defaults).every((key) => parameters[key] === defaults[key])) {
      setPaused(true);
      setSample(next);
      setParameterNotice("This orbit diverged. Try another setting or reset.");
      return;
    }
    setSample(null);
    setParameters(defaults);
    setResetKey((value) => value + 1);
    setParameterNotice("That orbit diverged. Restored the default coefficients.");
  }, [system, parameters]);

  return (
    <dialog {...dialog.props} className="playground-dialog dynamics-dialog" aria-labelledby="dynamics-playground-title">
      <div className="dialog-inner">
        <div className="dialog-header">
          <div>
            <span className="section-kicker">DYNAMICAL SYSTEMS</span>
            <h2 id="dynamics-playground-title">Playground</h2>
          </div>
          <button className="icon-button" onClick={dialog.close} aria-label="Close dynamics playground">
            <Icon name="close" size={21} />
          </button>
        </div>

        <div className="playground-layout">
          <div className="playground-main">
            <div className="preview-toolbar">
              <div className="segmented" aria-label="Playground view">
                <button className={tab === "preview" ? "active" : ""} aria-pressed={tab === "preview"} onClick={() => setTab("preview")}>
                  Preview
                </button>
                <button className={tab === "code" ? "active" : ""} aria-pressed={tab === "code"} onClick={() => setTab("code")}>
                  Code
                </button>
              </div>
            </div>

            <div hidden={tab !== "preview"}>
              <div className="playground-stage dynamics-stage">
                <AttractorField
                  system={system}
                  parameters={parameters}
                  color={color}
                  speed={speed}
                  fade={fade}
                  drift={drift}
                  randomness={randomness}
                  noiseDirection={noiseDirection}
                  noiseSeed={noiseSeed}
                  showMarker={showMarker}
                  density={density}
                  trails={trails}
                  paused={stopped || tab !== "preview"}
                  step={step}
                  resetKey={resetKey}
                  onSample={updateSample}
                />
                <span className="preview-pattern">{metadata.name}</span>
              </div>
              <div className="dynamics-playback">
                <div>
                  <button className="button button-secondary" disabled={reducedMotion || sample?.escaped} onClick={() => setPaused(!paused)}>
                    <Icon name={stopped ? "play" : "pause"} size={14} />
                    {stopped ? "Play" : "Pause"}
                  </button>
                  <button className="button button-secondary" disabled={!stopped || sample?.escaped} onClick={() => setStep((value) => value + 1)} title={stopped ? "Advance one calculation" : "Pause to advance one calculation"}>
                    <Icon name="arrow" size={14} /> Step
                  </button>
                  <button className="text-button" onClick={reset}>
                    <Icon name="reset" size={14} /> Reset
                  </button>
                </div>
                <label className="dynamics-marker-toggle">
                  <input type="checkbox" checked={showMarker} onChange={(event) => setShowMarker(event.target.checked)} />
                  Show tracking dot
                </label>
                <span className="dynamics-iteration">n = {sample?.iteration.toLocaleString() ?? "—"}</span>
              </div>
              {reducedMotion && <p className="dynamics-motion-note">Animation is paused for reduced motion. Step advances one calculation.</p>}

              <div className="dynamics-math">
              <section className="dynamics-equations" aria-labelledby="dynamics-equations-title">
                <div className="dynamics-section-heading">
                  <h3 id="dynamics-equations-title">Equations</h3>
                  <a href={metadata.source} target="_blank" rel="noreferrer">Source <Icon name="external" size={11} /></a>
                </div>
                <div className="dynamics-formulas">
                  {metadata.equations.map((equation) => <code key={equation}>{equation}</code>)}
                </div>
                <p className="dynamics-coefficient-values">
                  {metadata.parameters.map((parameter) => {
                    const value = parameters[parameter.key];
                    const formatted = formatCoefficient(value);
                    return `${parameter.label} ${Number(formatted) === value ? "=" : "≈"} ${formatted}`;
                  }).join("  ·  ")}
                </p>
              </section>

              <section className="dynamics-values" aria-labelledby="dynamics-values-title">
                <div className="dynamics-section-heading">
                  <h3 id="dynamics-values-title">Live values</h3>
                  <span>{metadata.kind === "flow" ? "State → rates" : "State → next iterate"}</span>
                </div>
                <table>
                  <thead><tr><th scope="col">Variable</th><th scope="col">Current</th><th scope="col">{metadata.kind === "flow" ? "Rate of change" : "Next"}</th></tr></thead>
                  <tbody>
                    {coordinates.map((coordinate, index) => (
                      <tr key={coordinate}>
                        <th scope="row">{coordinate}</th>
                        <td>{formatValue(sample?.state[index])}</td>
                        <td>{formatValue(sample?.next[index])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              </div>
              <p className="dynamics-calculation-note">{randomness > 0
                ? "Each dot has independent visual wandering. Live values and Step use the underlying system."
                : metadata.kind === "flow"
                  ? "Each dot follows a numerical trajectory. Live values track one particle; Step advances one integration step."
                  : "Dots ease between calculated iterates; live values show exact states. Step applies the map once."}</p>
            </div>

            {tab === "code" && (
              <div className="usage-code dynamics-usage">
                <div>
                  <span>Hero.tsx</span>
                  <button className="text-button" onClick={() => onCopy(attractorUsage, "Usage example copied")}>
                    <Icon name="copy" size={14} /> Copy usage
                  </button>
                </div>
                <pre><code>{attractorUsage}</code></pre>
                <p>Save the component as <strong>Attractor.tsx</strong> next to this file. Copy component and Download .tsx include your selected system, coefficients, appearance, motion settings, and random seed.</p>
                <p>Requires React 18 or newer. The exported component uses Canvas 2D and has no other runtime dependencies.</p>
              </div>
            )}
          </div>

          <aside className="playground-settings dynamics-settings" aria-label="System settings">
            <label className="control-label" htmlFor="dynamics-system">System</label>
            <select id="dynamics-system" value={system} onChange={(event) => {
              const next = event.target.value as SystemId;
              setSystem(next);
              setParameters(defaultParameters(next));
              failedParameters.current = null;
              setParameterNotice("");
              setSample(null);
              setStep(0);
            }}>
              {SYSTEMS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <p className="dynamics-system-description">{metadata.description}</p>

            <fieldset className="dynamics-coefficients">
              <legend>Coefficients</legend>
              {metadata.parameters.map((parameter) => (
                <div className="control-section" key={parameter.key}>
                  <label className="range-label" htmlFor={`coefficient-${parameter.key}`}>
                    {parameter.label}<output>{formatCoefficient(parameters[parameter.key])}</output>
                  </label>
                  <input id={`coefficient-${parameter.key}`} type="range" min={parameter.min} max={parameter.max} step={parameter.step} value={parameters[parameter.key]} onChange={(event) => changeParameter(parameter.key, Number(event.target.value))} />
                </div>
              ))}
              <button className="text-button reset-button" onClick={() => {
                setParameters(defaultParameters(system));
                reset();
              }}><Icon name="reset" size={13} /> Reset coefficients</button>
              <p className="dynamics-control-note dynamics-parameter-note">Changing coefficients restarts the orbit. Settings that diverge during the preview check keep the previous values.</p>
              <p className="dynamics-control-note dynamics-parameter-note" role="status">{parameterNotice}</p>
            </fieldset>

            <div className="dynamics-motion-controls">
              <div className="control-section">
                <label className="range-label" htmlFor="dynamics-speed">Speed <output>{speed.toFixed(1)}×</output></label>
                <input id="dynamics-speed" type="range" min="0.2" max="2" step="0.1" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
                <p className="dynamics-control-note">Changes playback speed, not the equations.</p>
              </div>
              <div className="control-section">
                <label className="range-label" htmlFor="dynamics-fade">Fade amount <output>{Math.round(fade * 100)}%</output></label>
                <input id="dynamics-fade" type="range" min="0" max="1" step="0.05" value={fade} onChange={(event) => setFade(Number(event.target.value))} />
              </div>
              <div className="control-section">
                <label className="range-label" htmlFor="dynamics-drift">View drift <output>{Math.round(drift * 100)}%</output></label>
                <input id="dynamics-drift" type="range" min="0" max="1" step="0.05" value={drift} onChange={(event) => setDrift(Number(event.target.value))} />
                <p className="dynamics-control-note">View drift changes the camera, not the equations.</p>
              </div>
              <div className="control-section">
                <label className="range-label" htmlFor="dynamics-randomness">Random motion <output>{randomness === 0 ? "Off" : `${Math.round(randomness * 100)}%`}</output></label>
                <input id="dynamics-randomness" type="range" min="0" max="1" step="0.05" value={randomness} aria-valuetext={randomness === 0 ? "Off" : `${Math.round(randomness * 100)}%`} onChange={(event) => setRandomness(Number(event.target.value))} />
                <p className="dynamics-control-note">Adds independent wandering to each dot. Live values show the underlying system.</p>
                {randomness > 0 && (
                  <div className="dynamics-noise-options">
                    <label className="control-label" htmlFor="dynamics-noise-direction">Random direction</label>
                    <select id="dynamics-noise-direction" value={noiseDirection} onChange={(event) => setNoiseDirection(event.target.value as "all" | "horizontal")}>
                      <option value="all">All directions</option>
                      <option value="horizontal">Side to side</option>
                    </select>
                    <button className="text-button reset-button" onClick={() => setNoiseSeed((value) => value + 1)} aria-label="Reseed random motion"><Icon name="reset" size={13} /> Reseed</button>
                  </div>
                )}
              </div>
            </div>

            <details className="dynamics-appearance">
              <summary>Appearance <span aria-hidden="true">+</span></summary>
              <div className="control-section">
                <span className="control-label">Dot color</span>
                <div className="color-swatches">
                  {COLORS.map((item) => <button key={item} style={{ background: item }} className={color === item ? "chosen" : ""} aria-label={`Set color ${item}`} aria-pressed={color === item} onClick={() => setColor(item)} />)}
                </div>
                <label className="custom-color">
                  <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Custom dot color" />
                  <span>{color.toUpperCase()}</span><span>CUSTOM</span>
                </label>
              </div>
              <div className="control-section">
                <label className="range-label" htmlFor="dynamics-density">Density <output>{density.toFixed(1)}×</output></label>
                <input id="dynamics-density" type="range" min="0.4" max="1.8" step="0.1" value={density} onChange={(event) => setDensity(Number(event.target.value))} />
              </div>
              <div className="control-section">
                <label className="range-label" htmlFor="dynamics-trails">Trail length <output>{Math.round(trails * 100)}%</output></label>
                <input id="dynamics-trails" type="range" min="0" max="1" step="0.05" value={trails} onChange={(event) => setTrails(Number(event.target.value))} />
              </div>
            </details>

            <div className="export-actions">
              <button className="button button-primary" onClick={() => onCopy(source(), "Complete React component copied")}><Icon name="copy" size={17} /> Copy component</button>
              <button className="button button-secondary" onClick={download}><Icon name="down" size={16} /> Download .tsx</button>
            </div>
          </aside>
        </div>
      </div>
      <Toast message={message} />
    </dialog>
  );
}
