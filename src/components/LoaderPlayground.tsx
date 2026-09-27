import { useState } from "react";
import { DotLoader } from "./DotLoader";
import { COLORS, Icon, Toast, useDialog, type CopyHandler } from "./ui";
import { LOADER_STATES, type LoaderState } from "../lib/loaders";
import { buildLoaderSource, loaderUsage, type LoaderPreset } from "../lib/loader-export";
import loadersSource from "../lib/loaders.ts?raw";
import fieldSource from "./DotLoader.tsx?raw";
import license from "../../LICENSE?raw";
import "./loader-playground.css";

const DEFAULTS = {
  size: 64, color: COLORS[0], speed: 0.7, intensity: 0.65, spacing: 1,
  dotSize: 1, depth: 0.65, yaw: -32, pitch: 22, level: 0.5, paused: false,
};

function RangeControl({ name, label, value, min, max, step, display, onChange }: {
  name: string; label: string; value: number; min: number; max: number; step: number;
  display: string; onChange: (value: number) => void;
}) {
  return (
    <div className="control-section">
      <label className="range-label" htmlFor={`loader-${name}`}>{label}<output>{display}</output></label>
      <input id={`loader-${name}`} type="range" min={min} max={max} step={step} value={value} aria-valuetext={display} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

export function LoaderPlayground({ initialState, reducedMotion, message, onClose, onCopy }: {
  initialState: LoaderState;
  reducedMotion: boolean;
  message: string;
  onClose: () => void;
  onCopy: CopyHandler;
}) {
  const [settings, setSettings] = useState<LoaderPreset>({ ...DEFAULTS, state: initialState });
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [light, setLight] = useState(false);
  const [replay, setReplay] = useState(0);
  const dialog = useDialog(onClose, reducedMotion);
  const metadata = LOADER_STATES.find((item) => item.id === settings.state)!;
  const stopped = settings.paused || reducedMotion || settings.speed === 0;
  const preview = { ...settings, paused: stopped || tab !== "preview" };
  const update = <K extends keyof LoaderPreset>(key: K, value: LoaderPreset[K]) => setSettings((current) => ({ ...current, [key]: value }));
  const source = () => buildLoaderSource({ loaders: loadersSource, field: fieldSource, license }, settings);
  const download = () => {
    const url = URL.createObjectURL(new Blob([source()], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "DotLoader.tsx";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const changeBackground = () => {
    const nextLight = !light;
    setLight(nextLight);
    // Choose a readable starting color; further color choices remain the user's.
    update("color", nextLight ? "#355d19" : COLORS[0]);
  };
  const reset = () => {
    setSettings({ ...DEFAULTS, state: initialState });
    setLight(false);
    setReplay((current) => current + 1);
  };

  return (
    <dialog {...dialog.props} className="playground-dialog loader-dialog" aria-labelledby="loader-playground-title">
      <div className="dialog-inner">
        <div className="dialog-header">
          <div><h2 id="loader-playground-title">Playground</h2></div>
          <button className="icon-button" onClick={dialog.close} aria-label="Close loader playground"><Icon name="close" size={21} /></button>
        </div>
        <div className="playground-layout">
          <div className="playground-main">
            <div className="preview-toolbar">
              <div className="segmented" aria-label="Playground view">
                <button className={tab === "preview" ? "active" : ""} aria-pressed={tab === "preview"} onClick={() => setTab("preview")}>Preview</button>
                <button className={tab === "code" ? "active" : ""} aria-pressed={tab === "code"} onClick={() => setTab("code")}>Code</button>
              </div>
              <button className="icon-button" onClick={changeBackground} aria-label={light ? "Use dark preview background" : "Use light preview background"} title="Changes preview background and selects a readable dot color"><Icon name={light ? "moon" : "sun"} size={16} /></button>
            </div>
            <div hidden={tab !== "preview"}>
              <div className={`loader-preview-surface ${light ? "light" : ""}`}>
                <div className="loader-stage">
                  <div className="loader-magnified"><DotLoader key={replay} {...preview} label={`${metadata.name} loader preview`} /></div>
                  <span className="loader-preview-caption">2× preview · {settings.size} px component</span>
                </div>
                <div className="loader-contexts" aria-label="Actual size examples">
                  <div className="loader-context">
                    <span className="loader-context-label">Inline · 20 px</span>
                    <div className="loader-context-inline"><DotLoader key={replay} {...preview} size={20} /><span>{metadata.name}</span></div>
                  </div>
                  <div className="loader-context">
                    <span className="loader-context-label">Button · 24 px</span>
                    <div className="loader-context-button"><DotLoader key={replay} {...preview} size={24} /><span>{metadata.name}</span></div>
                  </div>
                  <div className="loader-context">
                    <span className="loader-context-label">Avatar · 64 px</span>
                    <div className="loader-context-avatar"><DotLoader key={replay} {...preview} size={64} /></div>
                  </div>
                </div>
              </div>
              <div className="loader-playback">
                <button className="button button-secondary" disabled={reducedMotion || settings.speed === 0} onClick={() => update("paused", !settings.paused)}><Icon name={stopped ? "play" : "pause"} size={14} />{stopped ? "Play" : "Pause"}</button>
                {settings.state === "complete" && <button className="text-button" disabled={reducedMotion || settings.speed === 0} onClick={() => { update("paused", false); setReplay((current) => current + 1); }}><Icon name="reset" size={14} /> Replay completion</button>}
                <button className="text-button" onClick={reset}><Icon name="reset" size={14} /> Reset settings</button>
              </div>
              <p className="loader-note">{reducedMotion ? "Animation is paused for reduced motion. " : ""}Background is preview-only. Switching it also selects a readable dot color.</p>
            </div>
            {tab === "code" && (
              <div className="usage-code loader-usage">
                <div><span>AssistantStatus.tsx</span><button className="text-button" onClick={() => onCopy(loaderUsage, "Usage example copied")}><Icon name="copy" size={14} /> Copy usage</button></div>
                <pre><code>{loaderUsage}</code></pre>
                <p>Save the downloaded file as <strong>DotLoader.tsx</strong>. The default export keeps your settings; pass <code>state</code> from your app as the operation changes.</p>
                <p>Copy component and Download .tsx include all states, your settings, and the MIT license. React 18 or newer is the only runtime dependency.</p>
                <p>The canvas is transparent. Set a background in your app to suit the selected dot color.</p>
              </div>
            )}
          </div>
          <aside className="playground-settings loader-settings" aria-label="Loader settings">
            <label className="control-label" htmlFor="loader-state">State</label>
            <select id="loader-state" value={settings.state} onChange={(event) => update("state", event.target.value as LoaderState)}>{LOADER_STATES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <p className="loader-state-description">{metadata.description}</p>
            <RangeControl name="size" label="Size" value={settings.size} min={20} max={128} step={1} display={`${settings.size} px`} onChange={(value) => update("size", value)} />
            <div className="loader-size-presets" aria-label="Common sizes">{[20, 32, 64].map((size) => <button key={size} aria-pressed={settings.size === size} onClick={() => update("size", size)}>{size} px</button>)}</div>
            <RangeControl name="speed" label="Speed" value={settings.speed} min={0} max={2} step={0.05} display={settings.speed === 0 ? "Stopped" : `${Number(settings.speed.toFixed(2))}×`} onChange={(value) => update("speed", value)} />
            <RangeControl name="intensity" label="Intensity" value={settings.intensity} min={0} max={1} step={0.05} display={`${Math.round(settings.intensity * 100)}%`} onChange={(value) => update("intensity", value)} />
            {settings.state === "listening" && <>
              <RangeControl name="level" label="Input level" value={settings.level} min={0} max={1} step={0.05} display={`${Math.round(settings.level * 100)}%`} onChange={(value) => update("level", value)} />
              <p className="loader-note">Manual preview. No microphone is used.</p>
            </>}
            <details className="loader-appearance">
              <summary>Appearance <span aria-hidden="true">+</span></summary>
              <div className="control-section">
                <span className="control-label">Dot color</span>
                <div className="color-swatches">{COLORS.map((color) => <button key={color} style={{ background: color }} className={settings.color === color ? "chosen" : ""} aria-label={`Set color ${color}`} aria-pressed={settings.color === color} onClick={() => update("color", color)} />)}</div>
                <label className="custom-color"><input type="color" value={settings.color} onChange={(event) => update("color", event.target.value)} aria-label="Custom dot color" /><span>{settings.color.toUpperCase()}</span><span>CUSTOM</span></label>
              </div>
              <RangeControl name="dot-size" label="Dot size" value={settings.dotSize} min={0.5} max={1.8} step={0.05} display={`${Number(settings.dotSize.toFixed(2))}×`} onChange={(value) => update("dotSize", value)} />
              <RangeControl name="spacing" label="Spacing" value={settings.spacing} min={0.6} max={1.4} step={0.05} display={`${Number(settings.spacing.toFixed(2))}×`} onChange={(value) => update("spacing", value)} />
              <RangeControl name="depth" label="Depth" value={settings.depth} min={0} max={1} step={0.05} display={`${Math.round(settings.depth * 100)}%`} onChange={(value) => update("depth", value)} />
              <RangeControl name="yaw" label="Horizontal angle" value={settings.yaw} min={-180} max={180} step={1} display={`${settings.yaw}°`} onChange={(value) => update("yaw", value)} />
              <RangeControl name="pitch" label="Vertical angle" value={settings.pitch} min={-80} max={80} step={1} display={`${settings.pitch}°`} onChange={(value) => update("pitch", value)} />
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
