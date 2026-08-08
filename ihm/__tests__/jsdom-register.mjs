// Node `--import` preload: must run before react-dom is ever imported by any
// test file, since react-dom's event system (input/change tracking) captures
// `window`/`document`/`Event` at its own first module evaluation. Setting
// jsdom globals from inside a test file (after a static `import "react-dom"`)
// is too late — clicks/submits still work (root-container delegation reads
// the container's ownerDocument lazily), but typed input events silently
// stop reaching onChange.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
// Real browsers alias `self` to the window; jsdom doesn't. `next/link`'s
// prefetch-on-idle effect (`request-idle-callback.js`) calls `self.setTimeout`
// unconditionally in its non-native fallback, so without this it throws
// "self is not defined" the first time any `<Link>` mounts.
globalThis.self = dom.window;
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
globalThis.localStorage = dom.window.localStorage;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
globalThis.Event = dom.window.Event;
globalThis.InputEvent = dom.window.InputEvent;
globalThis.MouseEvent = dom.window.MouseEvent;
// Tells React to flush updates synchronously inside act().
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
