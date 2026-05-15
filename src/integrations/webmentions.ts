import type { AstroIntegration } from "astro";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  diffManifests,
  formatSendSummary,
  parseManifest,
  sendEvents,
} from "../lib/webmentions";

export default function webmentionsIntegration(config: {
  siteUrl: string;
  workerOrigin?: string;
  authToken?: string;
}): AstroIntegration {
  return {
    name: "webmentions",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        if (!config.workerOrigin || !config.authToken) {
          logger.warn("Missing webmentions worker configuration");
          return;
        }

        const outputDir = dir.pathname;
        const manifestPath = path.join(outputDir, "webmentions-manifest.json");
        const builtManifest = parseManifest(JSON.parse(await readFile(manifestPath, "utf8")));

        const deployedResponse = await fetch(new URL("/webmentions-manifest.json", config.siteUrl));
        if (!deployedResponse.ok) {
          throw new Error(
            `Failed to fetch deployed webmentions manifest: ${deployedResponse.status} ${deployedResponse.statusText}`,
          );
        }
        const deployedManifest = parseManifest(await deployedResponse.json());

        const events = diffManifests(deployedManifest, builtManifest);
        if (events.length === 0) {
          logger.info("No webmention send events.");
          return;
        }

        const results = await sendEvents({
          events,
          workerOrigin: config.workerOrigin,
          authToken: config.authToken,
        });
        logger.info(`Webmention send summary:\n${formatSendSummary(results)}`);
      },
    },
  };
}
