import { load } from "cheerio";

/** Add portable sizing and video links without relying on the site's stylesheets. */
export function sizeMediaForFeeds(html: string, videoFocused: boolean): string {
  const $ = load(html);
  $("img, video").each((_, element) => {
    const $media = $(element);
    const width = Number($media.attr("width"));
    const inRow = videoFocused && $media.closest(".vp-row-media").length > 0;
    const isVideo = element.tagName === "video";
    const zoom = Number($media.attr("style")?.match(/(?:^|;)\s*zoom:\s*([\d.]+)/)?.[1] ?? 1);
    let targetWidth = Number.isFinite(width) && width > 0 ? width : undefined;

    if (inRow) targetWidth = Math.min(targetWidth ?? 272, 272);
    else if (targetWidth && isVideo && zoom > 0) targetWidth *= zoom;
    else if (targetWidth && $media.closest(".half").length > 0) targetWidth /= 2;

    if (targetWidth) {
      $media.attr("width", String(Math.max(1, Math.round(targetWidth))));

      if (targetWidth !== width) $media.removeAttr("height");
    }

    const existingStyle = ($media.attr("style") ?? "").replace(/(?:^|;)\s*zoom:\s*[^;]*/g, "");
    $media.attr("style", `${existingStyle}; max-width: 100%; height: auto;`);

    if (isVideo) {
      const src = $media.attr("src") || $media.find("source[src]").first().attr("src");

      if (src) {
        const label = $media.attr("aria-label");

        $media.closest("figure").append(
          $("<p>").append(
            $("<a>")
              .attr("href", src)
              .text(label ? `Watch video: ${label}` : "Watch video"),
          ),
        );
      }
    }
  });

  return $("body").html() ?? html;
}

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
