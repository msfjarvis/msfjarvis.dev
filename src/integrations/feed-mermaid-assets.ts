import { externalizeFeedMermaidSvgs } from "../lib/feed-mermaid-assets.ts";
import type { AstroIntegration } from "astro";
import { fileURLToPath } from "node:url";

export default function feedMermaidAssets(options: {
  publicDir: string;
  siteUrl: string;
}): AstroIntegration {
  return {
    name: "feed-mermaid-assets",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const count = await externalizeFeedMermaidSvgs(
          fileURLToPath(dir),
          options.publicDir,
          options.siteUrl,
        );
        logger.info(`Externalized ${count} Mermaid feed SVG assets`);
      },
    },
  };
}
