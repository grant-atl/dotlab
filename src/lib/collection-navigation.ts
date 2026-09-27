import { useCallback, useEffect, useRef, useState } from "react";

export type CollectionPage = "patterns" | "systems" | "loaders";

export function collectionFromPath(pathname: string): CollectionPage | null {
  if (["/", "/index.html"].includes(pathname)) return "patterns";
  if (["/dynamical-systems", "/dynamical-systems/", "/dynamical-systems/index.html"].includes(pathname)) return "systems";
  if (["/loaders", "/loaders/", "/loaders/index.html"].includes(pathname)) return "loaders";
  return null;
}

const metadata = {
  patterns: ["", "Dot / Lab — Dot animations for React", "20 free dot animations for React. Customize color, speed, and density, then copy or download the component."],
  systems: ["dynamical-systems/", "Dynamical systems & strange attractors | Dot / Lab", "Explore eight dynamical systems with live equations, parameter controls, and standalone React TSX export."],
  loaders: ["loaders/", "Dot loaders for AI interfaces | Dot / Lab", "Nine animated states in a 27-dot cube. Customize motion, color, spacing, and viewing angle, then export a standalone React loader."],
} satisfies Record<CollectionPage, string[]>;

function updateMetadata(page: CollectionPage) {
  const [path, title, description] = metadata[page];
  const url = `https://dotlab.grantpedersen.com/${path}`;
  document.title = title;
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", url);
  document.querySelector('meta[property="og:url"]')?.setAttribute("content", url);
  for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
    document.querySelector(selector)?.setAttribute("content", title);
  }
  for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
    document.querySelector(selector)?.setAttribute("content", description);
  }
}

export function useCollectionNavigation() {
  const [page, setPage] = useState<CollectionPage>(() => collectionFromPath(window.location.pathname) ?? "patterns");
  const finishRef = useRef(() => {});
  const finishNavigation = useCallback(() => finishRef.current(), []);

  useEffect(() => {
    const keyName = "dotlabCollectionKey";
    let sequence = 0;
    const createKey = () => `${Date.now()}-${sequence++}`;
    const history = window.history;
    let entryKey: string = history.state?.[keyName] ?? createKey();
    history.replaceState({ ...history.state, [keyName]: entryKey }, "");
    const positions = new Map<string, { left: number; top: number }>();
    let requestedPage = collectionFromPath(window.location.pathname)!;
    let pending: { url: URL; position?: { left: number; top: number }; smooth: boolean } | null = null;
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    updateMetadata(requestedPage);

    const savePosition = () => {
      if (!pending) positions.set(entryKey, { left: window.scrollX, top: window.scrollY });
    };

    finishRef.current = () => {
      if (!pending) return;
      const navigation = pending;
      pending = null;
      let hash = navigation.url.hash.slice(1);
      try { hash = decodeURIComponent(hash); } catch { /* An invalid fragment simply has no matching target. */ }
      const anchor = hash ? document.getElementById(hash) : null;
      const main = document.querySelector("main");
      const focusTarget = anchor?.querySelector<HTMLElement>("h1, h2") ?? anchor ?? main?.querySelector<HTMLElement>("h1") ?? main;
      const behavior = navigation.smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "instant";
      if (navigation.position) window.scrollTo({ ...navigation.position, behavior: "instant" });
      else if (anchor) anchor.scrollIntoView({ behavior, block: "start" });
      else window.scrollTo({ left: 0, top: 0, behavior });
      focusTarget?.setAttribute("tabindex", "-1");
      focusTarget?.focus({ preventScroll: true });
    };

    const navigate = (url: URL, nextPage: CollectionPage, position?: { left: number; top: number }) => {
      const samePage = nextPage === requestedPage;
      const waitingForMount = !!pending;
      requestedPage = nextPage;
      pending = { url, position, smooth: samePage && !waitingForMount };
      updateMetadata(nextPage);
      setPage(nextPage);
      if (samePage && !waitingForMount) finishRef.current();
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      const nextPage = collectionFromPath(url.pathname);
      if (!nextPage || url.origin !== window.location.origin || url.search || window.location.search) return;
      event.preventDefault();
      savePosition();
      if (url.href !== window.location.href) {
        entryKey = createKey();
        history.pushState({ [keyName]: entryKey }, "", url);
      }
      navigate(url, nextPage);
    };

    const onPopState = () => {
      const url = new URL(window.location.href);
      const nextPage = collectionFromPath(url.pathname);
      if (!nextPage || url.search) { window.location.reload(); return; }
      savePosition();
      entryKey = history.state?.[keyName] ?? createKey();
      history.replaceState({ ...history.state, [keyName]: entryKey }, "");
      navigate(url, nextPage, positions.get(entryKey));
    };

    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPopState);
      history.scrollRestoration = previousRestoration;
      finishRef.current = () => {};
    };
  }, []);

  return { page, finishNavigation };
}
