import {
  footnotePopovers,
  githubAlerts,
  legacyTableAlignment,
  remarkSmartypantsCompatibility,
} from "./compatibility.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { markdownToHtml } from "satteri";
import type { CompileOptions } from "satteri";

const options: CompileOptions = {
  features: {
    gfm: true,
    smartPunctuation: {
      quotes: true,
      dashes: false,
      ellipses: true,
    },
  },
  mdastPlugins: [remarkSmartypantsCompatibility, githubAlerts],
  hastPlugins: [footnotePopovers, legacyTableAlignment],
};

test("preserves GitHub alert markup", async () => {
  const { html } = await markdownToHtml(
    "> [!NOTE]\n> Hello **world**.",
    options,
  );

  assert.match(
    html,
    /^<div class="markdown-alert markdown-alert-note" dir="auto">/,
  );
  assert.match(
    html,
    /<p class="markdown-alert-title" dir="auto"><svg class="octicon"/,
  );
  assert.match(
    html,
    /aria-hidden="true"><path d="[^"]+"><\/path><\/svg>NOTE<\/p>/,
  );
  assert.match(html, /<p>Hello <strong>world<\/strong>\.<\/p>/);
});

test("preserves Remark smartypants behavior", async () => {
  const { html } = await markdownToHtml(
    "\"Hello *world*.\" -- Wait... . . . ``fine''",
    options,
  );

  assert.equal(html, "<p>“Hello <em>world</em>.” — Wait… … “fine”</p>\n");
});

test("preserves legacy GFM table alignment attributes", async () => {
  const { html } = await markdownToHtml(
    "| left | right |\n| :--- | ---: |\n| one | two |",
    options,
  );

  assert.match(html, /<th align="left">left<\/th>/);
  assert.match(html, /<th align="right">right<\/th>/);
  assert.doesNotMatch(html, /style="text-align:/);
});

test("renders static popovers and keeps an inert footnote fallback", async () => {
  const { html } = await markdownToHtml(
    "A note[^1] and another reference[^1].\n\n[^1]: Definition with **bold** text.\n",
    options,
  );

  assert.equal((html.match(/class="footnote-popover"/g) ?? []).length, 2);
  assert.match(html, /aria-describedby="footnote-popover-1"/);
  assert.match(html, /id="footnote-popover-1" role="tooltip"/);
  assert.match(html, /<strong>bold<\/strong> text\.\s*<\/p>\s*<\/div>/);
  assert.match(
    html,
    /<template data-footnotes-fallback><section data-footnotes/,
  );
  const popoverContents = [
    ...html.matchAll(/<div class="footnote-popover"[^>]*>([\s\S]*?)<\/div>/g),
  ].map(([, content]) => content ?? "");
  assert.equal(popoverContents.length, 2);
  for (const content of popoverContents) {
    assert.doesNotMatch(content, /data-footnote-backref/);
  }
  assert.match(html, /id="footnote-popover-2"/);
});

test("retains GFM task lists, autolinks, and strikethrough", async () => {
  const { html } = await markdownToHtml(
    "- [x] done\n- [ ] todo\n\nhttps://example.com and ~~removed~~",
    options,
  );

  assert.match(html, /<ul class="contains-task-list">/);
  assert.match(html, /<input type="checkbox" checked disabled> done/);
  assert.match(html, /<input type="checkbox" disabled> todo/);
  assert.match(
    html,
    /<a href="https:\/\/example.com">https:\/\/example.com<\/a>/,
  );
  assert.match(html, /<del>removed<\/del>/);
});
