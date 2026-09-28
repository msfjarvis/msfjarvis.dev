import { simplifyCodeBlocksForFeeds } from "./feed-html.ts";
import { load } from "cheerio";
import assert from "node:assert/strict";
import test from "node:test";

test("simplifies Expressive Code blocks into plain preformatted text", () => {
  const html = `<div class="expressive-code"><figure><pre data-language="kotlin"><code><div class="ec-line"><div class="code"><span>fun</span> main() {</div></div><div class="ec-line"><div class="code"><span class="indent">  </span>println("hi &amp; bye")</div></div><div class="ec-line"><div class="code"></div></div><div class="ec-line"><div class="code">}</div></div></code></pre></figure></div>`;

  const result = load(simplifyCodeBlocksForFeeds(html));
  const $code = result("pre > code");
  assert.equal($code.length, 1);
  assert.equal($code.text(), `fun main() {\n  println("hi & bye")\n\n}`);
  assert.equal($code.attr("class"), "language-kotlin");
  assert.equal(result(".expressive-code").length, 0);
});
