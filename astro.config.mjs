// astro.config.mjs
// @ts-check
import * as fs from "node:fs";

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import icon from "astro-iconset";

import feedDiscovery from "./src/integrations/feed-discovery.ts";
import opengraphImages from "./src/integrations/opengraph-images.ts";
import webmentionsIntegration from "./src/integrations/webmentions.ts";
import remarkMermaid from "./src/remark/remark-mermaid.ts";

const isDrafts = process.env.INCLUDE_DRAFTS === "true";
const siteUrl = isDrafts ? "https://drafts.msfjarvis.dev" : "https://msfjarvis.dev";
const webmentionWorkerOrigin = process.env.WEBMENTION_WORKER_ORIGIN;
const webmentionAuthToken = process.env.WEBMENTION_AUTH_TOKEN;

const { renderCollectionCard } = await import("./src/og/renderers/collection-card.tsx");

export default defineConfig({
  site: siteUrl,
  output: "server",
  markdown: {
    processor: unified({
      gfm: true,
      smartypants: true,
      remarkPlugins: [remarkMermaid],
    }),
  },
  integrations: [
    mdx({
      remarkPlugins: [remarkMermaid],
    }),
    sitemap(),
    icon({
      include: {
        "simple-icons": ["mastodon", "forgejo", "reddit"],
      },
    }),
    opengraphImages({
      matchPathname: (pathname) => /^(posts|notes|weeknotes)\/[^/]+\/$/.test(pathname),
      options: {
        verbose: false,
        fonts: [
          {
            name: "JetBrains Mono",
            weight: 600,
            style: "normal",
            data: fs.readFileSync(
              "node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff",
            ),
          },
          {
            name: "Inter",
            weight: 400,
            style: "normal",
            data: fs.readFileSync(
              "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff",
            ),
          },
          {
            name: "Inter",
            weight: 600,
            style: "normal",
            data: fs.readFileSync(
              "node_modules/@fontsource/inter/files/inter-latin-600-normal.woff",
            ),
          },
        ],
      },
      render: renderCollectionCard,
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
    prerenderEnvironment: "workerd",
  }),
  vite: {
    ssr: {
      external: ["@resvg/resvg-js", "mermaid"],
    },
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
    server: {
      watch: {
        ignored: ["**/.direnv/**", "**/node_modules/**"],
      },
    },
  },
});
