import { mermaidLightbox } from "./mermaid-lightbox.ts";
import { mermaidOptions } from "./mermaid-theme.ts";
import { mermaidHast, mermaidMdast } from "@xingwangzhe/satteri-mermaid";
import assert from "node:assert/strict";
import { test } from "node:test";
import { mdxToJs } from "satteri";

const options = {
  mdastPlugins: [mermaidMdast()],
  hastPlugins: [mermaidHast(mermaidOptions), mermaidLightbox],
  fileURL: new URL("file:///tmp/example.mdx"),
};

test("adds the lightbox and theme styles to Mermaid diagrams in MDX", async () => {
  const { code } = await mdxToJs(
    ["```mermaid", "sequenceDiagram", "  A->>B: hello", "```"].join("\n"),
    options,
  );

  assert.match(code, /data-mermaid-modal-trigger/);
  assert.match(code, /Expand diagram/);
  assert.match(code, /data-mermaid-modal-container/);
  assert.match(code, /var\(--text\)/);
  assert.doesNotMatch(code, /#ECECFF|#eaeaea/);
});

test("fails MDX when the Mermaid extension cannot render a diagram", async () => {
  await assert.rejects(
    async () =>
      mdxToJs(["```mermaid", "not a diagram", "```"].join("\n"), options),
    /Merman render failed: No diagram type detected/,
  );
});

test("leaves non-Mermaid code blocks unchanged in MDX", async () => {
  const { code } = await mdxToJs(
    ["```text", "flowchart LR", "```"].join("\n"),
    options,
  );

  assert.match(code, /flowchart LR/);
  assert.doesNotMatch(code, /data-mermaid-modal-trigger/);
});
