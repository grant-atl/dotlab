import { useEffect, useRef, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { DotField } from "./components/DotField";
import { MobileNav } from "./components/MobileNav";
import { PATTERNS, type PatternId } from "./lib/patterns";
import { Icon, Toast, useDialog, COLORS, type CopyHandler } from "./components/ui";
import { DynamicsLibrary } from "./components/DynamicsLibrary";
import { DynamicsPlayground } from "./components/DynamicsPlayground";
import { SYSTEMS, type SystemId } from "./lib/dynamics";
import fieldSource from "./components/DotField.tsx?raw";
import patternsSource from "./lib/patterns.ts?raw";
import license from "../LICENSE?raw";

function Mark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}

const portableSource = `'use client';\n\n/*\n${license.trim()}\n*/\n\n${patternsSource}\n${fieldSource.replace(/^import .*from ['"]\.\.\/lib\/patterns['"];?\r?\n/gm, "")}`;
const HERO_PATTERNS: PatternId[] = ["sphere", "torus", "wave"];

function downloadSource() {
  const url = URL.createObjectURL(
    new Blob([portableSource], { type: "text/plain;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "DotField.tsx";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App({ systemsPage = false }: { systemsPage?: boolean }) {
  const [category, setCategory] = useState("All animations");
  const [query, setQuery] = useState("");
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [heroIndex, setHeroIndex] = useState(0);
  const [selected, setSelected] = useState<PatternId | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<SystemId | null>(null);
  const [toast, setToast] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !selected && !selectedSystem && !systemsPage &&
        !(event.target instanceof HTMLInputElement)
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [selected, selectedSystem, systemsPage]);

  const shown = PATTERNS.filter(
    (pattern) =>
      (category === "All animations" || pattern.category === category) &&
      `${pattern.name} ${pattern.description} ${pattern.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const stopMotion = paused || reducedMotion || !!selected || !!selectedSystem;
  const openPlayground = () => systemsPage ? setSelectedSystem("lorenz") : setSelected("sphere");
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || stopMotion) return;
    let inView = false;
    let timeout: number | undefined;
    const schedule = () => {
      window.clearTimeout(timeout);
      if (inView && !document.hidden && !hero.querySelector(":focus-visible")) {
        timeout = window.setTimeout(() => {
          setHeroIndex((index) => (index + 1) % HERO_PATTERNS.length);
        }, 6000);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      schedule();
    });
    observer.observe(hero);
    document.addEventListener("visibilitychange", schedule);
    hero.addEventListener("click", schedule);
    hero.addEventListener("focusin", schedule);
    hero.addEventListener("focusout", schedule);
    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
      document.removeEventListener("visibilitychange", schedule);
      hero.removeEventListener("click", schedule);
      hero.removeEventListener("focusin", schedule);
      hero.removeEventListener("focusout", schedule);
    };
  }, [heroIndex, stopMotion]);
  const heroPattern = PATTERNS.find(
    (pattern) => pattern.id === HERO_PATTERNS[heroIndex],
  )!;
  const copy = async (text: string, message = "Copied to clipboard") => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(message);
    } catch {
      setToast("Clipboard unavailable. Use Download to save the component.");
    }
  };

  return (
    <>
      <a className="skip-link" href="#collection">
        Skip to animations
      </a>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Dot Lab home">
          <Mark />
          <span>
            dot<span className="brand-slash">/</span>lab
            <span className="brand-period">.</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a className={!systemsPage ? "nav-active" : ""} href="/#collection" aria-current={!systemsPage ? "page" : undefined}>
            Dot patterns <span className="nav-count">20</span>
          </a>
          <a className={systemsPage ? "nav-active" : ""} href="/dynamical-systems/" aria-current={systemsPage ? "page" : undefined}>
            Dynamical systems <span className="nav-count">{SYSTEMS.length}</span>
          </a>
          <button onClick={openPlayground}>Playground</button>
        </nav>
        <a
          className="header-source"
          href="https://github.com/grant-atl/dotlab"
          target="_blank"
          rel="noreferrer"
          aria-label="View source on GitHub"
        >
          <Icon name="code" size={17} />
          <span>Get the source</span>
          <Icon name="external" size={13} />
        </a>
        <MobileNav
          onPlayground={openPlayground}
          systemsPage={systemsPage}
          systemCount={SYSTEMS.length}
          reducedMotion={reducedMotion}
        />
      </header>

      {systemsPage ? (
        <DynamicsLibrary
          paused={stopMotion}
          reducedMotion={reducedMotion}
          onTogglePause={() => setPaused(!paused)}
          onSelect={setSelectedSystem}
        />
      ) : <main>
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <h1 id="hero-heading">
              Dot patterns
              <br />
              for React
            </h1>
            <p>
              Customize the color, speed, and density, then copy the React component.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#collection">
                Browse library <Icon name="down" size={17} />
              </a>
            </div>
            <div className="hero-facts">
              <span>
                <Icon name="check" size={13} />
                20 animations
              </span>
              <span>
                <Icon name="check" size={13} />
                React ready
              </span>
              <span>
                <Icon name="check" size={13} />
                MIT licensed
              </span>
            </div>
          </div>
          <div className="hero-art" ref={heroRef}>
            <div className="hero-field">
              <DotField
                pattern={HERO_PATTERNS[heroIndex]}
                color="#baff66"
                density={1.65}
                speed={0.325}
                paused={stopMotion}
                morph
              />
            </div>
            <div className="hero-art-footer">
              <span>
                <i />
                {heroPattern.name}
              </span>
              <div className="hero-art-actions">
                <button
                  className="icon-button"
                  disabled={reducedMotion}
                  onClick={() => setPaused(!paused)}
                  aria-label={
                    reducedMotion
                      ? "Reduced motion enabled"
                      : paused
                        ? "Play all animations"
                        : "Pause all animations"
                  }
                  title={
                    reducedMotion
                      ? "Your device has reduced motion enabled"
                      : paused
                        ? "Play animations"
                        : "Pause animations"
                  }
                >
                  <Icon name={paused || reducedMotion ? "play" : "pause"} size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Customize ${heroPattern.name}`}
                  onClick={() => setSelected(HERO_PATTERNS[heroIndex])}
                >
                  <Icon name="external" size={16} />
                </button>
              </div>
            </div>
            <div className="hero-selector" aria-label="Hero animation">
              {HERO_PATTERNS.map((pattern, index) => (
                <button
                  key={pattern}
                  className={index === heroIndex ? "selected" : ""}
                  onClick={() => setHeroIndex(index)}
                  aria-label={`Show ${pattern} animation`}
                  aria-pressed={index === heroIndex}
                />
              ))}
            </div>
          </div>
        </section>

        <div className="collection-intro" id="collection">
          <h2>Library</h2>
        </div>
        <section className="collection" aria-label="Animation collection">
          <div className="collection-toolbar">
            <div className="filters" aria-label="Filter animations">
              {["All animations", "Orb", "Wave", "Flow", "Structure"].map(
                (item) => (
                  <button
                    key={item}
                    className={category === item ? "filter active" : "filter"}
                    aria-pressed={category === item}
                    onClick={() => setCategory(item)}
                  >
                    {item === "Orb"
                      ? "Orbs"
                      : item === "Wave"
                        ? "Waves"
                        : item === "Flow"
                          ? "Flows"
                          : item === "Structure"
                            ? "Structures"
                            : item}
                    {item === "All animations" && <span>20</span>}
                  </button>
                ),
              )}
            </div>
            <div className="collection-tools">
              <label className="search-field">
                <Icon name="search" size={15} />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find an animation"
                  aria-label="Search animations"
                />
                <kbd>/</kbd>
              </label>
              <button
                className={`icon-button pause-all ${paused ? "is-paused" : ""}`}
                disabled={reducedMotion}
                onClick={() => setPaused(!paused)}
                aria-label={
                  reducedMotion
                    ? "Reduced motion enabled"
                    : paused
                      ? "Play all animations"
                      : "Pause all animations"
                }
                title={
                  reducedMotion
                    ? "Your device has reduced motion enabled"
                    : paused
                      ? "Play animations"
                      : "Pause animations"
                }
              >
                <Icon
                  name={paused || reducedMotion ? "play" : "pause"}
                  size={16}
                />
              </button>
            </div>
          </div>
          <div className="animation-grid">
            {shown.map((pattern) => {
              const index = PATTERNS.indexOf(pattern);
              return (
                <button
                  className="animation-card"
                  key={pattern.id}
                  onClick={() => setSelected(pattern.id)}
                  aria-label={`Customize ${pattern.name}: ${pattern.description}`}
                >
                  <div className="card-stage">
                    <span className="card-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="card-preview-label">
                      LIVE PREVIEW <span />
                    </span>
                    <DotField
                      pattern={pattern.id}
                      color={index === 0 ? "#baff66" : "#d9dfd3"}
                      density={0.85}
                      speed={0.375}
                      paused={stopMotion}
                    />
                    <span className="card-use">
                      Customize <Icon name="arrow" size={15} />
                    </span>
                  </div>
                  <div className="card-info">
                    <div>
                      <h3>{pattern.name}</h3>
                      <p>{pattern.description}</p>
                    </div>
                    <span className="category-label">{pattern.category}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {shown.length === 0 && (
            <div className="empty-state">
              <h3>No dots in this corner.</h3>
              <p>Try another name or explore the full collection.</p>
              <button
                className="button button-secondary"
                onClick={() => {
                  setCategory("All animations");
                  setQuery("");
                }}
              >
                Clear filters <Icon name="reset" size={16} />
              </button>
            </div>
          )}
        </section>
      </main>}

      <footer className="site-footer">
        <a className="brand" href="/">
          <Mark />
          <span>
            dot<span className="brand-slash">/</span>lab
            <span className="brand-period">.</span>
          </span>
        </a>
        <div>
          <a href="https://libraries.dev/orbs" target="_blank" rel="noreferrer">
            <ThinkingOrb
              state="breathing"
              size={20}
              theme="dark"
              paused={stopMotion}
            />
            Inspired by Libraries.dev <Icon name="external" size={12} />
          </a>
          <span>FREE TO USE · MIT LICENSE</span>
        </div>
      </footer>

      {selected && (
        <Playground
          key={selected}
          initialPattern={selected}
          reducedMotion={reducedMotion}
          message={toast}
          onClose={() => setSelected(null)}
          onCopy={copy}
        />
      )}
      {selectedSystem && (
        <DynamicsPlayground
          key={selectedSystem}
          initialSystem={selectedSystem}
          reducedMotion={reducedMotion}
          message={toast}
          onClose={() => setSelectedSystem(null)}
          onCopy={copy}
        />
      )}
      {!selected && !selectedSystem && <Toast message={toast} />}
    </>
  );
}

function Playground({
  initialPattern,
  reducedMotion,
  message,
  onClose,
  onCopy,
}: {
  initialPattern: PatternId;
  reducedMotion: boolean;
  message: string;
  onClose: () => void;
  onCopy: CopyHandler;
}) {
  const [pattern, setPattern] = useState(initialPattern);
  const [color, setColor] = useState(COLORS[0]);
  const [speed, setSpeed] = useState(0.5);
  const [density, setDensity] = useState(1);
  const [paused, setPaused] = useState(false);
  const [light, setLight] = useState(false);
  const [tab, setTab] = useState("preview");
  const dialog = useDialog(onClose, reducedMotion);
  const metadata = PATTERNS.find((item) => item.id === pattern)!;
  const usage = `import { DotField } from './DotField';\n\nexport default function Hero() {\n  return (\n    <div style={{ background: '${light ? "#f0f1eb" : "#111310"}' }}>\n      <DotField\n        pattern="${pattern}"\n        color="${color}"\n        speed={${speed}}\n        density={${density}}\n        paused={${paused}}\n        style={{ height: 480 }}\n      />\n    </div>\n  );\n}`;
  return (
    <dialog
      {...dialog.props}
      className="playground-dialog"
      aria-labelledby="playground-title"
    >
      <div className="dialog-inner">
        <div className="dialog-header">
          <div>
            <span className="section-kicker">THE PLAYGROUND</span>
            <h2 id="playground-title">Playground</h2>
          </div>
          <button
            className="icon-button"
            onClick={dialog.close}
            aria-label="Close playground"
          >
            <Icon name="close" size={21} />
          </button>
        </div>
        <div className="playground-layout">
          <div className="playground-main">
            <div className="preview-toolbar">
              <div className="segmented">
                <button
                  className={tab === "preview" ? "active" : ""}
                  onClick={() => setTab("preview")}
                >
                  Preview
                </button>
                <button
                  className={tab === "code" ? "active" : ""}
                  onClick={() => setTab("code")}
                >
                  Code
                </button>
              </div>
              {reducedMotion && (
                <span className="preview-tag">REDUCED MOTION</span>
              )}
            </div>
            {tab === "preview" ? (
              <div className={`playground-stage ${light ? "light" : ""}`}>
                <DotField
                  pattern={pattern}
                  color={color}
                  speed={speed}
                  density={density}
                  paused={paused}
                />
                <span className="preview-pattern">{metadata.name}</span>
                <div className="stage-buttons">
                  <button
                    className="icon-button"
                    onClick={() => {
                      setLight(!light);
                      if (color === COLORS[0] || color === "#34482a")
                        setColor(light ? COLORS[0] : "#34482a");
                    }}
                    aria-label={
                      light ? "Use dark background" : "Use light background"
                    }
                  >
                    <Icon name={light ? "moon" : "sun"} size={16} />
                  </button>
                  <button
                    className="icon-button"
                    disabled={reducedMotion}
                    onClick={() => setPaused(!paused)}
                    aria-label={paused ? "Play preview" : "Pause preview"}
                  >
                    <Icon
                      name={paused || reducedMotion ? "play" : "pause"}
                      size={16}
                    />
                  </button>
                </div>
              </div>
            ) : (
              <div className="usage-code">
                <div>
                  <span>Hero.tsx</span>
                  <button
                    className="text-button"
                    onClick={() => onCopy(usage, "Usage example copied")}
                  >
                    <Icon name="copy" size={14} />
                    Copy usage
                  </button>
                </div>
                <pre>
                  <code>{usage}</code>
                </pre>
                <p>
                  Save the downloaded component as <strong>DotField.tsx</strong>{" "}
                  next to this file.
                </p>
              </div>
            )}
            <div className="preview-note">
              <span className="tiny-dot" />
              {metadata.description}
              <span>CANVAS 2D</span>
            </div>
          </div>
          <aside className="playground-settings">
            <label className="control-label" htmlFor="pattern-select">
              Animation
            </label>
            <select
              id="pattern-select"
              value={pattern}
              onChange={(event) => setPattern(event.target.value as PatternId)}
            >
              {PATTERNS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <div className="control-section">
              <span className="control-label">Dot color</span>
              <div className="color-swatches">
                {COLORS.map((item) => (
                  <button
                    key={item}
                    style={{ background: item }}
                    className={color === item ? "chosen" : ""}
                    aria-label={`Set color ${item}`}
                    aria-pressed={color === item}
                    onClick={() => setColor(item)}
                  />
                ))}
              </div>
              <label className="custom-color">
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  aria-label="Custom dot color"
                />
                <span>{color.toUpperCase()}</span>
                <span>CUSTOM</span>
              </label>
            </div>
            <div className="control-section">
              <label className="range-label" htmlFor="speed">
                Speed <output>{speed.toFixed(1)}×</output>
              </label>
              <input
                id="speed"
                type="range"
                min="0.2"
                max="2"
                step="0.1"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              />
              <div className="range-captions">
                <span>Slow & steady</span>
                <span>A little energy</span>
              </div>
            </div>
            <div className="control-section">
              <label className="range-label" htmlFor="density">
                Density <output>{density.toFixed(1)}×</output>
              </label>
              <input
                id="density"
                type="range"
                min="0.4"
                max="1.8"
                step="0.1"
                value={density}
                onChange={(event) => setDensity(Number(event.target.value))}
              />
              <div className="range-captions">
                <span>Room to breathe</span>
                <span>More dots</span>
              </div>
            </div>
            <button
              className="text-button reset-button"
              onClick={() => {
                setSpeed(0.5);
                setDensity(1);
                setColor(COLORS[0]);
                setLight(false);
                setPaused(false);
              }}
            >
              <Icon name="reset" size={14} />
              Reset settings
            </button>
            <div className="export-actions">
              <button
                className="button button-primary"
                onClick={() =>
                  onCopy(
                    `${portableSource}\n\n/* Usage example:\n${usage}\n*/\n`,
                    "Complete React component copied",
                  )
                }
              >
                <Icon name="copy" size={17} />
                Copy component
              </button>
              <button
                className="button button-secondary"
                onClick={downloadSource}
              >
                <Icon name="down" size={16} />
                Download .tsx
              </button>
            </div>
          </aside>
        </div>
      </div>
      <Toast message={message} />
    </dialog>
  );
}
