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
});

test("loads Mermaid zoom in the post layout", async () => {
  const { readFile } = await import("node:fs/promises");
  const layout = await readFile(
    new URL("../layouts/PostLayout.astro", import.meta.url),
    "utf8",
  );

  assert.match(layout, /import ["']\.\.\/scripts\/mermaid-zoom\.ts["']/);
});

test("uses the site accent palette for Pele sequence-note fills", async () => {
  const { readFile } = await import("node:fs/promises");
  const stylesheet = await readFile(
    new URL("../styles/global.css", import.meta.url),
    "utf8",
  );

  assert.match(stylesheet, /--pele-surface-alt:\s*var\(--accent-subtle\)/);
  assert.match(stylesheet, /--accent-subtle:\s*#e0c8db/);
  assert.match(stylesheet, /--accent-subtle:\s*#4a2a45/);
  assert.match(
    stylesheet,
    /\.mermaid-diagram \.pele-notes \.pele-note rect\s*\{\s*stroke:\s*var\(--accent\);/,
  );

  const feed = await readFile(
    new URL("../lib/feed.ts", import.meta.url),
    "utf8",
  );
  assert.match(feed, /"surface-alt":\s*"#e0c8db"/);
});

test("uses Pele defaults for text on source-defined diagram fills", async () => {
  const { readFile } = await import("node:fs/promises");
  const stylesheet = await readFile(
    new URL("../styles/global.css", import.meta.url),
    "utf8",
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
