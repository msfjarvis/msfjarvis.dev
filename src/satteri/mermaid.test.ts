import { concretizeMermaidSvgForFeeds } from "../lib/feed-mermaid.ts";
import {
  feedSitePalette,
  generateSitePaletteCss,
  sitePalette,
} from "../lib/site-palette.ts";
import { mermaidDiagrams } from "./mermaid.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { markdownToHtml } from "satteri";

test("renders Mermaid fences to responsive Pele SVG", () => {
  const { html } = markdownToHtml(
    [
      "```mermaid",
      "flowchart LR",
      "  A[Start] --> B[Finish]",
      "```",
      "",
      "```mermaid",
      "sequenceDiagram",
      "  A->>B: Hello",
      "```",
    ].join("\n"),
    { mdastPlugins: [mermaidDiagrams] },
  );

  assert.equal((html.match(/class="mermaid-diagram"/g) ?? []).length, 2);
  assert.match(html, /<svg[^>]+class="[^"]*pele/);
  assert.match(html, /<svg[^>]+width="\d+" height="\d+"/);
  assert.match(html, /Start/);
  assert.match(html, /Finish/);

  const standaloneSvg = concretizeMermaidSvgForFeeds(
    html.match(/<svg[^>]*>[\s\S]*?<\/svg>/)?.[0] ?? "",
    "dark",
  );
  assert.match(standaloneSvg, /fill="#dddddd"/);
  assert.doesNotMatch(
    standaloneSvg,
    /var\(/,
    "Pele output must not retain CSS variables in standalone SVGs",
  );
});

test("loads Mermaid zoom in the post layout", async () => {
  const { readFile } = await import("node:fs/promises");
  const layout = await readFile(
    new URL("../layouts/PostLayout.astro", import.meta.url),
    "utf8",
  );

  assert.match(layout, /import ["']\.\.\/scripts\/mermaid-zoom\.ts["']/);
});

test("generates light and dark site tokens with the existing system-theme query", () => {
  const css = generateSitePaletteCss();

  for (const [token, value] of Object.entries(sitePalette.light)) {
    assert.ok(css.includes(`--${token}: ${value};`));
  }
  for (const [token, value] of Object.entries(sitePalette.dark)) {
    assert.ok(css.includes(`--${token}: ${value};`));
  }
  assert.match(css, /^:root \{/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)/);
  assert.equal((css.match(/@media/g) ?? []).length, 1);
});

test("uses the site palette for browser and standalone Mermaid colors", () => {
  assert.deepEqual(feedSitePalette, {
    bg: sitePalette.light.bg,
    fg: sitePalette.light.text,
    muted: sitePalette.light["text-2"],
    line: sitePalette.light["text-2"],
    surface: sitePalette.light["bg-subtle"],
    "surface-alt": sitePalette.light["accent-subtle"],
    border: sitePalette.light.border,
    accent: sitePalette.light.accent,
  });

  const svg = concretizeMermaidSvgForFeeds(
    '<svg><rect fill="var(--pele-bg)" stroke="var(--pele-surface-alt)"/><text fill="var(--pele-fg)">label</text></svg>',
  );
  assert.equal(
    svg,
    '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ffffff"/><rect fill="#ffffff" stroke="#e0c8db"/><text fill="#111111">label</text></svg>',
  );
});

test("resolves nested CSS variable fallbacks", () => {
  const svg = concretizeMermaidSvgForFeeds(
    '<svg><rect fill="var(--unknown, var(--pele-accent, red))"/></svg>',
  );
  assert.ok(svg.includes(`fill="${feedSitePalette.accent}"`));
  assert.doesNotMatch(svg, /var\(/);
});

test("keeps Pele-specific fallbacks in Mermaid integration", async () => {
  const { readFile } = await import("node:fs/promises");
  const stylesheet = await readFile(
    new URL("../styles/global.css", import.meta.url),
    "utf8",
  );

  assert.match(stylesheet, /--pele-surface-alt:\s*var\(--accent-subtle\)/);
  assert.match(
    stylesheet,
    /\.mermaid-diagram \.pele-notes \.pele-note rect\s*\{\s*stroke:\s*var\(--accent\);/,
  );
  assert.doesNotMatch(stylesheet, /--pele-fg-on-(?:light|dark)\s*:/);
});

test("leaves non-Mermaid code fences as code blocks", () => {
  const { html } = markdownToHtml("```ts\nconst answer = 42;\n```", {
    mdastPlugins: [mermaidDiagrams],
  });

  assert.match(html, /<pre><code class="language-ts">/);
  assert.doesNotMatch(html, /mermaid-diagram/);
});
