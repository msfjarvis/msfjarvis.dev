// astro.config.mjs
// @ts-check
import feedDiscovery from "./src/integrations/feed-discovery.ts";
import feedMermaidAssets from "./src/integrations/feed-mermaid-assets.ts";
import opengraphImages from "./src/integrations/opengraph-images.ts";
import pagefind from "./src/integrations/pagefind.ts";
import webmentionsIntegration from "./src/integrations/webmentions.ts";
import {
  footnotePopovers,
  githubAlerts,
  legacyTableAlignment,
  remarkSmartypantsCompatibility,
} from "./src/satteri/compatibility.ts";
import { mermaidDiagrams } from "./src/satteri/mermaid.ts";
import cloudflare from "@astrojs/cloudflare";
import { satteri } from "@astrojs/markdown-satteri";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { photoswipe } from "@xingwangzhe/satteri-photoswipe";
import expressiveCode from "astro-expressive-code";
import icon from "astro-iconset";
import { defineConfig } from "astro/config";
import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const isDrafts = process.env.INCLUDE_DRAFTS === "true";
const siteUrl = isDrafts ? "https://drafts.msfjarvis.dev" : "https://msfjarvis.dev";
const wranglerConfigPath = process.env.WRANGLER_CONFIG_PATH;
const webmentionWorkerOrigin = process.env.WEBMENTION_WORKER_ORIGIN;
const webmentionAuthToken = process.env.WEBMENTION_AUTH_TOKEN;

const { renderCollectionCard } = await import("./src/og/renderers/collection-card-split.tsx");

// Reuse Astro's Vite dependency rather than adding a separate bundler dependency.
const { build: buildVite } = createRequire(import.meta.resolve("astro"))("vite");

const markdownProcessor = satteri({
  features: {
    gfm: true,
    rawHtml: true,
    smartPunctuation: {
      quotes: true,
      dashes: false,
      ellipses: true,
    },
  },
  mdastPlugins: [remarkSmartypantsCompatibility, githubAlerts, mermaidDiagrams],
  hastPlugins: [footnotePopovers, legacyTableAlignment, photoswipe()],
});

export default defineConfig({
  site: siteUrl,
  output: "server",
  image: {},
  session: false,
  experimental: {
    incrementalBuild: true,
  },
  markdown: {
    processor: markdownProcessor,
  },
  integrations: [
    expressiveCode({
      themes: ["catppuccin-latte", "material-theme-darker"],
      shiki: {
        bundledLangs: [
          "astro",
          "bash",
          "diff",
          "groovy",
          "html",
          "javascript",
          "js",
          "json",
          "kotlin",
          "shell",
          "ts",
          "tsx",
          "typescript",
        ],
      },
    }),
    mdx(),
    sitemap(),
    pagefind(),
    {
      name: "cms-admin-build",
      hooks: {
        "astro:build:done": async ({ dir }) => {
          await buildVite({
            configFile: false,
            root: process.cwd(),
            build: {
              outDir: fileURLToPath(dir),
              emptyOutDir: false,
              rollupOptions: {
                input: path.resolve("src/cms/admin.ts"),
                output: { entryFileNames: "admin.js" },
              },
            },
          });
        },
      },
    },
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
    feedMermaidAssets({
      publicDir: fileURLToPath(new URL("./public", import.meta.url)),
      siteUrl,
    }),
    webmentionsIntegration({
      siteUrl,
      workerOrigin: webmentionWorkerOrigin,
      authToken: webmentionAuthToken,
    }),
  ],
  adapter: cloudflare({
    configPath: wranglerConfigPath,
    imageService: "compile",
    prerenderEnvironment: "workerd",
  }),
  vite: {
    plugins: [
      {
        name: "cms-admin-dev-entry",
        configureServer(server) {
          server.middlewares.use((request, _response, next) => {
            if (request.url === "/admin.js") {
              request.url = "/src/cms/admin.ts";
            }

            next();
          });
        },
      },
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
            build: {
              rolldownOptions: {
                external: [...existing, "@napi-rs/wasm-runtime", "@bruits/satteri-wasm32-wasi"],
              },
            },
          };
        },
      },
    ],
    ssr: {
      external: ["@resvg/resvg-js"],
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
