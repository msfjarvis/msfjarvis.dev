import * as cheerio from "cheerio";

const KROKI_BASE_URL = "https://kroki.io";
const REQUEST_TIMEOUT_MS = 15_000;
const CLASS_NAME = "mermaid-diagram";

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

function applyThemeVariables(svg: string): string {
  let themedSvg = svg;

  for (const [from, to] of mermaidColorReplacements) {
    themedSvg = themedSvg.replaceAll(from, to);
    themedSvg = themedSvg.replaceAll(from.toUpperCase(), to);
  }

  return themedSvg;
}

function ensureSvgDocument(svg: string): string {
  const trimmed = svg.trim();
  const $ = cheerio.load(trimmed, {
    xmlMode: true,
    decodeEntities: false,
  });
  const root = $.root().children().toArray();

  if (root.length !== 1) {
    throw new Error("Kroki returned invalid SVG markup");
  }

  const rootElement = root[0];
  if (rootElement.tagName !== "svg" || rootElement.type !== "tag") {
    throw new Error("Kroki returned invalid SVG markup");
  }

  const serialized = $.xml(rootElement);
  const $validated = cheerio.load(serialized, {
    xmlMode: true,
    decodeEntities: false,
  });
  const svgElement = $validated("svg").first();

  if (svgElement.length !== 1) {
    throw new Error("Kroki returned invalid SVG markup");
  }

  const classAttribute = svgElement.attr("class");
  svgElement.attr("class", classAttribute ? `${classAttribute} ${CLASS_NAME}` : CLASS_NAME);
  return $validated.xml(svgElement);
}

function applyThemeToSvg(svg: string): string {
  return applyThemeVariables(svg)
    .replace("<svg ", '<svg style="color-scheme: light dark;" ')
    .replace("</svg>", `<style>${mermaidThemeOverrides}</style></svg>`);
}

export async function renderMermaidDiagram(source: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(KROKI_BASE_URL, {
      method: "POST",
      headers: {
        Accept: "image/svg+xml",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        diagram_source: source,
        diagram_type: "mermaid",
        output_format: "svg",
      }),
      signal: controller.signal,
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(
        `Kroki request failed with ${response.status} ${response.statusText}: ${body.slice(0, 200)}`,
      );
    }

    return applyThemeToSvg(ensureSvgDocument(body));
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Kroki request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
