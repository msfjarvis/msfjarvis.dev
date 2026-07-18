import assert from "node:assert/strict";
import { test } from "node:test";
import { markdownToHtml } from "satteri";

import type { CompileOptions } from "satteri";

import {
  githubAlerts,
  legacyTableAlignment,
  remarkSmartypantsCompatibility,
} from "./compatibility.ts";

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
  hastPlugins: [legacyTableAlignment],
};

test("preserves GitHub alert markup", () => {
  const { html } = markdownToHtml("> [!NOTE]\n> Hello **world**.", options);

  assert.match(html, /^<div class="markdown-alert markdown-alert-note" dir="auto">/);
  assert.match(html, /<p class="markdown-alert-title" dir="auto"><svg class="octicon"/);
  assert.match(html, /aria-hidden="true"><path d="[^"]+"><\/path><\/svg>NOTE<\/p>/);
  assert.match(html, /<p>Hello <strong>world<\/strong>\.<\/p>/);
});

test("preserves Remark smartypants behavior", () => {
  const { html } = markdownToHtml("\"Hello *world*.\" -- Wait... . . . ``fine''", options);

  assert.equal(html, "<p>“Hello <em>world</em>.” — Wait… … “fine”</p>\n");
});

test("preserves legacy GFM table alignment attributes", () => {
  const { html } = markdownToHtml("| left | right |\n| :--- | ---: |\n| one | two |", options);

  assert.match(html, /<th align="left">left<\/th>/);
  assert.match(html, /<th align="right">right<\/th>/);
  assert.doesNotMatch(html, /style="text-align:/);
});

test("retains GFM task lists, autolinks, and strikethrough", () => {
  const { html } = markdownToHtml(
    "- [x] done\n- [ ] todo\n\nhttps://example.com and ~~removed~~",
    options,
  );

  assert.match(html, /<ul class="contains-task-list">/);
  assert.match(html, /<input type="checkbox" checked disabled> done/);
  assert.match(html, /<input type="checkbox" disabled> todo/);
  assert.match(html, /<a href="https:\/\/example.com">https:\/\/example.com<\/a>/);
  assert.match(html, /<del>removed<\/del>/);
});
