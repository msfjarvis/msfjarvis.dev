import assert from "node:assert/strict";
import { test } from "node:test";
import { mermaidHast, mermaidMdast } from "@xingwangzhe/satteri-mermaid";
import { markdownToHtml } from "satteri";

import { mermaidLightbox } from "./mermaid-lightbox.ts";
import { mermaidOptions } from "./mermaid-theme.ts";

const options = {
  mdastPlugins: [mermaidMdast()],
  hastPlugins: [mermaidHast(mermaidOptions), mermaidLightbox],
  fileURL: new URL("file:///tmp/example.mdx"),
};

test("renders Mermaid through Satteri while preserving the lightbox contract", async () => {
  const { html } = await markdownToHtml("```mermaid\nflowchart LR\n  A --> B\n```", options);

  assert.match(html, /<div data-mermaid-modal-root(?:="")? class="mermaid-modal">/);
  assert.match(html, /class="[^"]*mermaid-diagram[^"]*"/);
  assert.match(html, /var\(--bg\)/);
  assert.match(html, /data-mermaid-modal-trigger/);
  assert.match(html, /data-mermaid-modal-close/);
  assert.match(html, /aria-label="Expanded Mermaid diagram from example\.mdx"/);
  assert.match(html, /<script>/);
  assert.match(html, /marker-end=/);
  assert.match(html, /dominant-baseline=/);
  assert.match(html, /xmlns:xlink=/);
  assert.doesNotMatch(
    html,
    /markerEnd=|strokeWidth=|textAnchor=|dominantBaseline=|fillRule=|xmlnsXlink=/,
  );
  assert.equal(html.match(/<svg\b/g)?.length, 2);
  assert.doesNotMatch(html, /&lt;svg/);
  assert.doesNotMatch(html, /<pre class="mermaid">/);
});

test("fails the document when the Mermaid extension falls back to source", async () => {
  await assert.rejects(
    async () => markdownToHtml("```mermaid\nnot a diagram\n```", options),
    /Failed to render Mermaid diagram in \/tmp\/example\.mdx/,
  );
});

test("leaves non-Mermaid code blocks unchanged", async () => {
  const { html } = await markdownToHtml("```text\nflowchart LR\n```", options);

  assert.equal(html, '<pre><code class="language-text">flowchart LR\n</code></pre>\n');
});
