// astro.config.mjs
// @ts-check
import * as fs from "node:fs";

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import icon from "astro-iconset";

import feedDiscovery from "./src/integrations/feed-discovery.ts";
import opengraphImages from "./src/integrations/opengraph-images.ts";
import webmentionsIntegration from "./src/integrations/webmentions.ts";
import satteriMermaid from "./src/remark/satteri-mermaid.ts";

const isDrafts = process.env.INCLUDE_DRAFTS === "true";
const siteUrl = isDrafts ? "https://drafts.msfjarvis.dev" : "https://msfjarvis.dev";
const webmentionWorkerOrigin = process.env.WEBMENTION_WORKER_ORIGIN;
const webmentionAuthToken = process.env.WEBMENTION_AUTH_TOKEN;

const { renderCollectionCard } = await import("./src/og/renderers/collection-card.tsx");

export default defineConfig({
  site: siteUrl,
  output: "server",
  markdown: {
    processor: satteri({
      mdastPlugins: [satteriMermaid()],
      features: {
        gfm: true,
      },
      smartypants: true,
    }),
  },
  integrations: [
    mdx(),
    sitemap(),
    icon({
      include: {
        "simple-icons": ["mastodon", "forgejo"],
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
    plugins: [
      {
        // Sätteri ships a Rust/NAPI binary with a WASM browser fallback that
        // imports @napi-rs/wasm-runtime — a browser-only peer not installed in
        // this project. The Cloudflare adapter sets noExternal:true so Rolldown
        // tries to bundle everything, hitting the unresolvable import.
        // Marking it external is safe: satteri only runs at build time, never
        // in the Cloudflare Worker at runtime.
        // TODO: remove once @astrojs/cloudflare or @astrojs/markdown-satteri
        // handles this automatically (similar to how sharp is already excluded).
        name: "satteri-externals",
        enforce: "post",
        config(cfg) {
          const existing = Array.isArray(cfg.build?.rolldownOptions?.external)
            ? cfg.build.rolldownOptions.external
            : [];
          return {
            build: { rolldownOptions: { external: [...existing, "@napi-rs/wasm-runtime"] } },
          };
        },
      },
    ],
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
