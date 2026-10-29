import { feedSitePalette } from "./site-palette.ts";

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

export function concretizeMermaidSvgForFeeds(svgHtml: string): string {
  const svg = svgHtml.replace(
    /var\(--pele-([a-z-]+)(?:,([^)]*))?\)/g,
    (variable, name, fallback: string | undefined) =>
      mermaidFeedColors[name] ?? fallback ?? variable,
  );
  return svg.replace(/^<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"');
}
