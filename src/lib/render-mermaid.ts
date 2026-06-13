import { createRequire } from "node:module";

import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);

let mermaidModule: typeof import("mermaid") | undefined;
let isInitialized = false;
let nextId = 0;

const mermaidThemeOverrides = `
  .actor,
  .labelBox,
  .node rect,
  .node polygon,
  .node circle,
  .cluster rect,
  .section,
  .task,
  .taskTextOutsideRight,
  .taskTextOutsideLeft {
    fill: var(--bg-subtle) !important;
    stroke: var(--border) !important;
  }

  .note {
    fill: var(--accent-subtle) !important;
    stroke: var(--accent) !important;
  }

  .actor-line,
  .messageLine0,
  .messageLine1,
  .loopLine,
  .edgePath .path,
  .flowchart-link,
  .marker,
  .marker path,
  [id$="-arrowhead"] path,
  [id$="-filled-head"] path,
  [id$="-crosshead"] path,
  [id$="-stickTopArrowHead"] path,
  [id$="-stickBottomArrowHead"] path,
  [id$="-solidTopArrowHead"] path,
  [id$="-solidBottomArrowHead"] path {
    stroke: var(--text-2) !important;
    fill: var(--text-2) !important;
  }

  .messageText,
  .labelText,
  .labelText tspan,
  .loopText,
  .loopText tspan,
  .noteText,
  .noteText tspan,
  .actor-box,
  .actor-box tspan,
  .sectionTitle,
  .sectionTitle tspan,
  text,
  tspan {
    fill: var(--text) !important;
    stroke: none !important;
  }

  .activation0,
  .activation1,
  .activation2,
  .sequenceNumber {
    fill: var(--bg) !important;
    stroke: var(--border) !important;
  }
`;

const mermaidColorReplacements: Array<[string, string]> = [
  ["#ffffff", "var(--bg)"],
  ["#fff", "var(--bg)"],
  ["#f7f7f7", "var(--bg-subtle)"],
  ["#eaeaea", "var(--bg-subtle)"],
  ["#ececff", "var(--bg-subtle)"],
  ["#e8e8e8", "var(--border)"],
  ["#666666", "var(--text-2)"],
  ["#666", "var(--text-2)"],
  ["#111111", "var(--text)"],
  ["#000000", "var(--text)"],
  ["black", "var(--text)"],
  ["#444444", "var(--text-2)"],
  ["#333333", "var(--text-2)"],
  ["#333", "var(--text-2)"],
  ["#999", "var(--border)"],
  ["#e0c8db", "var(--accent-subtle)"],
  ["#7a3d6e", "var(--accent)"],
  ["#9370DB", "var(--accent)"],
  ["#ECECFF", "var(--bg-subtle)"],
  ["#aaaa33", "var(--accent)"],
  ["#fff5ad", "var(--accent-subtle)"],
];

function applyThemeVariables(svg: string): string {
  let themedSvg = svg;

  for (const [from, to] of mermaidColorReplacements) {
    themedSvg = themedSvg.replaceAll(from, to);
    themedSvg = themedSvg.replaceAll(from.toUpperCase(), to);
  }

  return themedSvg;
}

function ensureDom() {
  if (typeof globalThis.window !== "undefined" && typeof globalThis.document !== "undefined") {
    return;
  }

  const { window: jsdomWindow } = new JSDOM("<body></body>", {
    pretendToBeVisual: true,
  });

  globalThis.window = jsdomWindow;
  globalThis.document = jsdomWindow.document as typeof globalThis.document;
  globalThis.HTMLElement = jsdomWindow.HTMLElement;
  globalThis.SVGElement = jsdomWindow.SVGElement;
  globalThis.Element = jsdomWindow.Element;
  globalThis.Node = jsdomWindow.Node;
  globalThis.DOMParser = jsdomWindow.DOMParser;
  globalThis.XMLSerializer = jsdomWindow.XMLSerializer;
  globalThis.CSSStyleSheet = jsdomWindow.CSSStyleSheet;
  Object.defineProperty(globalThis, "navigator", {
    value: jsdomWindow.navigator,
    configurable: true,
  });
  Object.defineProperty(globalThis, "getComputedStyle", {
    value: jsdomWindow.getComputedStyle.bind(jsdomWindow),
    configurable: true,
  });
  if (!jsdomWindow.SVGElement.prototype.getBBox) {
    jsdomWindow.SVGElement.prototype.getBBox = function getBBox() {
      const text = this.textContent ?? "";
      const width = Math.max(text.length * 8, 16);
      return { x: 0, y: 0, width, height: 16 };
    };
  }

  if (!jsdomWindow.SVGElement.prototype.getComputedTextLength) {
    jsdomWindow.SVGElement.prototype.getComputedTextLength = function getComputedTextLength() {
      const text = this.textContent ?? "";
      return Math.max(text.length * 8, 16);
    };
  }

  const domPurify = {
    sanitize: (value: string) => value,
    addHook: () => {},
    removeHook: () => {},
  };

  globalThis.DOMPurify = domPurify;
  jsdomWindow.DOMPurify = domPurify;
}

function ensureInitialized() {
  if (isInitialized) return;

  ensureDom();
  mermaidModule ??= require("mermaid");
  mermaidModule.default.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif",
    themeVariables: {
      background: "#ffffff",
      primaryColor: "#f7f7f7",
      primaryTextColor: "#111111",
      primaryBorderColor: "#e8e8e8",
      secondaryColor: "#e0c8db",
      secondaryTextColor: "#111111",
      secondaryBorderColor: "#7a3d6e",
      tertiaryColor: "#ffffff",
      tertiaryTextColor: "#444444",
      tertiaryBorderColor: "#e8e8e8",
      lineColor: "#444444",
      textColor: "#111111",
      mainBkg: "#f7f7f7",
      secondBkg: "#e0c8db",
      tertiaryBkg: "#ffffff",
      actorBkg: "#f7f7f7",
      actorBorder: "#e8e8e8",
      actorTextColor: "#111111",
      actorLineColor: "#e8e8e8",
      signalColor: "#111111",
      signalTextColor: "#111111",
      labelBoxBkgColor: "#f7f7f7",
      labelBoxBorderColor: "#e8e8e8",
      labelTextColor: "#111111",
      loopTextColor: "#111111",
      noteBkgColor: "#e0c8db",
      noteBorderColor: "#7a3d6e",
      noteTextColor: "#111111",
      activationBorderColor: "#e8e8e8",
      activationBkgColor: "#ffffff",
      sequenceNumberColor: "#ffffff",
      sequenceNumberTextColor: "#111111",
    },
  });
  isInitialized = true;
}

export async function renderMermaidDiagram(source: string): Promise<string> {
  ensureInitialized();
  const id = `mermaid-diagram-${nextId++}`;
  const { svg } = await mermaidModule!.default.render(id, source);
  return applyThemeVariables(svg)
    .replace("<svg ", '<svg class="mermaid-diagram" ')
    .replace("</svg>", `<style>${mermaidThemeOverrides}</style></svg>`);
}
