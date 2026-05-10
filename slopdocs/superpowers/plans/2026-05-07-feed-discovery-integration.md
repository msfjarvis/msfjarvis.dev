# Feed Discovery Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `feedDiscovery` Astro integration that auto-discovers all feeds via a build-time registry populated by `createFeedEndpoint` side-effects, exposes them through `virtual:site-feeds`, and wires the home page to advertise all feeds.

**Architecture:** `createFeedEndpoint` pushes `AlternateFeed` entries into a module-level registry in `feed.ts` as a side effect. A Vite plugin inside the Astro integration provides `virtual:site-feeds` — when loaded, it recursively finds every `[format].ts` file under `src/pages/`, imports them (triggering registration), then exports `getRegisteredFeeds()`. The home page (made prerendered) imports this and passes the feed list to `BaseLayout`. `BaseHead` deduplicates against its three hardcoded global links.

**Tech Stack:** Astro 6, Vite (Astro's bundler), Node 24 (`fs.readdirSync` for file discovery), TypeScript

---

## File Map

| Action | Path                                 | Responsibility                                                                |
| ------ | ------------------------------------ | ----------------------------------------------------------------------------- |
| Modify | `src/lib/feed.ts`                    | Add registry, lookup tables, registration side-effect in `createFeedEndpoint` |
| Create | `src/integrations/feed-discovery.ts` | Astro integration + Vite plugin providing `virtual:site-feeds`                |
| Create | `src/env.d.ts`                       | Virtual module type declaration                                               |
| Modify | `astro.config.mjs`                   | Register `feedDiscovery()` integration                                        |
| Modify | `src/components/BaseHead.astro`      | Deduplicate `alternateFeeds` against hardcoded hrefs                          |
| Modify | `src/pages/index.astro`              | Prerender, import feeds, pass to `BaseLayout`                                 |

---

## Task 1: Add feed registry to `src/lib/feed.ts`

**Files:**

- Modify: `src/lib/feed.ts`

- [ ] **Step 1: Add `FORMAT_MIME_TYPES` and `FORMAT_LABELS` lookup tables**

In `src/lib/feed.ts`, directly after the `const FEED_SERIALIZERS` declaration, add:

```ts
const FORMAT_MIME_TYPES: Record<FeedFormat, string> = {
  "rss.xml": "application/rss+xml",
  "atom.xml": "application/atom+xml",
  "feed.json": "application/feed+json",
};

const FORMAT_LABELS: Record<FeedFormat, string> = {
  "rss.xml": "RSS",
  "atom.xml": "Atom",
  "feed.json": "JSON Feed",
};
```

- [ ] **Step 2: Add the module-level registry and `getRegisteredFeeds` export**

After the `FORMAT_LABELS` block, add:

```ts
/** Module-level registry populated by createFeedEndpoint side-effects. */
const _feedRegistry: AlternateFeed[] = [];

/**
 * Return all feeds registered by createFeedEndpoint calls in this process.
 * Used by the feed-discovery integration's virtual module.
 */
export function getRegisteredFeeds(): AlternateFeed[] {
  return [..._feedRegistry];
}
```

- [ ] **Step 3: Register feeds inside `createFeedEndpoint`**

In `createFeedEndpoint`, find the `return {` line that begins the returned object. Insert the registration loop immediately before it:

```ts
  // Register all format variants into the discovery registry.
  for (const format of Object.keys(FEED_SERIALIZERS) as FeedFormat[]) {
    _feedRegistry.push({
      type:  FORMAT_MIME_TYPES[format],
      title: `${config.title} — ${FORMAT_LABELS[format]}`,
      href:  config.selfPath(format),
    });
  }

  return {
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev && npx tsc --noEmit 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev
git add src/lib/feed.ts
git commit -m "feat: add feed registry to createFeedEndpoint for discovery integration"
```

---

## Task 2: Create the `feedDiscovery` Astro integration

**Files:**

- Create: `src/integrations/feed-discovery.ts`

- [ ] **Step 1: Create the integration file**

Write `src/integrations/feed-discovery.ts` with this complete content:

```ts
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
 *   integrations: [feedDiscovery()]
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

                  const feedTsPath = path.join(projectRoot, "src", "lib", "feed.ts");

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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev && npx tsc --noEmit 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev
git add src/integrations/feed-discovery.ts
git commit -m "feat: add feedDiscovery Astro integration with virtual:site-feeds"
```

---

## Task 3: Add virtual module type declaration and wire up `astro.config.mjs`

**Files:**

- Create: `src/env.d.ts`
- Modify: `astro.config.mjs`

- [ ] **Step 1: Create `src/env.d.ts`**

```ts
/// <reference types="astro/client" />

declare module "virtual:site-feeds" {
  import type { AlternateFeed } from "./consts";
  export const feeds: AlternateFeed[];
}
```

- [ ] **Step 2: Add `feedDiscovery` to `astro.config.mjs`**

In `astro.config.mjs`, add the import at the top (after existing imports):

```js
import feedDiscovery from "./src/integrations/feed-discovery.ts";
```

Then add `feedDiscovery()` to the `integrations` array:

```js
integrations: [mdx(), sitemap(), feedDiscovery()],
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev && npx tsc --noEmit 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev
git add src/env.d.ts astro.config.mjs
git commit -m "feat: register feedDiscovery integration and declare virtual:site-feeds type"
```

---

## Task 4: Deduplicate `alternateFeeds` in `BaseHead.astro`

**Files:**

- Modify: `src/components/BaseHead.astro`

The three hardcoded global links use hrefs `/rss.xml`, `/atom.xml`, `/feed.json`. When the home page passes all registry feeds via `alternateFeeds`, those three will duplicate. Filter them out in `BaseHead`.

- [ ] **Step 1: Update the `alternateFeeds` render block**

In `src/components/BaseHead.astro`, find:

```astro
{alternateFeeds?.map(f => (
  <link rel="alternate" type={f.type} title={f.title} href={new URL(f.href, Astro.site)} />
))}
```

Replace with:

```astro
{alternateFeeds
  ?.filter(f => f.href !== '/rss.xml' && f.href !== '/atom.xml' && f.href !== '/feed.json')
  .map(f => (
    <link rel="alternate" type={f.type} title={f.title} href={new URL(f.href, Astro.site)} />
  ))
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev && npx tsc --noEmit 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev
git add src/components/BaseHead.astro
git commit -m "feat: deduplicate alternateFeeds against hardcoded global feed links in BaseHead"
```

---

## Task 5: Wire the home page to `virtual:site-feeds`

**Files:**

- Modify: `src/pages/index.astro`

- [ ] **Step 1: Add `prerender`, import feeds, pass to `BaseLayout`**

In `src/pages/index.astro`, the current frontmatter starts with:

```ts
---
import { getCollection } from 'astro:content';
import FormattedDate from '../components/FormattedDate.astro';
import BaseLayout from '../layouts/BaseLayout.astro';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { filterDrafts } from '../utils';
```

Replace with:

```ts
---
import { getCollection } from 'astro:content';
import FormattedDate from '../components/FormattedDate.astro';
import BaseLayout from '../layouts/BaseLayout.astro';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { filterDrafts } from '../utils';
import { feeds } from 'virtual:site-feeds';

export const prerender = true;
```

Then find the `<BaseLayout>` opening tag:

```astro
<BaseLayout title={SITE_TITLE} description={SITE_DESCRIPTION}>
```

Replace with:

```astro
<BaseLayout title={SITE_TITLE} description={SITE_DESCRIPTION} alternateFeeds={feeds}>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev && npx tsc --noEmit 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev
git add src/pages/index.astro
git commit -m "feat: wire home page to virtual:site-feeds for full feed discovery"
```

---

## Task 6: Build verification

**Files:** (no source changes — verification only)

- [ ] **Step 1: Run the build**

```bash
cd /Users/msfjarvis/git-repos/msfjarvis.dev && XDG_CONFIG_HOME=/tmp/xdg-config npm run build 2>&1 | tail -20
```

Expected: build succeeds with 0 errors. The home page (`/`) should appear in the prerendered output.

- [ ] **Step 2: Verify the home page is now statically generated**

```bash
ls dist/client/index.html
```

Expected: file exists (home page is now prerendered).

- [ ] **Step 3: Verify all 9 feed links appear on the home page**

```bash
grep 'rel="alternate"' dist/client/index.html
```

Expected: exactly 9 `<link rel="alternate">` lines — one for each of the 9 feeds across all three collections and all three formats. No duplicates.

- [ ] **Step 4: Verify the exact set of hrefs**

```bash
grep -oP 'href="[^"]+"' dist/client/index.html | grep alternate -A1 || \
grep 'rel="alternate"' dist/client/index.html | grep -oP 'href="[^"]+"'
```

Run instead:

```bash
node -e "
const html = require('fs').readFileSync('dist/client/index.html', 'utf8');
const matches = [...html.matchAll(/rel=\"alternate\"[^>]+href=\"([^\"]+)\"/g)];
matches.forEach(m => console.log(m[1]));
"
```

Expected output (order may vary):

```
https://msfjarvis.dev/rss.xml
https://msfjarvis.dev/atom.xml
https://msfjarvis.dev/feed.json
https://msfjarvis.dev/notes/rss.xml
https://msfjarvis.dev/notes/atom.xml
https://msfjarvis.dev/notes/feed.json
https://msfjarvis.dev/weeknotes/rss.xml
https://msfjarvis.dev/weeknotes/atom.xml
https://msfjarvis.dev/weeknotes/feed.json
```

- [ ] **Step 5: Verify other pages are unaffected — check notes index still has 6 feed links**

```bash
node -e "
const html = require('fs').readFileSync('dist/client/notes/index.html', 'utf8');
const matches = [...html.matchAll(/rel=\"alternate\"/g)];
console.log(matches.length + ' alternate links');
"
```

Expected: `6 alternate links` (3 global hardcoded + 3 notes section — same as before this change).
