import { load } from "cheerio";

/**
 * Expressive Code renders each source line as a nested div and relies on its
 * stylesheet to lay those divs out as code. Feed readers generally omit that
 * stylesheet, so collapse its markup to semantic pre/code HTML with explicit
 * line breaks instead.
 */
export function simplifyCodeBlocksForFeeds(html: string): string {
  const $ = load(html);
  $(".expressive-code pre[data-language]").each((_, pre) => {
    const $pre = $(pre);
    const code = $pre
      .find(".ec-line")
      .map((_, line) => $(line).text())
      .get()
      .join("\n");
    const language = $pre.attr("data-language");
    const $code = $("<code>").text(code);
    if (language) $code.addClass(`language-${language}`);
    const $plainPre = $("<pre>").append($code);
    const $container = $pre.closest(".expressive-code");
    if ($container.length > 0) $container.replaceWith($plainPre);
    else $pre.replaceWith($plainPre);
  });
  return $("body").html() ?? html;
}
