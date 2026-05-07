import type { AstroIntegration } from "astro";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const VIRTUAL_MODULE_ID = "virtual:site-feeds";
const RESOLVED_ID = "\0" + VIRTUAL_MODULE_ID;

/**
 * Recursively find all files named `[format].ts` or `[format].js`
 * under `dir`. Returns absolute paths.
 */
function findFormatFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFormatFiles(full));
    } else if (entry.name === "[format].ts" || entry.name === "[format].js") {
      results.push(full);
    }
  }
  return results;
}

/**
 * Astro integration that exposes `virtual:site-feeds`.
 *
 * When the virtual module is loaded, it:
 *   1. Imports every `[format].ts` file found under `src/pages/` — these
 *      are side-effect-only imports that trigger `createFeedEndpoint`
 *      registration into the module-level `_feedRegistry` in `feed.ts`.
 *   2. Calls `getRegisteredFeeds()` and exports the result as `feeds`.
 *
 * Usage in astro.config.mjs:
 *   import feedDiscovery from './src/integrations/feed-discovery.ts';
 *   integrations: [mdx(), sitemap(), feedDiscovery()]
 *
 * Usage in a page:
 *   import { feeds } from 'virtual:site-feeds';
 */
export default function feedDiscovery(): AstroIntegration {
  let projectRoot: string;

  return {
    name: "feed-discovery",
    hooks: {
      "astro:config:setup": ({ config, updateConfig }) => {
        projectRoot = fileURLToPath(config.root);

        updateConfig({
          vite: {
            plugins: [
              {
                name: "vite-plugin-site-feeds",

                resolveId(id: string) {
                  if (id === VIRTUAL_MODULE_ID) return RESOLVED_ID;
                },

                load(id: string) {
                  if (id !== RESOLVED_ID) return;

                  const pagesDir = path.join(projectRoot, "src", "pages");
                  const feedFiles = findFormatFiles(pagesDir);

                  const sideEffectImports = feedFiles
                    .map((f) => `import ${JSON.stringify(f)};`)
                    .join("\n");

                  const feedTsPath = path.join(
                    projectRoot,
                    "src",
                    "lib",
                    "feed.ts",
                  );

                  return [
                    sideEffectImports,
                    `import { getRegisteredFeeds } from ${JSON.stringify(feedTsPath)};`,
                    `export const feeds = getRegisteredFeeds();`,
                  ].join("\n");
                },
              },
            ],
          },
        });
      },
    },
  };
}
