import { footnotePopovers } from "../satteri/compatibility.ts";
import {
  restoreFootnotesForFeeds,
  simplifyCodeBlocksForFeeds,
} from "./feed-html.ts";
import { load } from "cheerio";
import assert from "node:assert/strict";
import test from "node:test";
import { markdownToHtml } from "satteri";

test("restores standard GFM footnotes in feed HTML", () => {
  const { html } = markdownToHtml("A note[^1].\n\n[^1]: Definition text.\n", {
    features: { gfm: true },
    hastPlugins: [footnotePopovers],
  });

  const result = load(restoreFootnotesForFeeds(html));
  assert.equal(result(".footnote-popover").length, 0);
  assert.equal(result("template[data-footnotes-fallback]").length, 0);
  assert.equal(result("section[data-footnotes].footnotes").length, 1);
  assert.equal(
    result("#user-content-fn-1").text().trim(),
    "Definition text. ↩",
  );
  assert.equal(
    result("#user-content-fn-1 a[data-footnote-backref]").attr("href"),
    "#user-content-fnref-1",
  );
  assert.equal(
    result('a[href="#user-content-fn-1"]').attr("aria-describedby"),
    "footnote-label",
  );
});

test("simplifies Expressive Code blocks into plain preformatted text", () => {
  const html = `<div class="expressive-code"><figure><pre data-language="kotlin"><code><div class="ec-line"><div class="code"><span>fun</span> main() {</div></div><div class="ec-line"><div class="code"><span class="indent">  </span>println("hi &amp; bye")</div></div><div class="ec-line"><div class="code"></div></div><div class="ec-line"><div class="code">}</div></div></code></pre></figure></div>`;

  const result = load(simplifyCodeBlocksForFeeds(html));
  const $code = result("pre > code");
  assert.equal($code.length, 1);
  assert.equal($code.text(), `fun main() {\n  println("hi & bye")\n\n}`);
  assert.equal($code.attr("class"), "language-kotlin");
  assert.equal(result(".expressive-code").length, 0);
});
