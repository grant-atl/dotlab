import { useEffect, useRef, useState } from "react";
import { AttractorField } from "./AttractorField";
import { Icon } from "./ui";
import { SYSTEMS, type SystemId } from "../lib/dynamics";

export function DynamicsLibrary({ paused, reducedMotion, onTogglePause, onSelect }: {
  paused: boolean;
  reducedMotion: boolean;
  onTogglePause: () => void;
  onSelect: (system: SystemId) => void;
}) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const search = (event: KeyboardEvent) => {
      if (event.key !== "/" || document.querySelector("dialog[open]") ||
        event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener("keydown", search);
    return () => document.removeEventListener("keydown", search);
  }, []);
  const shown = SYSTEMS.filter((system) =>
    (filter === "all" || system.kind === filter) &&
    `${system.name} ${system.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <main className="dynamics-page">
      <section className="hero" aria-labelledby="systems-heading">
        <div className="hero-copy">
          <h1 id="systems-heading">Dynamical<br />systems</h1>
          <p>Strange attractors and iterated maps. Adjust the equations, watch the motion, and export a React component.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#collection">Browse systems <Icon name="down" size={17} /></a>
            <button className="text-button" onClick={() => onSelect("lorenz")}>Open playground <Icon name="arrow" size={17} /></button>
          </div>
          <div className="hero-facts">
            <span><Icon name="check" size={13} />{SYSTEMS.length} systems</span>
            <span><Icon name="check" size={13} />Live equations</span>
            <span><Icon name="check" size={13} />TSX export</span>
          </div>
        </div>
        <div className="hero-art systems-hero-art">
          <div className="hero-field"><AttractorField system="lorenz" color="#baff66" density={1.4} speed={0.15} paused={paused} /></div>
          <div className="hero-art-footer">
            <span><i />Lorenz attractor</span>
            <div className="hero-art-actions">
              <button className="icon-button" disabled={reducedMotion} onClick={onTogglePause} aria-label={paused ? "Play all systems" : "Pause all systems"}>
                <Icon name={paused ? "play" : "pause"} size={16} />
              </button>
              <button className="icon-button" onClick={() => onSelect("lorenz")} aria-label="Customize Lorenz"><Icon name="external" size={16} /></button>
            </div>
          </div>
        </div>
      </section>
      <div className="collection-intro" id="collection"><h2>Library</h2></div>
      <section className="collection" aria-label="Dynamical systems library">
        <div className="collection-toolbar">
          <div className="filters" aria-label="Filter systems">
            {[["all", "All systems"], ["flow", "Continuous flows"], ["map", "Discrete maps"]].map(([value, label]) => (
              <button key={value} className={`filter ${filter === value ? "active" : ""}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>
                {label}{value === "all" && <span>{SYSTEMS.length}</span>}
              </button>
            ))}
          </div>
          <div className="collection-tools">
            <label className="search-field"><Icon name="search" size={15} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a system" aria-label="Search systems" /><kbd>/</kbd></label>
            <button className={`icon-button pause-all ${paused ? "is-paused" : ""}`} disabled={reducedMotion} onClick={onTogglePause} aria-label={paused ? "Play all systems" : "Pause all systems"}><Icon name={paused ? "play" : "pause"} size={16} /></button>
          </div>
        </div>
        <div className="animation-grid systems-grid">
          {shown.map((system) => (
            <button className="animation-card" key={system.id} onClick={() => onSelect(system.id)} aria-label={`Customize ${system.name}`}>
              <div className="card-stage">
                <span className="card-number">{String(SYSTEMS.indexOf(system) + 1).padStart(2, "0")}</span>
                <span className="card-preview-label">{system.kind === "flow" ? "FLOW" : "MAP"}<span /></span>
                <AttractorField system={system.id} color={system.id === "lorenz" ? "#baff66" : "#d9dfd3"} density={0.8} speed={system.id === "lorenz" ? 0.15 : 0.4} paused={paused} />
                <span className="card-use">Playground <Icon name="arrow" size={15} /></span>
              </div>
              <div className="card-info"><div><h3>{system.name}</h3><p>{system.description}</p></div></div>
              <div className="card-equation" aria-hidden="true">{system.equations[0]}</div>
            </button>
          ))}
        </div>
        {shown.length === 0 && <div className="empty-state"><h3>No matching systems</h3><p>Try a different name or clear the filters.</p><button className="button button-secondary" onClick={() => { setFilter("all"); setQuery(""); }}>Clear filters <Icon name="reset" size={16} /></button></div>}
        <div className="systems-explainer">
          <p><strong>Continuous flows</strong> follow rates of change through time. <strong>Discrete maps</strong> calculate one state from the previous one.</p>
          <p>Each playground includes the equations and a source. Changing parameters can produce a fixed point, a repeating orbit, or chaotic motion.</p>
        </div>
      </section>
    </main>
  );
}
