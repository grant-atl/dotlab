import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

test("collection navigation defers scrolling until mount and preserves history and native link behavior", () => {
  const handlers = new Map<string, (event?: any) => void>();
  let mount: () => () => void;
  let currentPage: string;
  let focused: unknown;
  let reducedMotion = false;
  let reloaded = false;
  const scrolling: any[] = [];
  class Element {
    attrs = new Map<string, string>();
    target = "";
    href = "";
    child: Element | null = null;
    parent: Element | null = null;
    closest() { return this.href ? this : this.parent; }
    hasAttribute(name: string) { return this.attrs.has(name); }
    setAttribute(name: string, value: string) { this.attrs.set(name, value); }
    querySelector() { return this.child; }
    focus() { focused = this; }
    scrollIntoView(options: any) { scrolling.push(options); window.scrollY = 600; }
  }
  const main = new Element();
  main.child = new Element();
  const collection = new Element();
  collection.child = new Element();
  const meta = new Map<string, Element>();
  const document = {
    title: "",
    addEventListener: (name: string, handler: (event?: any) => void) => handlers.set(name, handler),
    removeEventListener: (name: string) => handlers.delete(name),
    getElementById: (id: string) => id === "collection" ? collection : null,
    querySelector: (selector: string) => {
      if (selector === "main") return main;
      if (!meta.has(selector)) meta.set(selector, new Element());
      return meta.get(selector);
    },
  };
  const entries = [{ url: "https://dotlab.grantpedersen.com/", state: { existing: "kept" } as any }];
  let entryIndex = 0;
  const window: any = {
    location: Object.assign(new URL(entries[0].url), { reload: () => { reloaded = true; } }),
    scrollX: 0,
    scrollY: 420,
    matchMedia: () => ({ matches: reducedMotion }),
    scrollTo: (options: any) => { scrolling.push(options); window.scrollX = options.left; window.scrollY = options.top; },
    addEventListener: (name: string, handler: (event?: any) => void) => handlers.set(name, handler),
    removeEventListener: (name: string) => handlers.delete(name),
  };
  const setLocation = (url: string) => { window.location = Object.assign(new URL(url), { reload: () => { reloaded = true; } }); };
  window.history = {
    scrollRestoration: "auto",
    get state() { return entries[entryIndex].state; },
    replaceState(state: object, _title: string, url?: string | URL) {
      entries[entryIndex] = { state, url: url?.toString() ?? window.location.href };
      setLocation(entries[entryIndex].url);
    },
    pushState(state: object, _title: string, url: URL) {
      entries.splice(++entryIndex, entries.length, { state, url: url.toString() });
      setLocation(url.toString());
    },
  };
  const exports: any = {};
  const source = readFileSync(new URL("../src/lib/collection-navigation.ts", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports, window, document, Element, URL,
    require: () => ({
      useState: (initial: () => string) => [currentPage = initial(), (page: string) => { currentPage = page; }],
      useRef: (current: unknown) => ({ current }),
      useCallback: (callback: () => void) => callback,
      useEffect: (effect: typeof mount) => { mount = effect; },
    }),
  });
  for (const [path, expected] of [
    ["/", "patterns"], ["/index.html", "patterns"],
    ["/dynamical-systems", "systems"], ["/dynamical-systems/", "systems"], ["/dynamical-systems/index.html", "systems"],
    ["/loaders", "loaders"], ["/loaders/", "loaders"], ["/loaders/index.html", "loaders"],
    ["/loaders/nope", null], ["/missing", null],
  ]) assert.equal(exports.collectionFromPath(path), expected);
  const navigation = exports.useCollectionNavigation();
  const cleanup = mount!();

  function click(href: string, changes: Record<string, unknown> = {}, attrs: Record<string, string> = {}) {
    const anchor = new Element();
    anchor.href = new URL(href, window.location.href).href;
    anchor.target = attrs.target ?? "";
    for (const [name, value] of Object.entries(attrs)) anchor.setAttribute(name, value);
    const child = new Element();
    child.parent = anchor;
    const event = {
      target: child, defaultPrevented: false, button: 0,
      preventDefault() { this.defaultPrevented = true; }, ...changes,
    };
    handlers.get("click")!(event);
    return event;
  }
  function go(delta: number) {
    entryIndex += delta;
    setLocation(entries[entryIndex].url);
    handlers.get("popstate")!();
  }

  try {
    assert.equal(window.history.scrollRestoration, "manual");
    assert.equal(window.history.state.existing, "kept");
    navigation.finishNavigation();
    assert.equal(scrolling.length, 0, "initial render leaves native scrolling alone");
    for (const changes of [{ metaKey: true }, { ctrlKey: true }, { altKey: true }, { shiftKey: true }, { button: 1 }, { defaultPrevented: true }]) {
      click("/loaders/", changes);
      assert.equal(entries.length, 1);
    }
    for (const attrs of [{ target: "_blank" }, { target: "preview" }, { download: "file" }]) {
      assert.equal(click("/loaders/", {}, attrs).defaultPrevented, false);
    }
    for (const href of ["https://example.com/loaders/", "/missing", "/loaders/?variant=custom", "mailto:hello@example.com"]) {
      assert.equal(click(href).defaultPrevented, false);
    }
    assert.equal(entries.length, 1);

    assert.equal(click("/dynamical-systems/").defaultPrevented, true);
    assert.equal(currentPage!, "systems");
    assert.equal(window.scrollY, 420);
    assert.equal(focused, undefined);
    assert.equal(document.title, "Dynamical systems & strange attractors | Dot / Lab");
    assert.equal(meta.get('link[rel="canonical"]')?.attrs.get("href"), "https://dotlab.grantpedersen.com/dynamical-systems/");
    assert.equal(meta.get('meta[property="og:url"]')?.attrs.get("content"), "https://dotlab.grantpedersen.com/dynamical-systems/");
    main.child = new Element();
    navigation.finishNavigation();
    assert.equal(window.scrollY, 0);
    assert.equal(focused, main.child);
    assert.equal(main.child.attrs.get("tabindex"), "-1");

    window.scrollY = 730;
    click("/loaders/");
    click("/#collection");
    assert.equal(currentPage!, "patterns");
    assert.equal(window.scrollY, 730, "rapid navigation waits for the latest page to mount");
    navigation.finishNavigation();
    assert.equal(window.scrollY, 600);
    assert.equal(focused, collection.child);
    assert.equal(scrolling.at(-1).behavior, "instant");
    window.scrollY = 840;
    go(-1);
    assert.equal(currentPage!, "loaders");
    navigation.finishNavigation();
    assert.equal(window.scrollY, 0, "an interrupted, never-mounted page starts at the top");
    go(-1);
    navigation.finishNavigation();
    assert.equal(window.scrollY, 730, "Back restores the previous collection position");
    go(-1);
    navigation.finishNavigation();
    assert.equal(window.scrollY, 420, "the original history entry also restores");
    go(1);
    navigation.finishNavigation();
    assert.equal(window.scrollY, 730, "Forward restores the saved position");

    click("#collection");
    assert.equal(window.scrollY, 600, "same-page fragments scroll without waiting for remount");
    assert.equal(scrolling.at(-1).behavior, "smooth");
    reducedMotion = true;
    click("#collection");
    assert.equal(scrolling.at(-1).behavior, "instant");
    assert.equal(entries.length, entryIndex + 1, "the identical URL does not add history entries");

    window.scrollY = 900;
    click("/loaders/");
    click("/dynamical-systems/#collection");
    assert.equal(currentPage!, "systems");
    assert.equal(window.scrollY, 900);
    navigation.finishNavigation();
    assert.equal(window.scrollY, 600, "cancelled exits flush the latest destination when the retained page is present again");

    setLocation("https://dotlab.grantpedersen.com/loaders/?variant=custom");
    assert.equal(click("/dynamical-systems/").defaultPrevented, false, "query navigation stays native");
    setLocation("https://dotlab.grantpedersen.com/missing");
    handlers.get("popstate")!();
    assert.equal(reloaded, true, "unknown history routes retain normal 404 handling");
  } finally {
    cleanup();
    assert.equal(window.history.scrollRestoration, "auto");
    assert.equal(handlers.size, 0);
  }
});
