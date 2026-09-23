import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

test("mobile navigation dismisses safely and restores focus before opening the playground", () => {
  type Element = { props: Record<string, any> };
  let open = false;
  let focused: unknown;
  let inert = false;
  let launches = 0;
  let refIndex = 0;
  let mount: () => (() => void) | undefined;
  let cleanup: (() => void) | undefined;
  let tree: Element;
  const refs: { current: unknown }[] = [];
  const toggle = { focus: () => { focused = toggle; } };
  const panel = { toggleAttribute: (_name: string, value: boolean) => { inert = value; } };
  const wrapper = { contains: (target: unknown) => target === toggle || target === panel };
  const document = new EventTarget();
  const window = Object.assign(new EventTarget(), { innerWidth: 390 });
  const jsx = (_tag: string, props: Element["props"]) => {
    if (props.ref) props.ref.current = props.className === "mobile-nav" ? wrapper : props.className === "mobile-menu-toggle" ? toggle : panel;
    return { props };
  };
  const modules = {
    react: {
      useRef: (current: unknown) => refs[refIndex++] ?? (refs[refIndex - 1] = { current }),
      useState: () => [open, (value: boolean) => { open = value; }],
      useEffect: (effect: typeof mount) => { mount = effect; },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "motion/react": { AnimatePresence: "presence", motion: { span: "span", nav: "nav", a: "a", button: "button" } },
  };
  const exports: { MobileNav?: (props: object) => Element } = {};
  const source = readFileSync(new URL("../src/components/MobileNav.tsx", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, document, window, require: (name: keyof typeof modules) => modules[name] });
  function render() {
    cleanup?.();
    refIndex = 0;
    tree = exports.MobileNav!({ reducedMotion: false, onPlayground: () => {
      assert.equal(focused, toggle, "dialog focus must restore to the persistent toggle");
      launches++;
    } });
    cleanup = mount!();
  }
  function find(className: string, element: Element = tree): Element[] {
    return [element.props.className === className ? element : null,
      ...[element.props.children].flat().filter((child) => child?.props).flatMap((child) => find(className, child)),
    ].filter(Boolean) as Element[];
  }
  function show() { find("mobile-menu-toggle")[0].props.onClick(); render(); }
  render();
  try {
    assert.equal(find("mobile-menu-toggle")[0].props["aria-expanded"], false);
    show();
    assert.equal(find("mobile-menu-panel")[0].props.id, "mobile-navigation");
    assert.equal(find("mobile-menu-toggle")[0].props["aria-expanded"], true);
    assert.equal(inert, false);
    const escape = Object.assign(new Event("keydown", { cancelable: true }), { key: "Escape" });
    document.dispatchEvent(escape);
    render();
    assert.equal(open, false);
    assert.equal(focused, toggle);
    assert.equal(escape.defaultPrevented, true);
    assert.equal(inert, true, "exiting links must not remain keyboard focusable");

    show();
    document.dispatchEvent(new Event("pointerdown"));
    render();
    assert.equal(open, false);
    show();
    tree.props.onBlur({ currentTarget: wrapper, relatedTarget: toggle });
    assert.equal(open, true);
    tree.props.onBlur({ currentTarget: wrapper, relatedTarget: null });
    render();
    assert.equal(open, false);
    show();
    window.innerWidth = 900;
    window.dispatchEvent(new Event("resize"));
    render();
    assert.equal(open, false);

    window.innerWidth = 390;
    show();
    const links = find("mobile-menu-link");
    assert.equal(links[0].props.href, "#collection");
    assert.equal(links[2].props.href, "https://github.com/grant-atl/dotlab");
    assert.equal(links[2].props.rel, "noreferrer");
    focused = undefined;
    links[1].props.onClick();
    render();
    assert.equal(launches, 1);
    assert.equal(open, false);
    const closedEscape = Object.assign(new Event("keydown", { cancelable: true }), { key: "Escape" });
    document.dispatchEvent(closedEscape);
    assert.equal(closedEscape.defaultPrevented, false, "closed navigation must remove its listeners");
  } finally { cleanup?.(); }
});
