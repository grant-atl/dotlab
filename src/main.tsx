import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { collectionFromPath } from "./lib/collection-navigation";
import "./styles.css";

const notFound = !collectionFromPath(window.location.pathname);
if (notFound) document.title = "Page not found | Dot / Lab";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {notFound ? (
      <>
        <header className="site-header">
          <a className="brand" href="/" aria-label="Dot Lab home">
            <span>
              dot<span className="brand-slash">/</span>lab
              <span className="brand-period">.</span>
            </span>
          </a>
        </header>
        <main className="not-found">
          <p className="not-found-code">404</p>
          <h1>Page not found</h1>
          <a className="button button-primary" href="/">Back to library</a>
        </main>
      </>
    ) : <App />}
  </StrictMode>,
);
