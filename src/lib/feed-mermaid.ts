import { feedSitePalette, sitePalette } from "./site-palette.ts";

// Pele-only defaults stay here; site colors come from the shared palette.
const mermaidFeedColors: Record<string, string> = {
  ...feedSitePalette,
  "fg-on-light": feedSitePalette.fg,
  "fg-on-dark": "#ffffff",
  critical: feedSitePalette.accent,
  "series-1": "#4c78a8",
  "series-2": "#f58518",
  "series-3": "#54a24b",
  "series-4": "#e45756",
  "series-5": "#72b7b2",
  "series-6": "#eeca3b",
  "series-7": "#b279a2",
  "series-8": "#9d755d",
};

export function concretizeMermaidSvgForFeeds(
  svgHtml: string,
  theme: "light" | "dark" = "light",
): string {
  const colors =
    theme === "light"
      ? mermaidFeedColors
      : {
          ...mermaidFeedColors,
          bg: sitePalette.dark.bg,
          fg: sitePalette.dark.text,
          muted: sitePalette.dark["text-2"],
          line: sitePalette.dark["text-2"],
          surface: sitePalette.dark["bg-subtle"],
          "surface-alt": sitePalette.dark["accent-subtle"],
          border: sitePalette.dark.border,
          accent: sitePalette.dark.accent,
        };
  const variables = new Map(
    Object.entries(colors).map(([name, value]) => [`--pele-${name}`, value]),
  );
  for (const [, name, value] of svgHtml.matchAll(
    /(--_[a-z-]+)\s*:\s*([^;"']+)/g,
  )) {
    variables.set(name, value.trim());
  }

  return normalizeFeedSvg(resolveCssVariables(svgHtml, variables), colors.bg);
}

function resolveCssVariables(
  svg: string,
  variables: Map<string, string>,
): string {
  let result = "";
  let cursor = 0;

  while (cursor < svg.length) {
    const start = svg.indexOf("var(", cursor);
    if (start === -1) {
      result += svg.slice(cursor);
      break;
    }

    result += svg.slice(cursor, start);
    let end = start + 4;
    let depth = 1;
    while (end < svg.length && depth > 0) {
      if (svg[end] === "(") depth++;
      else if (svg[end] === ")") depth--;
      end++;
    }
    if (depth !== 0) {
      result += svg.slice(start);
      break;
    }

    const body = svg.slice(start + 4, end - 1);
    let comma = -1;
    let nestedDepth = 0;
    for (let index = 0; index < body.length; index++) {
      if (body[index] === "(") nestedDepth++;
      else if (body[index] === ")") nestedDepth--;
      else if (body[index] === "," && nestedDepth === 0) {
        comma = index;
        break;
      }
    }

    const name = (comma === -1 ? body : body.slice(0, comma)).trim();
    const fallback = comma === -1 ? undefined : body.slice(comma + 1).trim();
    const value = variables.get(name) ?? fallback;
    if (value === undefined) {
      throw new Error(
        `Cannot resolve CSS variable ${name} in standalone Mermaid SVG`,
      );
    }
    result += resolveCssVariables(value, variables);
    cursor = end;
  }

  return result;
}

export function addMermaidSvgNamespace(svgHtml: string): string {
  return normalizeFeedSvg(svgHtml);
}

function normalizeFeedSvg(svgHtml: string, background?: string): string {
  return svgHtml.replace(/^<svg\b([^>]*)>/, (_root, attributes: string) => {
    const normalizedAttributes = attributes
      .replace(/\s+xmlns=(?:"[^"]*"|'[^']*')/g, "")
      .replace(/\s+/g, " ");
    const openingTag = `<svg${normalizedAttributes} xmlns="http://www.w3.org/2000/svg">`;
    return background
      ? `${openingTag}<rect width="100%" height="100%" fill="${background}"/>`
      : openingTag;
  });
}
