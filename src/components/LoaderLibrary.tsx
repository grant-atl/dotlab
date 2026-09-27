import { useEffect, useRef, useState } from "react";
import { DotLoader } from "./DotLoader";
import { Icon } from "./ui";
import { LOADER_STATES, type LoaderState } from "../lib/loaders";
import "./loaders.css";

export function LoaderLibrary({ paused, reducedMotion, onTogglePause, onSelect }: {
  paused: boolean;
  reducedMotion: boolean;
  onTogglePause: () => void;
  onSelect: (state: LoaderState) => void;
}) {
  const [state, setState] = useState<LoaderState>("processing");
  const heroRef = useRef<HTMLDivElement>(null);
  const active = LOADER_STATES.find((item) => item.id === state)!;

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || paused || reducedMotion) return;
    let timer: number | undefined;
    let visible = false;
    const sync = () => {
      window.clearInterval(timer);
      if (visible && !document.hidden) timer = window.setInterval(() => {
        setState((current) => LOADER_STATES[(LOADER_STATES.findIndex((item) => item.id === current) + 1) % LOADER_STATES.length].id);
      }, 5200);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(hero);
    document.addEventListener("visibilitychange", sync);
    return () => { window.clearInterval(timer); observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, [state, paused, reducedMotion]);

  return (
    <main className="loaders-page">
      <section className="hero" aria-labelledby="loaders-heading">
        <div className="hero-copy">
          <h1 id="loaders-heading">Dot loaders<br />for React</h1>
          <p>Nine animated states for AI interfaces. Customize the motion and appearance, then export a React component.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#collection">Browse loaders <Icon name="down" size={17} /></a>
            <button className="text-button" onClick={() => onSelect(state)}>Open playground <Icon name="arrow" size={17} /></button>
          </div>
          <div className="hero-facts">
            <span><Icon name="check" size={13} />{LOADER_STATES.length} states</span>
            <span><Icon name="check" size={13} />React ready</span>
            <span><Icon name="check" size={13} />MIT licensed</span>
          </div>
        </div>
        <div className="hero-art loaders-hero-art" ref={heroRef}>
          <div className="hero-field">
            <DotLoader state={state} style={{ width: "100%", height: "100%" }} paused={paused || reducedMotion} label="" />
          </div>
          <div className="hero-art-footer">
            <span><i />{active.name}</span>
            <div className="hero-art-actions">
              <button className="icon-button" disabled={reducedMotion} onClick={onTogglePause} aria-label={paused ? "Play all loaders" : "Pause all loaders"}><Icon name={paused ? "play" : "pause"} size={16} /></button>
              <button className="icon-button" onClick={() => onSelect(state)} aria-label={`Customize ${active.name}`}><Icon name="external" size={16} /></button>
            </div>
          </div>
          <div className="hero-selector" aria-label="Hero loader state">
            {LOADER_STATES.map((item) => <button key={item.id} className={item.id === state ? "selected" : ""} aria-label={`Show ${item.name} loader`} title={item.name} aria-pressed={item.id === state} onClick={() => setState(item.id)} />)}
          </div>
        </div>
      </section>

      <div className="collection-intro" id="collection">
        <h2>Library</h2>
        <p>Select a state to customize it.</p>
      </div>
      <section className="collection" aria-label="Loader library">
        <div className="animation-grid loader-grid">
          {LOADER_STATES.map((item) => (
            <button className="animation-card loader-card" key={item.id} onClick={() => onSelect(item.id)} aria-label={`Customize ${item.name} loader`}>
              <div className="loader-card-stage">
                <div className="loader-main-preview"><DotLoader state={item.id} size={80} paused={paused || reducedMotion} label="" /></div>
                <div className="loader-inline-preview"><DotLoader state={item.id} size={20} paused={paused || reducedMotion} label="" /><span>{item.name}</span></div>
              </div>
              <div className="card-info"><div><h3>{item.name}</h3><p>{item.description}</p></div><Icon name="arrow" size={16} /></div>
            </button>
          ))}
        </div>
        <p className="loader-library-note">Each state uses the same 27 particles. State changes morph between arrangements. The exported component includes your settings and respects reduced motion.</p>
      </section>
    </main>
  );
}
