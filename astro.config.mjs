// astro.config.mjs
// @ts-check
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import cloudflare from "@astrojs/cloudflare";
import icon from "astro-iconset";
import feedDiscovery from "./src/integrations/feed-discovery.ts";
import webmentionsIntegration from "./src/integrations/webmentions.ts";

const isDrafts = process.env.INCLUDE_DRAFTS === "true";
const siteUrl = isDrafts ? "https://drafts.msfjarvis.dev" : "https://msfjarvis.dev";
const webmentionWorkerOrigin = process.env.WEBMENTION_WORKER_ORIGIN;
const webmentionAuthToken = process.env.WEBMENTION_AUTH_TOKEN;

export default defineConfig({
  site: siteUrl,
  output: "server",
  integrations: [
    mdx(),
    sitemap(),
    icon({
      include: {
        "simple-icons": ["mastodon", "forgejo", "reddit"],
      },
    }),
    feedDiscovery(),
    webmentionsIntegration({
      siteUrl,
      workerOrigin: webmentionWorkerOrigin,
      authToken: webmentionAuthToken,
    }),
  ],
  adapter: cloudflare({
    imageService: "compile",
  }),
  vite: {
    server: {
      watch: {
        ignored: ["**/.direnv/**", "**/node_modules/**"],
      },
    },
  },
});
