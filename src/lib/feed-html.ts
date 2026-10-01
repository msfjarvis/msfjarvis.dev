import { load } from "cheerio";

/**
 * Satteri keeps the original GFM footnotes in an inert template while emitting
 * popovers for the site layout. Feeds have no popover behavior, so restore the
 * original footnote section and remove the hidden popover copies.
 */
export function restoreFootnotesForFeeds(html: string): string {
  const $ = load(html);
  $(".footnote-popover").remove();
  $("a[data-footnote-ref]").attr("aria-describedby", "footnote-label");
  $("template[data-footnotes-fallback]").each((_, template) => {
    const fallbackHtml = $(template).html();
    if (fallbackHtml) $(template).replaceWith(fallbackHtml);
    else $(template).remove();
  });
  return $("body").html() ?? html;
}

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
