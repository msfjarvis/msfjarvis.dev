import { footnotePopovers } from "../satteri/compatibility.ts";
import {
  restoreFootnotesForFeeds,
  simplifyCodeBlocksForFeeds,
  sizeMediaForFeeds,
} from "./feed-html.ts";
import { load } from "cheerio";
import assert from "node:assert/strict";
import test from "node:test";
import { markdownToHtml } from "satteri";

test("sizes video-focused feed media and preserves standalone scale", () => {
  const html = `<section class="vp-row"><div class="vp-row-media"><figure class="video-player"><video style="zoom: 1"><source src="https://example.com/row.webm" type="video/webm"></video></figure><figure class="half"><img src="image.webp" width="1080" height="2340"></figure></div></section><figure class="video-player"><video width="1080" height="2340" style="zoom: 0.4"><source src="https://example.com/final.webm" type="video/webm"></video></figure>`;
  const $ = load(sizeMediaForFeeds(html, true));
  assert.equal($(".vp-row video").attr("width"), "272");
  assert.equal($(".vp-row img").attr("width"), "272");
  assert.equal($(".vp-row img").attr("height"), undefined);
  assert.equal($(".video-player").last().find("video").attr("width"), "432");
  assert.match($("video").last().attr("style")!, /max-width: 100%/);
  assert.equal(
    $(".video-player").last().find('a[href="https://example.com/final.webm"]').length,
    1,
  );
});

test("sizes regular images without enlarging them", () => {
  const $ = load(
    sizeMediaForFeeds(
      `<figure class="half"><img width="400" height="800" src="x"></figure><img width="100" height="200" src="y">`,
      false,
    ),
  );

  assert.equal($("img").first().attr("width"), "200");
  assert.equal($("img").last().attr("width"), "100");
  assert.match($("img").last().attr("style")!, /height: auto/);
});

test("restores standard GFM footnotes in feed HTML", () => {
  const { html } = markdownToHtml("A note[^1].\n\n[^1]: Definition text.\n", {
    features: { gfm: true },
    hastPlugins: [footnotePopovers],
  });

  const result = load(restoreFootnotesForFeeds(html));
  assert.equal(result(".footnote-popover").length, 0);
  assert.equal(result("template[data-footnotes-fallback]").length, 0);
  assert.equal(result("section[data-footnotes].footnotes").length, 1);
  assert.equal(result("#user-content-fn-1").text().trim(), "Definition text. ↩");
  assert.equal(
    result("#user-content-fn-1 a[data-footnote-backref]").attr("href"),
    "#user-content-fnref-1",
  );
  assert.equal(result('a[href="#user-content-fn-1"]').attr("aria-describedby"), "footnote-label");
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
